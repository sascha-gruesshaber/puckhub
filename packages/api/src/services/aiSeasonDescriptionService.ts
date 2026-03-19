import type { PrismaClient } from "@puckhub/db"
import OpenAI from "openai"

// ─── OpenRouter Client ──────────────────────────────────────────────────────

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey })
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite-preview"
}

// ─── Prompt Construction ─────────────────────────────────────────────────────

function buildSystemPrompt(locale: string): string {
  const lang = locale.startsWith("de") ? "German" : "English"

  return `You are an SEO specialist for an amateur ice hockey league website.

Rules:
- Write in ${lang}
- Generate a concise SEO meta description (max 155 characters, plain text)
- Summarize the season structure: divisions, teams, round types
- Do NOT invent game results, scores, or player names
- Return valid JSON with exactly one field: "seoDescription"
- Do NOT wrap the JSON in markdown code blocks`
}

interface SeasonStructureData {
  seasonName: string
  seasonStart: string
  seasonEnd: string
  leagueName: string
  divisions: Array<{
    name: string
    teams: Array<{ name: string; shortName: string }>
    rounds: Array<{ name: string; roundType: string; gameCount: number }>
  }>
}

function buildUserPrompt(data: SeasonStructureData): string {
  const lines: string[] = [
    `League: ${data.leagueName}`,
    `Season: ${data.seasonName} (${data.seasonStart} – ${data.seasonEnd})`,
    "",
  ]

  for (const div of data.divisions) {
    lines.push(`Division: ${div.name}`)
    lines.push(`  Teams (${div.teams.length}): ${div.teams.map((t) => t.name).join(", ")}`)
    if (div.rounds.length > 0) {
      lines.push("  Rounds:")
      for (const round of div.rounds) {
        lines.push(`    - ${round.name} (${round.roundType}, ${round.gameCount} games)`)
      }
    }
    lines.push("")
  }

  return lines.join("\n")
}

// ─── Generate and Persist SEO Description ───────────────────────────────────

export async function generateSeasonSeo(
  db: PrismaClient,
  seasonId: string,
  organizationId: string,
): Promise<void> {
  try {
    // Fetch season with structure
    const season = await db.season.findUnique({
      where: { id: seasonId },
      include: {
        divisions: {
          orderBy: { sortOrder: "asc" },
          include: {
            rounds: {
              orderBy: { sortOrder: "asc" },
              include: { _count: { select: { games: true } } },
            },
            teamDivisions: {
              include: { team: { select: { name: true, shortName: true } } },
            },
          },
        },
      },
    })

    if (!season || season.divisions.length === 0) return

    // Get league name and locale from system settings
    const settings = await db.systemSettings.findFirst({
      where: { organizationId },
      select: { leagueName: true, locale: true },
    })
    const locale = settings?.locale ?? "de-DE"
    const leagueName = settings?.leagueName ?? "League"

    const structureData: SeasonStructureData = {
      seasonName: season.name,
      seasonStart: season.seasonStart.toISOString().slice(0, 10),
      seasonEnd: season.seasonEnd.toISOString().slice(0, 10),
      leagueName,
      divisions: season.divisions.map((div) => ({
        name: div.name,
        teams: div.teamDivisions.map((td) => ({
          name: td.team.name,
          shortName: td.team.shortName,
        })),
        rounds: div.rounds.map((r) => ({
          name: r.name,
          roundType: r.roundType,
          gameCount: r._count.games,
        })),
      })),
    }

    // Call OpenRouter
    const client = getClient()
    const model = getModel()

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(locale) },
        { role: "user", content: buildUserPrompt(structureData) },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("Empty response from AI")

    // Parse JSON response
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()
    const parsed = JSON.parse(cleaned) as { seoDescription: string }

    // Log token usage
    const usage = response.usage
    if (usage) {
      await db.aiUsageLog.create({
        data: {
          organizationId,
          feature: "seo_season",
          model,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
          seasonId,
        },
      })
    }

    // Persist SEO description
    await db.season.update({
      where: { id: seasonId },
      data: {
        aiDescriptionShort: parsed.seoDescription.slice(0, 160),
      },
    })
  } catch (error) {
    console.error("[ai-season-seo] Generation failed:", error)
  }
}
