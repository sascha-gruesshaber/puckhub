import { z } from "zod"
import { orgProcedure, router } from "../init"

export const dashboardRouter = router({
  getOverview: orgProcedure.input(z.object({ seasonId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { seasonId } = input
    const db = ctx.db

    // Get all divisions for this season
    const seasonDivisions = await db.division.findMany({
      where: { seasonId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    const divisionIds = seasonDivisions.map((d: any) => d.id)

    // Get all rounds for this season
    const seasonRounds =
      divisionIds.length > 0
        ? await db.round.findMany({
            where: { divisionId: { in: divisionIds } },
            select: { id: true },
          })
        : []
    const roundIds = seasonRounds.map((r: any) => r.id)

    // --- Counts ---

    // Teams: distinct teams assigned to divisions in this season
    let teamsCount = 0
    if (divisionIds.length > 0) {
      const teamCountResult = await db.teamDivision.findMany({
        where: { divisionId: { in: divisionIds } },
        select: { teamId: true },
        distinct: ["teamId"],
      })
      teamsCount = teamCountResult.length
    }

    // Players: distinct players with contracts active during this season
    const season = await db.season.findUnique({
      where: { id: seasonId },
      select: { seasonStart: true, seasonEnd: true },
    })

    let playersCount = 0
    if (season) {
      // Seasons that started before the working season ends (valid contract start seasons)
      const validStartSeasons = await db.season.findMany({
        where: { seasonStart: { lt: season.seasonEnd } },
        select: { id: true },
      })
      const validStartIds = validStartSeasons.map((s: any) => s.id)

      // Seasons that end after the working season starts (valid contract end seasons)
      const validEndSeasons = await db.season.findMany({
        where: { seasonEnd: { gt: season.seasonStart } },
        select: { id: true },
      })
      const validEndIds = validEndSeasons.map((s: any) => s.id)

      if (validStartIds.length > 0) {
        const endCondition: any =
          validEndIds.length > 0
            ? { OR: [{ endSeasonId: null }, { endSeasonId: { in: validEndIds } }] }
            : { endSeasonId: null }

        const playerCountResult = await db.contract.findMany({
          where: {
            startSeasonId: { in: validStartIds },
            ...endCondition,
          },
          select: { playerId: true },
          distinct: ["playerId"],
        })
        playersCount = playerCountResult.length
      }
    }

    // Games: completed vs remaining
    let completedCount = 0
    let remainingCount = 0
    if (roundIds.length > 0) {
      const gameCountResults = await db.game.groupBy({
        by: ["status"],
        where: { roundId: { in: roundIds } },
        _count: { id: true },
      })

      for (const row of gameCountResults) {
        if (row.status === "completed") {
          completedCount = row._count.id
        } else if (["scheduled", "in_progress", "postponed"].includes(row.status)) {
          remainingCount += row._count.id
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
      // Get game IDs that have lineups
      const gamesWithLineups = await db.gameLineup.findMany({
        select: { gameId: true },
        distinct: ["gameId"],
      })
      const gameIdsWithLineups = gamesWithLineups.map((g: any) => g.gameId)

      const missing = await db.game.findMany({
        where: {
          roundId: { in: roundIds },
          status: "completed",
          id: gameIdsWithLineups.length > 0 ? { notIn: gameIdsWithLineups } : undefined,
        },
        select: {
          id: true,
          scheduledAt: true,
          homeTeam: { select: { id: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, shortName: true, logoUrl: true } },
        },
        orderBy: { scheduledAt: "desc" },
        take: 10,
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
      upcomingGames = await db.game.findMany({
        where: {
          roundId: { in: roundIds },
          status: "scheduled",
          scheduledAt: { gt: now, lt: in7Days },
        },
        select: {
          id: true,
          scheduledAt: true,
          homeTeam: { select: { id: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, shortName: true, logoUrl: true } },
          venue: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      })
    }

    // --- Active Suspensions ---
    const activeSuspensions = (await db.$queryRaw`
      SELECT
        gs.id,
        gs.suspended_games AS "suspendedGames",
        gs.served_games AS "servedGames",
        json_build_object(
          'id', p.id,
          'firstName', p.first_name,
          'lastName', p.last_name
        ) AS "player",
        json_build_object(
          'id', t.id,
          'shortName', t.short_name,
          'logoUrl', t.logo_url
        ) AS "team"
      FROM game_suspensions gs
      JOIN players p ON p.id = gs.player_id
      JOIN teams t ON t.id = gs.team_id
      WHERE gs.served_games < gs.suspended_games
        AND gs.organization_id = ${ctx.organizationId}
      ORDER BY gs.created_at DESC
      LIMIT 10
    `) as Array<{
      id: string
      suspendedGames: number
      servedGames: number
      player: { id: string; firstName: string; lastName: string }
      team: { id: string; shortName: string; logoUrl: string | null }
    }>

    // --- Top Scorers ---
    const topScorers = await db.playerSeasonStat.findMany({
      where: {
        seasonId,
        organizationId: ctx.organizationId,
      },
      include: {
        player: { select: { id: true, firstName: true, lastName: true } },
        team: { select: { id: true, shortName: true, logoUrl: true } },
      },
      orderBy: [{ totalPoints: "desc" }, { goals: "desc" }, { assists: "desc" }],
      take: 5,
    })

    // --- Top Penalized ---
    const topPenalized = await db.playerSeasonStat.findMany({
      where: {
        seasonId,
        organizationId: ctx.organizationId,
        penaltyMinutes: { gt: 0 },
      },
      include: {
        player: { select: { id: true, firstName: true, lastName: true } },
        team: { select: { id: true, shortName: true, logoUrl: true } },
      },
      orderBy: { penaltyMinutes: "desc" },
      take: 5,
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
      recentResults = await db.game.findMany({
        where: {
          roundId: { in: roundIds },
          status: "completed",
        },
        select: {
          id: true,
          scheduledAt: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { id: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, shortName: true, logoUrl: true } },
        },
        orderBy: { scheduledAt: "desc" },
        take: 5,
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
