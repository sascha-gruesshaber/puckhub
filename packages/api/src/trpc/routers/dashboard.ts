import * as schema from "@puckhub/db/schema"
import { and, desc, eq, gt, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, router } from "../init"

export const dashboardRouter = router({
  getOverview: orgAdminProcedure.input(z.object({ seasonId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { seasonId } = input
    const db = ctx.db

    // Get all divisions for this season
    const seasonDivisions = await db
      .select({ id: schema.divisions.id })
      .from(schema.divisions)
      .where(and(eq(schema.divisions.seasonId, seasonId), eq(schema.divisions.organizationId, ctx.organizationId)))
    const divisionIds = seasonDivisions.map((d) => d.id)

    // Get all rounds for this season
    const seasonRounds =
      divisionIds.length > 0
        ? await db
            .select({ id: schema.rounds.id })
            .from(schema.rounds)
            .where(inArray(schema.rounds.divisionId, divisionIds))
        : []
    const roundIds = seasonRounds.map((r) => r.id)

    // --- Counts ---

    // Teams: distinct teams assigned to divisions in this season
    const teamCountResult =
      divisionIds.length > 0
        ? await db
            .select({ count: sql<number>`count(distinct ${schema.teamDivisions.teamId})` })
            .from(schema.teamDivisions)
            .where(inArray(schema.teamDivisions.divisionId, divisionIds))
        : [{ count: 0 }]
    const teamsCount = Number(teamCountResult[0]?.count ?? 0)

    // Players: distinct players with contracts active during this season
    // A contract is active if: start season begins <= working season end
    //   AND (end season is null OR end season ends >= working season start)
    // Avoid raw SQL with Date params — use season ID sets instead
    const season = await db.query.seasons.findFirst({
      where: eq(schema.seasons.id, seasonId),
      columns: { seasonStart: true, seasonEnd: true },
    })

    let playersCount = 0
    if (season) {
      // Seasons that started at or before the working season ends (valid contract start seasons)
      const validStartSeasons = await db
        .select({ id: schema.seasons.id })
        .from(schema.seasons)
        .where(lt(schema.seasons.seasonStart, season.seasonEnd))
      const validStartIds = validStartSeasons.map((s) => s.id)

      // Seasons that end at or after the working season starts (valid contract end seasons)
      const validEndSeasons = await db
        .select({ id: schema.seasons.id })
        .from(schema.seasons)
        .where(gt(schema.seasons.seasonEnd, season.seasonStart))
      const validEndIds = validEndSeasons.map((s) => s.id)

      if (validStartIds.length > 0) {
        const endCondition =
          validEndIds.length > 0
            ? or(isNull(schema.contracts.endSeasonId), inArray(schema.contracts.endSeasonId, validEndIds))
            : isNull(schema.contracts.endSeasonId)

        const playerCountResult = await db
          .select({ count: sql<number>`count(distinct ${schema.contracts.playerId})` })
          .from(schema.contracts)
          .where(and(inArray(schema.contracts.startSeasonId, validStartIds), endCondition))
        playersCount = Number(playerCountResult[0]?.count ?? 0)
      }
    }

    // Games: completed vs remaining
    let completedCount = 0
    let remainingCount = 0
    if (roundIds.length > 0) {
      const gameCountResults = await db
        .select({
          status: schema.games.status,
          count: sql<number>`count(*)`,
        })
        .from(schema.games)
        .where(inArray(schema.games.roundId, roundIds))
        .groupBy(schema.games.status)

      for (const row of gameCountResults) {
        if (row.status === "completed") {
          completedCount = Number(row.count)
        } else if (["scheduled", "in_progress", "postponed"].includes(row.status)) {
          remainingCount += Number(row.count)
        }
      }
    }

    // --- Missing Reports ---
    // Completed games with no game_lineups entries
    let missingReports: Array<{
      id: string
      scheduledAt: Date | null
      homeTeam: { id: string; shortName: string; logoUrl: string | null }
      awayTeam: { id: string; shortName: string; logoUrl: string | null }
    }> = []
    if (roundIds.length > 0) {
      const gamesWithLineups = db.select({ gameId: schema.gameLineups.gameId }).from(schema.gameLineups)

      const missing = await db.query.games.findMany({
        where: and(
          inArray(schema.games.roundId, roundIds),
          eq(schema.games.status, "completed"),
          notInArray(schema.games.id, gamesWithLineups),
        ),
        columns: { id: true, scheduledAt: true },
        with: {
          homeTeam: { columns: { id: true, shortName: true, logoUrl: true } },
          awayTeam: { columns: { id: true, shortName: true, logoUrl: true } },
        },
        orderBy: (g, { desc: d }) => [d(g.scheduledAt)],
        limit: 10,
      })
      missingReports = missing
    }

    // --- Upcoming Games ---
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    let upcomingGames: Array<{
      id: string
      scheduledAt: Date | null
      homeTeam: { id: string; shortName: string; logoUrl: string | null }
      awayTeam: { id: string; shortName: string; logoUrl: string | null }
      venue: { id: string; name: string } | null
    }> = []
    if (roundIds.length > 0) {
      upcomingGames = await db.query.games.findMany({
        where: and(
          inArray(schema.games.roundId, roundIds),
          eq(schema.games.status, "scheduled"),
          gt(schema.games.scheduledAt, now),
          lt(schema.games.scheduledAt, in7Days),
        ),
        columns: { id: true, scheduledAt: true },
        with: {
          homeTeam: { columns: { id: true, shortName: true, logoUrl: true } },
          awayTeam: { columns: { id: true, shortName: true, logoUrl: true } },
          venue: { columns: { id: true, name: true } },
        },
        orderBy: (g, { asc }) => [asc(g.scheduledAt)],
        limit: 5,
      })
    }

    // --- Active Suspensions ---
    const activeSuspensions = await db.query.gameSuspensions.findMany({
      where: and(
        sql`${schema.gameSuspensions.servedGames} < ${schema.gameSuspensions.suspendedGames}`,
        eq(schema.gameSuspensions.organizationId, ctx.organizationId),
      ),
      with: {
        player: { columns: { id: true, firstName: true, lastName: true } },
        team: { columns: { id: true, shortName: true, logoUrl: true } },
      },
      limit: 10,
    })

    // --- Top Scorers ---
    const topScorers = await db.query.playerSeasonStats.findMany({
      where: and(eq(schema.playerSeasonStats.seasonId, seasonId), eq(schema.playerSeasonStats.organizationId, ctx.organizationId)),
      with: {
        player: { columns: { id: true, firstName: true, lastName: true } },
        team: { columns: { id: true, shortName: true, logoUrl: true } },
      },
      orderBy: [
        desc(schema.playerSeasonStats.totalPoints),
        desc(schema.playerSeasonStats.goals),
        desc(schema.playerSeasonStats.assists),
      ],
      limit: 5,
    })

    // --- Top Penalized ---
    const topPenalized = await db.query.playerSeasonStats.findMany({
      where: and(eq(schema.playerSeasonStats.seasonId, seasonId), eq(schema.playerSeasonStats.organizationId, ctx.organizationId), gt(schema.playerSeasonStats.penaltyMinutes, 0)),
      with: {
        player: { columns: { id: true, firstName: true, lastName: true } },
        team: { columns: { id: true, shortName: true, logoUrl: true } },
      },
      orderBy: [desc(schema.playerSeasonStats.penaltyMinutes)],
      limit: 5,
    })

    // --- Recent Results ---
    let recentResults: Array<{
      id: string
      scheduledAt: Date | null
      homeScore: number | null
      awayScore: number | null
      homeTeam: { id: string; shortName: string; logoUrl: string | null }
      awayTeam: { id: string; shortName: string; logoUrl: string | null }
    }> = []
    if (roundIds.length > 0) {
      recentResults = await db.query.games.findMany({
        where: and(inArray(schema.games.roundId, roundIds), eq(schema.games.status, "completed")),
        columns: { id: true, scheduledAt: true, homeScore: true, awayScore: true },
        with: {
          homeTeam: { columns: { id: true, shortName: true, logoUrl: true } },
          awayTeam: { columns: { id: true, shortName: true, logoUrl: true } },
        },
        orderBy: (g, { desc: d }) => [d(g.scheduledAt)],
        limit: 5,
      })
    }

    return {
      counts: {
        teams: teamsCount,
        players: playersCount,
        completed: completedCount,
        remaining: remainingCount,
      },
      missingReports,
      upcomingGames,
      activeSuspensions,
      topScorers,
      topPenalized,
      recentResults,
    }
  }),
})
