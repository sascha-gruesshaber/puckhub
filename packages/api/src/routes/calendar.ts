import { db } from "@puckhub/db"
import * as schema from "@puckhub/db/schema"
import { and, desc, eq, gte, inArray, isNotNull, lte, or } from "drizzle-orm"
import type { Context } from "hono"
import { z } from "zod"
import { generateICS } from "../services/calendarService"

/**
 * Query params schema for calendar export.
 */
const querySchema = z.object({
  teamId: z.string().uuid().optional(),
  seasonId: z.string().uuid().optional(),
})

/**
 * Resolves the current season based on date range.
 * Returns the season where today falls within seasonStart and seasonEnd,
 * or the most recent past season if none match.
 */
async function resolveCurrentSeason() {
  const now = new Date()

  // Try to find a season that contains today
  const inRange = await db.query.seasons.findFirst({
    where: and(lte(schema.seasons.seasonStart, now), gte(schema.seasons.seasonEnd, now)),
    orderBy: [desc(schema.seasons.seasonStart)],
  })
  if (inRange) return inRange

  // Fallback to most recent past season
  const latestPast = await db.query.seasons.findFirst({
    where: lte(schema.seasons.seasonEnd, now),
    orderBy: [desc(schema.seasons.seasonEnd)],
  })
  if (latestPast) return latestPast

  // Fallback to next upcoming season
  return db.query.seasons.findFirst({
    orderBy: [desc(schema.seasons.seasonStart)],
  })
}

/**
 * HTTP GET handler for /api/calendar/export.ics
 *
 * Query parameters:
 * - teamId (optional): Filter to games where this team is home or away
 * - seasonId (optional): Filter to specific season (defaults to current season)
 *
 * Returns:
 * - RFC 5545 compliant ICS file
 * - Only includes games with status 'scheduled' or 'in_progress'
 * - Only includes games that have a scheduledAt timestamp
 */
export async function handleCalendarExport(c: Context) {
  try {
    // Parse and validate query params
    const rawParams = c.req.query()
    const parseResult = querySchema.safeParse(rawParams)

    if (!parseResult.success) {
      return c.text("Invalid query parameters", 400)
    }

    const { teamId, seasonId: explicitSeasonId } = parseResult.data

    // Resolve season ID (use explicit or current)
    let seasonId = explicitSeasonId
    if (!seasonId) {
      const currentSeason = await resolveCurrentSeason()
      if (!currentSeason) {
        // No seasons exist - return empty calendar
        const emptyICS = generateICS([], { title: "PuckHub Spielplan (Keine Saison gefunden)" })
        return c.text(emptyICS, 200, {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'inline; filename="puckhub-calendar.ics"',
          "Cache-Control": "public, max-age=3600",
          "X-Published-TTL": "PT1H",
        })
      }
      seasonId = currentSeason.id
    }

    // Query divisions for the season
    const divisions = await db.query.divisions.findMany({
      where: eq(schema.divisions.seasonId, seasonId),
    })

    const divisionIds = divisions.map((d) => d.id)
    if (divisionIds.length === 0) {
      // No divisions in season - return empty calendar
      const emptyICS = generateICS([], { title: "PuckHub Spielplan" })
      return c.text(emptyICS, 200, {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="puckhub-calendar.ics"',
        "Cache-Control": "public, max-age=3600",
        "X-Published-TTL": "PT1H",
      })
    }

    // Query rounds for these divisions
    const rounds = await db.query.rounds.findMany({
      where: inArray(schema.rounds.divisionId, divisionIds),
    })

    const roundIds = rounds.map((r) => r.id)
    if (roundIds.length === 0) {
      // No rounds - return empty calendar
      const emptyICS = generateICS([], { title: "PuckHub Spielplan" })
      return c.text(emptyICS, 200, {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="puckhub-calendar.ics"',
        "Cache-Control": "public, max-age=3600",
        "X-Published-TTL": "PT1H",
      })
    }

    // Build filter conditions
    const conditions = [
      // Only games in these rounds
      inArray(schema.games.roundId, roundIds),
      // Only scheduled or in-progress games
      or(eq(schema.games.status, "scheduled"), eq(schema.games.status, "in_progress")),
      // Only games with a scheduled time
      isNotNull(schema.games.scheduledAt),
    ]

    // Add team filter if provided
    if (teamId) {
      conditions.push(or(eq(schema.games.homeTeamId, teamId), eq(schema.games.awayTeamId, teamId)))
    }

    // Query league name from system settings
    const settings = await db.query.systemSettings.findFirst()
    const leagueName = settings?.leagueShortName || settings?.leagueName || "PuckHub"

    // Query games with all required relations
    const games = await db.query.games.findMany({
      where: and(...conditions),
      with: {
        round: {
          with: {
            division: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
        venue: true,
      },
      orderBy: (game, { asc }) => [asc(game.scheduledAt), asc(game.gameNumber)],
    })

    // Generate ICS content
    const icsContent = generateICS(games, {
      title: teamId ? `${leagueName} Spielplan (Team)` : `${leagueName} Spielplan`,
      timezone: "Europe/Berlin",
      leagueName,
    })

    // Return with proper headers
    return c.text(icsContent, 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="puckhub-calendar.ics"',
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      "X-Published-TTL": "PT1H", // Suggest calendar apps refresh hourly
    })
  } catch (error) {
    console.error("Calendar export error:", error)
    return c.text("Internal server error", 500)
  }
}
