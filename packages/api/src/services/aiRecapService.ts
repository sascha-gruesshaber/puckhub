import type { PrismaClient } from "@puckhub/db"
import OpenAI from "openai"
import { getOrgPlan } from "./planLimits"

// ─── OpenRouter Client ──────────────────────────────────────────────────────

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey })
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite-preview"
}

function isAiDisabledForTests(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true"
}

// ─── Token Budget ───────────────────────────────────────────────────────────

export async function getMonthlyTokenUsage(db: PrismaClient, organizationId: string): Promise<number> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const result = await db.aiUsageLog.aggregate({
    where: {
      organizationId,
      createdAt: { gte: firstOfMonth },
    },
    _sum: { totalTokens: true },
  })

  return result._sum.totalTokens ?? 0
}

export async function checkTokenBudget(
  db: PrismaClient,
  organizationId: string,
  limit: number | null,
): Promise<{ withinBudget: boolean; used: number; limit: number | null }> {
  const used = await getMonthlyTokenUsage(db, organizationId)
  if (limit === null) return { withinBudget: true, used, limit }
  return { withinBudget: used < limit, used, limit }
}

// ─── Eligibility Check (4-layer guard) ──────────────────────────────────────

export async function checkAiEligibility(
  db: PrismaClient,
  organizationId: string,
): Promise<{ eligible: boolean; reason?: string }> {
  if (isAiDisabledForTests()) {
    return { eligible: false, reason: "disabled_in_tests" }
  }

  // 1. Not demo org
  if (organizationId === "demo-league") {
    return { eligible: false, reason: "demo_org" }
  }

  // 2. Organization has AI enabled
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { aiEnabled: true },
  })
  if (!org?.aiEnabled) {
    return { eligible: false, reason: "ai_disabled" }
  }

  // 3. Plan has featureAi
  const plan = await getOrgPlan(db, organizationId)
  if (plan && !plan.featureAi) {
    return { eligible: false, reason: "feature_unavailable" }
  }

  // 4. Token budget not exceeded
  const tokenLimit = plan?.aiMonthlyTokenLimit ?? null
  const budget = await checkTokenBudget(db, organizationId, tokenLimit as number | null)
  if (!budget.withinBudget) {
    return { eligible: false, reason: "budget_exceeded" }
  }

  return { eligible: true }
}

// ─── Prompt Construction ────────────────────────────────────────────────────

function buildSystemPrompt(locale: string, hasEvents: boolean): string {
  const lang = locale.startsWith("de") ? "German" : "English"

  if (!hasEvents) {
    return `You are a hockey journalist writing a brief game summary for an amateur ice hockey league.
You only have the final score — no goal scorers, no assists, no penalty details.

Rules:
- Write in ${lang}
- Write 1-2 short sentences summarizing the result (who won, final score, margin)
- Do NOT invent or guess any player names, goal times, or game events
- Do NOT describe how goals were scored or by whom
- Keep it purely factual based on the score
- Use <p> tags for the text
- Return valid JSON with exactly two fields: "title" and "content"
- Do NOT wrap the JSON in markdown code blocks`
  }

  const periodLabel = locale.startsWith("de") ? "Drittel" : "Period"
  const otLabel = locale.startsWith("de") ? "Verlängerung" : "Overtime"
  return `You are a hockey journalist writing game recaps for an amateur ice hockey league.
Write engaging, professional game recaps that capture the key moments.

Rules:
- Write in ${lang}
- Keep the tone enthusiastic but factual
- Highlight key goals, assists, and penalties
- Mention the final score and any notable performances
- Keep it concise (200-400 words)
- Structure the recap by period:
  1. Opening paragraph: matchup, final score, overall narrative
  2. One section per period that had events (1. ${periodLabel}, 2. ${periodLabel}, 3. ${periodLabel})
  3. If overtime or shootout events exist, add a separate "${otLabel}" section
  4. Closing paragraph: summary, standout players, outlook
- Use <h3> tags for period headings (e.g. <h3>1. ${periodLabel}</h3>)
- Use <p> tags for paragraphs within each section and <strong> for emphasis
- Only include sections for periods that actually had goals or notable penalties — skip empty periods
- Return valid JSON with exactly two fields: "title" and "content"
- Do NOT wrap the JSON in markdown code blocks`
}

interface GameDataForPrompt {
  homeTeam: { name: string; shortName: string }
  awayTeam: { name: string; shortName: string }
  homeScore: number
  awayScore: number
  scheduledAt: string | null
  location: string | null
  notes: string | null
  eventNotes: string[]
  goals: Array<{
    period: number
    time: string
    team: string
    scorer: string
    assists: string[]
  }>
  penalties: Array<{
    period: number
    time: string
    team: string
    player: string
    minutes: number | null
    type: string | null
  }>
  homeLineup: string[]
  awayLineup: string[]
}

function buildUserPrompt(data: GameDataForPrompt): string {
  const lines: string[] = [
    `Game: ${data.homeTeam.name} vs ${data.awayTeam.name}`,
    `Final Score: ${data.homeScore} - ${data.awayScore}`,
  ]

  if (data.scheduledAt) lines.push(`Date: ${data.scheduledAt}`)
  if (data.location) lines.push(`Venue: ${data.location}`)

  // Group events by period for structured output
  const allEvents = [
    ...data.goals.map((g) => ({ ...g, eventType: "goal" as const })),
    ...data.penalties.map((p) => ({ ...p, eventType: "penalty" as const })),
  ].sort((a, b) => a.period - b.period || a.time.localeCompare(b.time))

  const periods = new Map<number, typeof allEvents>()
  for (const event of allEvents) {
    if (!periods.has(event.period)) periods.set(event.period, [])
    periods.get(event.period)!.push(event)
  }

  for (const [period, events] of [...periods.entries()].sort((a, b) => a[0] - b[0])) {
    const periodLabel = period <= 3 ? `${period}. Period` : period === 4 ? "Overtime" : `Period ${period}`
    lines.push("", `--- ${periodLabel} ---`)
    for (const e of events) {
      if (e.eventType === "goal") {
        const g = e as (typeof data.goals)[0] & { eventType: "goal" }
        const assists = g.assists.length > 0 ? ` (${g.assists.join(", ")})` : ""
        lines.push(`  GOAL ${g.time} - ${g.scorer}${assists} [${g.team}]`)
      } else {
        const p = e as (typeof data.penalties)[0] & { eventType: "penalty" }
        const mins = p.minutes ? `${p.minutes}min` : ""
        const type = p.type ? ` ${p.type}` : ""
        lines.push(`  PENALTY ${p.time} - ${p.player} [${p.team}] ${mins}${type}`)
      }
    }
  }

  if (data.notes) {
    lines.push("", `Reporter Notes: ${data.notes}`)
  }

  if (data.eventNotes.length > 0) {
    lines.push("", "Game Notes:")
    for (const note of data.eventNotes) {
      lines.push(`  - ${note}`)
    }
  }

  if (data.homeLineup.length > 0) {
    lines.push("", `${data.homeTeam.name} Lineup: ${data.homeLineup.join(", ")}`)
  }
  if (data.awayLineup.length > 0) {
    lines.push("", `${data.awayTeam.name} Lineup: ${data.awayLineup.join(", ")}`)
  }

  return lines.join("\n")
}

// ─── Generate and Persist ───────────────────────────────────────────────────

export async function generateAndPersistRecap(db: PrismaClient, gameId: string, organizationId: string): Promise<void> {
  // Optimistic lock: only one concurrent request succeeds
  const lockResult = await db.game.updateMany({
    where: {
      id: gameId,
      organizationId,
      recapGenerating: false,
      recapGeneratedAt: null,
    },
    data: { recapGenerating: true },
  })

  if (lockResult.count === 0) return // another request is already generating

  try {
    // Fetch game data
    const game = await db.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: { select: { name: true, shortName: true } },
        awayTeam: { select: { name: true, shortName: true } },
        events: {
          orderBy: [{ period: "asc" }, { timeMinutes: "asc" }, { timeSeconds: "asc" }],
          include: {
            team: { select: { shortName: true } },
            scorer: { select: { firstName: true, lastName: true } },
            assist1: { select: { firstName: true, lastName: true } },
            assist2: { select: { firstName: true, lastName: true } },
            penaltyPlayer: { select: { firstName: true, lastName: true } },
            penaltyType: { select: { name: true } },
          },
        },
        lineups: {
          include: {
            player: { select: { firstName: true, lastName: true } },
            team: { select: { id: true } },
          },
        },
      },
    })

    if (!game) {
      await db.game.updateMany({ where: { id: gameId }, data: { recapGenerating: false } })
      return
    }

    // Get locale from system settings
    const settings = await db.systemSettings.findFirst({
      where: { organizationId },
      select: { locale: true },
    })
    const locale = settings?.locale ?? "de-DE"

    // Build prompt data — only goal/penalty events have period & team guaranteed non-null
    const goals = game.events
      .filter((e) => e.eventType === "goal" && e.period != null && e.team != null)
      .map((e) => ({
        period: e.period!,
        time: `${String(e.timeMinutes).padStart(2, "0")}:${String(e.timeSeconds).padStart(2, "0")}`,
        team: e.team!.shortName,
        scorer: e.scorer ? `${e.scorer.firstName} ${e.scorer.lastName}` : "Unknown",
        assists: [e.assist1, e.assist2].filter(Boolean).map((a) => `${a!.firstName} ${a!.lastName}`),
      }))

    const penalties = game.events
      .filter((e) => e.eventType === "penalty" && e.period != null && e.team != null)
      .map((e) => ({
        period: e.period!,
        time: `${String(e.timeMinutes).padStart(2, "0")}:${String(e.timeSeconds).padStart(2, "0")}`,
        team: e.team!.shortName,
        player: e.penaltyPlayer ? `${e.penaltyPlayer.firstName} ${e.penaltyPlayer.lastName}` : "Unknown",
        minutes: e.penaltyMinutes,
        type: e.penaltyType?.name ?? null,
      }))

    const eventNotes = game.events
      .filter((e) => e.eventType === "note" && e.notePublic && e.noteText)
      .map((e) => e.noteText!)

    const gameData: GameDataForPrompt = {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore ?? 0,
      awayScore: game.awayScore ?? 0,
      scheduledAt: game.scheduledAt?.toISOString() ?? null,
      location: game.location,
      notes: game.notes,
      eventNotes,
      goals,
      penalties,
      homeLineup: game.lineups
        .filter((l) => l.team.id === game.homeTeamId)
        .map((l) => `${l.player.firstName} ${l.player.lastName}`),
      awayLineup: game.lineups
        .filter((l) => l.team.id === game.awayTeamId)
        .map((l) => `${l.player.firstName} ${l.player.lastName}`),
    }

    // Call OpenRouter
    const client = getClient()
    const model = getModel()

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(locale, goals.length > 0) },
        { role: "user", content: buildUserPrompt(gameData) },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("Empty response from AI")

    // Parse JSON response
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()
    const parsed = JSON.parse(cleaned) as { title: string; content: string }

    // Log token usage
    const usage = response.usage
    if (usage) {
      await db.aiUsageLog.create({
        data: {
          organizationId,
          feature: "game_recap",
          model,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
          gameId,
        },
      })
    }

    // Persist recap
    await db.game.update({
      where: { id: gameId },
      data: {
        recapTitle: parsed.title,
        recapContent: parsed.content,
        recapGeneratedAt: new Date(),
        recapGenerating: false,
      },
    })
  } catch (error) {
    console.error("[ai-recap] Generation failed:", error)
    // Reset lock so it can be retried
    await db.game.updateMany({
      where: { id: gameId },
      data: { recapGenerating: false },
    })
  }
}
