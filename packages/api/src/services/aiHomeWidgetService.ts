import type { PrismaClient } from "@puckhub/db"
import { type AiHomeWidgetType } from "@puckhub/db"
import OpenAI from "openai"
import { checkAiEligibility } from "./aiRecapService"
import { createHash } from "crypto"

// ─── OpenRouter Client ──────────────────────────────────────────────────────

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey })
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite-preview"
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeagueContext {
  leagueName: string
  locale: string
  rounds: Array<{
    name: string
    roundType: string
    divisionName: string
  }>
  completedGames: Array<{
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    scheduledAt: string | null
    roundName: string
    goals: Array<{ scorer: string; assists: string[]; team: string }>
  }>
  upcomingGames: Array<{
    homeTeam: string
    awayTeam: string
    scheduledAt: string | null
  }>
  standings: Array<{
    team: string
    gamesPlayed: number
    wins: number
    draws: number
    losses: number
    points: number
    goalDifference: number
  }>
  teamForm: Map<string, string[]>
  topScorers: Array<{
    player: string
    team: string
    goals: number
    assists: number
    points: number
  }>
}

const WIDGET_FEATURE_NAMES: Record<AiHomeWidgetType, string> = {
  league_pulse_digest: "home_widget_league_pulse",
  headlines_ticker: "home_widget_headlines_ticker",
}

// ─── Data Gathering ─────────────────────────────────────────────────────────

async function gatherLeagueContext(
  db: PrismaClient,
  organizationId: string,
  seasonId: string,
): Promise<LeagueContext> {
  const settings = await db.systemSettings.findFirst({
    where: { organizationId },
    select: { leagueName: true, locale: true },
  })

  const [completedGames, upcomingGames, divisions, topScorers] = await Promise.all([
    // Last 15 completed games with scores + events + round info
    db.game.findMany({
      where: {
        organizationId,
        status: "completed",
        round: { division: { seasonId } },
      },
      orderBy: { finalizedAt: "desc" },
      take: 15,
      include: {
        homeTeam: { select: { name: true, shortName: true } },
        awayTeam: { select: { name: true, shortName: true } },
        round: { select: { name: true, roundType: true, division: { select: { name: true } } } },
        events: {
          where: { eventType: "goal" },
          include: {
            scorer: { select: { firstName: true, lastName: true } },
            assist1: { select: { firstName: true, lastName: true } },
            assist2: { select: { firstName: true, lastName: true } },
            team: { select: { shortName: true } },
          },
        },
      },
    }),

    // Next 10 scheduled games
    db.game.findMany({
      where: {
        organizationId,
        status: "scheduled",
        scheduledAt: { gte: new Date() },
        round: { division: { seasonId } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      include: {
        homeTeam: { select: { name: true, shortName: true } },
        awayTeam: { select: { name: true, shortName: true } },
      },
    }),

    // All divisions + rounds for this season (gives structural context)
    db.division.findMany({
      where: { seasonId, organizationId },
      orderBy: { sortOrder: "asc" },
      include: {
        rounds: {
          orderBy: { sortOrder: "asc" },
          include: {
            standings: {
              orderBy: [{ totalPoints: "desc" }, { goalDifference: "desc" }],
              include: { team: { select: { name: true, shortName: true } } },
            },
          },
        },
      },
    }),

    // Top 5 scorers
    db.playerSeasonStat.findMany({
      where: { seasonId, organizationId },
      orderBy: [{ totalPoints: "desc" }, { goals: "desc" }],
      take: 5,
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { shortName: true } },
      },
    }),
  ])

  // Extract standings from first regular round of first division
  const firstDiv = divisions[0]
  const firstRegularRound = firstDiv?.rounds.find((r) => r.roundType === "regular")
  const standings = (firstRegularRound?.standings ?? []).map((s) => ({
    team: s.team.shortName,
    gamesPlayed: s.gamesPlayed,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    points: s.totalPoints,
    goalDifference: s.goalDifference,
  }))

  // Flatten round info for context
  const rounds = divisions.flatMap((d) =>
    d.rounds.map((r) => ({
      name: r.name,
      roundType: r.roundType,
      divisionName: d.name,
    })),
  )

  // Build team form from completed games
  const teamForm = new Map<string, string[]>()
  for (const game of completedGames) {
    const hs = game.homeScore ?? 0
    const as_ = game.awayScore ?? 0
    const homeName = game.homeTeam.shortName
    const awayName = game.awayTeam.shortName

    if (!teamForm.has(homeName)) teamForm.set(homeName, [])
    const hf = teamForm.get(homeName)!
    if (hf.length < 5) hf.push(hs > as_ ? "W" : hs < as_ ? "L" : "D")

    if (!teamForm.has(awayName)) teamForm.set(awayName, [])
    const af = teamForm.get(awayName)!
    if (af.length < 5) af.push(as_ > hs ? "W" : as_ < hs ? "L" : "D")
  }

  return {
    leagueName: settings?.leagueName ?? "League",
    locale: settings?.locale ?? "de-DE",
    rounds,
    completedGames: completedGames.map((g) => ({
      homeTeam: g.homeTeam.shortName,
      awayTeam: g.awayTeam.shortName,
      homeScore: g.homeScore ?? 0,
      awayScore: g.awayScore ?? 0,
      scheduledAt: g.scheduledAt?.toISOString() ?? null,
      roundName: g.round.name,
      goals: g.events.map((e) => ({
        scorer: e.scorer ? `${e.scorer.firstName} ${e.scorer.lastName}` : "Unknown",
        assists: [e.assist1, e.assist2]
          .filter(Boolean)
          .map((a) => `${a!.firstName} ${a!.lastName}`),
        team: e.team?.shortName ?? "",
      })),
    })),
    upcomingGames: upcomingGames.map((g) => ({
      homeTeam: g.homeTeam.shortName,
      awayTeam: g.awayTeam.shortName,
      scheduledAt: g.scheduledAt?.toISOString() ?? null,
    })),
    standings,
    teamForm,
    topScorers: topScorers.map((s) => ({
      player: `${s.player.firstName} ${s.player.lastName}`,
      team: s.team.shortName,
      goals: s.goals,
      assists: s.assists,
      points: s.totalPoints,
    })),
  }
}

// ─── Compute data hash for staleness detection ──────────────────────────────

function computeDataHash(ctx: LeagueContext): string {
  const key = [
    ctx.completedGames.length,
    ctx.completedGames[0]?.homeTeam ?? "",
    ctx.upcomingGames.length,
    ctx.standings.map((s) => `${s.team}:${s.points}`).join(","),
  ].join("|")
  return createHash("md5").update(key).digest("hex").slice(0, 16)
}

// ─── Context Block for Prompts ──────────────────────────────────────────────

function buildContextBlock(ctx: LeagueContext): string {
  const lines: string[] = [`League: ${ctx.leagueName}`]

  if (ctx.rounds.length > 0) {
    lines.push("\nSeason Structure (Divisions & Rounds):")
    for (const r of ctx.rounds) {
      lines.push(`  ${r.divisionName} > ${r.name} (${r.roundType})`)
    }
  }

  if (ctx.standings.length > 0) {
    lines.push("\nStandings:")
    for (const s of ctx.standings) {
      lines.push(`  ${s.team}: ${s.points}pts (${s.wins}W ${s.draws}D ${s.losses}L, GD ${s.goalDifference > 0 ? "+" : ""}${s.goalDifference})`)
    }
  }

  if (ctx.completedGames.length > 0) {
    lines.push("\nRecent Results:")
    for (const g of ctx.completedGames.slice(0, 10)) {
      lines.push(`  ${g.homeTeam} ${g.homeScore}-${g.awayScore} ${g.awayTeam} [${g.roundName}]`)
    }
  }

  if (ctx.upcomingGames.length > 0) {
    lines.push("\nUpcoming Games:")
    for (const g of ctx.upcomingGames.slice(0, 8)) {
      const date = g.scheduledAt ? new Date(g.scheduledAt).toLocaleDateString() : "TBD"
      lines.push(`  ${g.homeTeam} vs ${g.awayTeam} (${date})`)
    }
  }

  if (ctx.teamForm.size > 0) {
    lines.push("\nTeam Form (last 5):")
    for (const [team, form] of ctx.teamForm) {
      lines.push(`  ${team}: ${form.join("")}`)
    }
  }

  if (ctx.topScorers.length > 0) {
    lines.push("\nTop Scorers:")
    for (const s of ctx.topScorers) {
      lines.push(`  ${s.player} (${s.team}): ${s.goals}G ${s.assists}A = ${s.points}P`)
    }
  }

  return lines.join("\n")
}

// ─── Per-Widget Prompts ─────────────────────────────────────────────────────

function getWidgetPrompt(
  type: AiHomeWidgetType,
  ctx: LeagueContext,
): { system: string; user: string; maxTokens: number } {
  const lang = ctx.locale.startsWith("de") ? "German" : "English"
  const contextBlock = buildContextBlock(ctx)

  const baseRules = `- Write in ${lang}
- Do NOT invent facts or players not in the provided data
- Return valid JSON (no markdown code blocks)
- Keep it engaging but factual`

  switch (type) {
    case "league_pulse_digest":
      return {
        system: `You are a sports journalist writing a brief "What happened?" matchday digest for an amateur ice hockey league website.

You are given standings, recent results (with round names), team form, season structure, and top scorers.

Rules:
${baseRules}
- Write 2-4 short paragraphs in **Markdown** format (use **bold** for team names and player names, use *italics* for emphasis)
- Reference which round/phase games were played in when relevant (e.g. "In the regular season..." or "Playoff action saw...")
- Mention standout performances, surprising results, and current form
- Keep paragraphs separated by blank lines
- Return JSON with one field: "content" (Markdown string, NOT HTML)`,
        user: contextBlock,
        maxTokens: 700,
      }

    case "headlines_ticker":
      return {
        system: `You are a sports copywriter creating punchy one-liner headlines about notable events in an amateur ice hockey league.

Rules:
${baseRules}
- Generate 4-6 short, catchy headlines (each max 80 chars)
- Focus on results, streaks, top performers, surprising outcomes
- Return JSON with one field: "headlines" (string array)`,
        user: contextBlock,
        maxTokens: 400,
      }
  }
}

// ─── Single Widget Generator ────────────────────────────────────────────────

async function generateWidget(
  db: PrismaClient,
  organizationId: string,
  seasonId: string,
  widgetType: AiHomeWidgetType,
  ctx: LeagueContext,
  dataHash: string,
): Promise<void> {
  const prompt = getWidgetPrompt(widgetType, ctx)
  const client = getClient()
  const model = getModel()

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.7,
    max_tokens: prompt.maxTokens,
  })

  const rawContent = response.choices[0]?.message?.content
  if (!rawContent) throw new Error(`Empty response for widget ${widgetType}`)

  const cleaned = rawContent
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim()
  const parsed = JSON.parse(cleaned)

  // Normalize content: headlines_ticker returns array, others return markdown/text
  let content: string
  if (widgetType === "headlines_ticker" && Array.isArray(parsed.headlines)) {
    content = JSON.stringify(parsed.headlines)
  } else {
    content = parsed.content ?? ""
  }

  // Log token usage
  const usage = response.usage
  if (usage) {
    await db.aiUsageLog.create({
      data: {
        organizationId,
        feature: WIDGET_FEATURE_NAMES[widgetType],
        model,
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
        seasonId,
      },
    })
  }

  // Upsert widget
  await db.aiHomeWidget.upsert({
    where: {
      organizationId_seasonId_widgetType: { organizationId, seasonId, widgetType },
    },
    create: {
      organizationId,
      seasonId,
      widgetType,
      content,
      generatedAt: new Date(),
      generating: false,
      dataHash,
    },
    update: {
      content,
      generatedAt: new Date(),
      generating: false,
      dataHash,
    },
  })
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

export async function generateAllEnabledWidgets(
  db: PrismaClient,
  organizationId: string,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  // Check AI eligibility (master switch + plan + budget)
  const eligibility = await checkAiEligibility(db, organizationId)
  if (!eligibility.eligible) {
    console.log(`[ai-widgets] Org ${organizationId} not eligible: ${eligibility.reason}`)
    return
  }

  // Get org toggles
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      aiWidgetLeaguePulse: true,
      aiWidgetHeadlinesTicker: true,
    },
  })
  if (!org) return

  // Determine which widgets are enabled
  const enabledTypes: AiHomeWidgetType[] = []
  if (org.aiWidgetLeaguePulse) enabledTypes.push("league_pulse_digest")
  if (org.aiWidgetHeadlinesTicker) enabledTypes.push("headlines_ticker")

  if (enabledTypes.length === 0) return

  // Resolve current season
  const now = new Date()
  const currentSeason =
    (await db.season.findFirst({
      where: { organizationId, seasonStart: { lte: now }, seasonEnd: { gte: now } },
      orderBy: { seasonStart: "desc" },
    })) ??
    (await db.season.findFirst({
      where: { organizationId },
      orderBy: { seasonStart: "desc" },
    }))

  if (!currentSeason) {
    console.log(`[ai-widgets] Org ${organizationId} has no season`)
    return
  }

  // Gather context once
  const ctx = await gatherLeagueContext(db, organizationId, currentSeason.id)
  const dataHash = computeDataHash(ctx)

  // Generate each enabled widget independently
  for (const widgetType of enabledTypes) {
    try {
      // Check if data has changed since last generation
      const existing = await db.aiHomeWidget.findUnique({
        where: {
          organizationId_seasonId_widgetType: {
            organizationId,
            seasonId: currentSeason.id,
            widgetType,
          },
        },
        select: { dataHash: true },
      })

      if (!force && existing?.dataHash === dataHash) {
        console.log(`[ai-widgets] Widget ${widgetType} for org ${organizationId} is up-to-date, skipping`)
        continue
      }

      console.log(`[ai-widgets] Generating ${widgetType} for org ${organizationId}...`)
      await generateWidget(db, organizationId, currentSeason.id, widgetType, ctx, dataHash)
      console.log(`[ai-widgets] Generated ${widgetType} for org ${organizationId}`)
    } catch (err) {
      console.error(`[ai-widgets] Failed to generate ${widgetType} for org ${organizationId}:`, err)
    }
  }
}
