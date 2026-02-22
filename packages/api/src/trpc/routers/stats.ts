import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

/**
 * Helper: get IDs of completed games in rounds matching a stats toggle for a given season.
 */
async function getEligibleGameIds(
  db: any,
  seasonId: string,
  toggle: "countsForPlayerStats" | "countsForGoalieStats",
): Promise<string[]> {
  const eligibleRounds = await db.round.findMany({
    where: {
      [toggle]: true,
      division: {
        seasonId,
      },
    },
    select: { id: true },
  })

  const roundIds = eligibleRounds.map((r: any) => r.id) as string[]
  if (roundIds.length === 0) return []

  const completedGames = await db.game.findMany({
    where: {
      roundId: { in: roundIds },
      status: "completed",
    },
    select: { id: true },
  })

  return completedGames.map((g: any) => g.id) as string[]
}

/**
 * Backfill goalieGameStats for completed games that are missing them.
 * Uses starting goalies from lineups and goal counts from events.
 */
async function backfillGoalieGameStats(db: any, seasonId: string, organizationId: string): Promise<void> {
  // Get all completed games for this season (across all rounds)
  const allRounds = await db.round.findMany({
    where: {
      division: {
        seasonId,
      },
    },
    select: { id: true },
  })

  const roundIds = allRounds.map((r: any) => r.id) as string[]
  if (roundIds.length === 0) return

  const completedGames = await db.game.findMany({
    where: {
      roundId: { in: roundIds },
      status: "completed",
    },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  })
  if (completedGames.length === 0) return

  const gameIds = completedGames.map((g: any) => g.id) as string[]

  // Find games that already have goalie stats
  const existingStats = await db.goalieGameStat.findMany({
    where: { gameId: { in: gameIds } },
    select: { gameId: true },
  })
  const gamesWithStats = new Set(existingStats.map((s: any) => s.gameId))

  const gamesToBackfill = completedGames.filter((g: any) => !gamesWithStats.has(g.id))
  if (gamesToBackfill.length === 0) return

  const backfillGameIds = gamesToBackfill.map((g: any) => g.id) as string[]

  // Get starting goalies for these games
  const goalieLineups = await db.gameLineup.findMany({
    where: {
      gameId: { in: backfillGameIds },
      isStartingGoalie: true,
    },
    select: { gameId: true, playerId: true, teamId: true },
  })

  // Count goals per game+team from events using groupBy
  const goalEvents = await db.gameEvent.groupBy({
    by: ["gameId", "teamId"],
    where: {
      gameId: { in: backfillGameIds },
      eventType: "goal",
    },
    _count: { id: true },
  })

  const goalsByGameTeam = new Map<string, number>()
  for (const row of goalEvents) {
    goalsByGameTeam.set(`${row.gameId}:${row.teamId}`, row._count.id)
  }

  const gameMap = new Map(gamesToBackfill.map((g: any) => [g.id, g]))

  const values = goalieLineups
    .map((gl: any) => {
      const game = gameMap.get(gl.gameId) as any
      if (!game) return null
      const opponentTeamId = gl.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId
      return {
        organizationId,
        gameId: gl.gameId,
        playerId: gl.playerId,
        teamId: gl.teamId,
        goalsAgainst: goalsByGameTeam.get(`${gl.gameId}:${opponentTeamId}`) ?? 0,
      }
    })
    .filter((v: any): v is NonNullable<typeof v> => v !== null)

  if (values.length > 0) {
    await db.goalieGameStat.createMany({ data: values })
  }
}

export const statsRouter = router({
  seasonRoundInfo: orgProcedure.input(z.object({ seasonId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const divisions = await ctx.db.division.findMany({
      where: {
        seasonId: input.seasonId,
        organizationId: ctx.organizationId,
      },
      include: { rounds: true },
      orderBy: { sortOrder: "asc" },
    })
    return divisions
  }),

  playerStats: orgProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
        position: z.enum(["forward", "defense"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        seasonId: input.seasonId,
        organizationId: ctx.organizationId,
      }
      if (input.teamId) {
        where.teamId = input.teamId
      }

      const stats = await ctx.db.playerSeasonStat.findMany({
        where,
        include: {
          player: true,
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: [{ totalPoints: "desc" }, { goals: "desc" }, { assists: "desc" }],
      })

      // Filter by position if requested — look up position from contracts matching player+team
      if (input.position) {
        const playerIds = [...new Set(stats.map((s: any) => s.playerId))]
        if (playerIds.length === 0) return []

        const contracts = await ctx.db.contract.findMany({
          where: { playerId: { in: playerIds } },
          select: { playerId: true, teamId: true, position: true },
        })
        // Key by player+team since a player's position depends on which team they play for
        const positionMap = new Map(contracts.map((c: any) => [`${c.playerId}:${c.teamId}`, c.position]))

        return stats.filter((s: any) => positionMap.get(`${s.playerId}:${s.teamId}`) === input.position)
      }

      return stats
    }),

  goalieStats: orgProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        seasonId: input.seasonId,
        organizationId: ctx.organizationId,
      }
      if (input.teamId) {
        where.teamId = input.teamId
      }

      const stats = await ctx.db.goalieSeasonStat.findMany({
        where,
        include: {
          player: true,
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: [{ gaa: "asc" }, { gamesPlayed: "desc" }],
      })

      // Get goalie_min_games from divisions in this season
      const divisions = await ctx.db.division.findMany({
        where: {
          seasonId: input.seasonId,
          organizationId: ctx.organizationId,
        },
        select: { goalieMinGames: true },
      })
      // Use the minimum threshold across all divisions in the season
      const minGames = divisions.length > 0 ? Math.min(...divisions.map((d: any) => d.goalieMinGames)) : 7

      const qualified = stats.filter((s: any) => s.gamesPlayed >= minGames)
      const belowThreshold = stats.filter((s: any) => s.gamesPlayed < minGames)

      return { qualified, belowThreshold, minGames }
    }),

  penaltyStats: orgProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const gameIds = await getEligibleGameIds(ctx.db, input.seasonId, "countsForPlayerStats")
      if (gameIds.length === 0) return []

      const penaltyWhere: any = {
        gameId: { in: gameIds },
        organizationId: ctx.organizationId,
        eventType: "penalty",
        penaltyPlayerId: { not: null },
      }
      if (input.teamId) penaltyWhere.teamId = input.teamId

      const penaltyAgg = await ctx.db.gameEvent.findMany({
        where: penaltyWhere,
        select: {
          penaltyPlayerId: true,
          teamId: true,
          penaltyMinutes: true,
          penaltyTypeId: true,
        },
      })

      // Group by player+team, then breakdown by penalty type
      type PlayerPenalty = {
        playerId: string
        teamId: string
        totalMinutes: number
        totalCount: number
        byType: Map<string, { count: number; minutes: number }>
      }

      const playerMap = new Map<string, PlayerPenalty>()

      for (const row of penaltyAgg) {
        if (!row.penaltyPlayerId) continue
        const key = `${row.penaltyPlayerId}:${row.teamId}`
        let entry = playerMap.get(key)
        if (!entry) {
          entry = {
            playerId: row.penaltyPlayerId,
            teamId: row.teamId,
            totalMinutes: 0,
            totalCount: 0,
            byType: new Map(),
          }
          playerMap.set(key, entry)
        }
        const mins = Number(row.penaltyMinutes ?? 0)
        entry.totalMinutes += mins
        entry.totalCount++
        const typeId = row.penaltyTypeId ?? "unknown"
        const typeEntry = entry.byType.get(typeId)
        if (typeEntry) {
          typeEntry.count++
          typeEntry.minutes += mins
        } else {
          entry.byType.set(typeId, { count: 1, minutes: mins })
        }
      }

      // Fetch penalty types for names
      const penaltyTypes = await ctx.db.penaltyType.findMany()
      const typeMap = new Map(penaltyTypes.map((pt: any) => [pt.id, pt]))

      // Fetch player and team names
      const playerIds = [...new Set(Array.from(playerMap.values()).map((p) => p.playerId))]
      const players = playerIds.length > 0 ? await ctx.db.player.findMany({ where: { id: { in: playerIds } } }) : []
      const playerLookup = new Map(players.map((p: any) => [p.id, p]))

      const teamIds = [...new Set(Array.from(playerMap.values()).map((p) => p.teamId))]
      const teams =
        teamIds.length > 0
          ? await ctx.db.team.findMany({
              where: { id: { in: teamIds } },
              select: { id: true, name: true, shortName: true, logoUrl: true },
            })
          : []
      const teamLookup = new Map(teams.map((t: any) => [t.id, t]))

      const results = Array.from(playerMap.values())
        .map((entry) => ({
          player: playerLookup.get(entry.playerId) ?? null,
          team: teamLookup.get(entry.teamId) ?? null,
          totalMinutes: entry.totalMinutes,
          totalCount: entry.totalCount,
          breakdown: Array.from(entry.byType.entries()).map(([typeId, data]) => ({
            penaltyType: typeMap.get(typeId) ?? null,
            count: data.count,
            minutes: data.minutes,
          })),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)

      return results
    }),

  teamPenaltyStats: orgProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const gameIds = await getEligibleGameIds(ctx.db, input.seasonId, "countsForPlayerStats")
      if (gameIds.length === 0) return []

      const penaltyAgg = await ctx.db.gameEvent.findMany({
        where: {
          gameId: { in: gameIds },
          organizationId: ctx.organizationId,
          eventType: "penalty",
        },
        select: {
          teamId: true,
          penaltyMinutes: true,
          penaltyTypeId: true,
        },
      })

      type TeamPenalty = {
        teamId: string
        totalMinutes: number
        totalCount: number
        byType: Map<string, { count: number; minutes: number }>
      }

      const teamMap = new Map<string, TeamPenalty>()

      for (const row of penaltyAgg) {
        let entry = teamMap.get(row.teamId)
        if (!entry) {
          entry = { teamId: row.teamId, totalMinutes: 0, totalCount: 0, byType: new Map() }
          teamMap.set(row.teamId, entry)
        }
        const mins = Number(row.penaltyMinutes ?? 0)
        entry.totalMinutes += mins
        entry.totalCount++
        const typeId = row.penaltyTypeId ?? "unknown"
        const typeEntry = entry.byType.get(typeId)
        if (typeEntry) {
          typeEntry.count++
          typeEntry.minutes += mins
        } else {
          entry.byType.set(typeId, { count: 1, minutes: mins })
        }
      }

      // Fetch penalty types and teams
      const penaltyTypes = await ctx.db.penaltyType.findMany()
      const typeMapLookup = new Map(penaltyTypes.map((pt: any) => [pt.id, pt]))

      const teamIds = Array.from(teamMap.keys())
      const teams =
        teamIds.length > 0
          ? await ctx.db.team.findMany({
              where: { id: { in: teamIds } },
              select: { id: true, name: true, shortName: true, logoUrl: true },
            })
          : []
      const teamLookup = new Map(teams.map((t: any) => [t.id, t]))

      const results = Array.from(teamMap.values())
        .map((entry) => ({
          team: teamLookup.get(entry.teamId) ?? null,
          totalMinutes: entry.totalMinutes,
          totalCount: entry.totalCount,
          breakdown: Array.from(entry.byType.entries()).map(([typeId, data]) => ({
            penaltyType: typeMapLookup.get(typeId) ?? null,
            count: data.count,
            minutes: data.minutes,
          })),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)

      return results
    }),

  recalculate: orgAdminProcedure.input(z.object({ seasonId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // First, generate missing goalieGameStats for completed games that lack them
    await backfillGoalieGameStats(ctx.db, input.seasonId, ctx.organizationId)

    await recalculatePlayerStats(ctx.db, input.seasonId)
    await recalculateGoalieStats(ctx.db, input.seasonId)

    // Recalculate standings for all rounds in this season
    const rounds = await ctx.db.round.findMany({
      where: {
        division: {
          seasonId: input.seasonId,
        },
      },
      select: { id: true },
    })
    for (const round of rounds) {
      await recalculateStandings(ctx.db, round.id)
    }

    return { success: true }
  }),
})
