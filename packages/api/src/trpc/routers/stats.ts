import * as schema from "@puckhub/db/schema"
import { and, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"
import { publicProcedure, router } from "../init"

/**
 * Helper: get IDs of completed games in rounds matching a stats toggle for a given season.
 */
async function getEligibleGameIds(
  db: any,
  seasonId: string,
  toggle: "countsForPlayerStats" | "countsForGoalieStats",
): Promise<string[]> {
  const eligibleRounds = await db
    .select({ id: schema.rounds.id })
    .from(schema.rounds)
    .innerJoin(schema.divisions, eq(schema.rounds.divisionId, schema.divisions.id))
    .where(and(eq(schema.divisions.seasonId, seasonId), eq(schema.rounds[toggle], true)))

  const roundIds = eligibleRounds.map((r: any) => r.id) as string[]
  if (roundIds.length === 0) return []

  const completedGames = await db
    .select({ id: schema.games.id })
    .from(schema.games)
    .where(and(inArray(schema.games.roundId, roundIds), eq(schema.games.status, "completed")))

  return completedGames.map((g: any) => g.id) as string[]
}

export const statsRouter = router({
  playerStats: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
        position: z.enum(["forward", "defense"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.playerSeasonStats.seasonId, input.seasonId)]
      if (input.teamId) {
        conditions.push(eq(schema.playerSeasonStats.teamId, input.teamId))
      }

      const stats = await ctx.db.query.playerSeasonStats.findMany({
        where: and(...conditions),
        with: {
          player: true,
          team: { columns: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: (s, { desc }) => [desc(s.totalPoints), desc(s.goals), desc(s.assists)],
      })

      // Filter by position if requested (requires joining through contracts or player position)
      if (input.position) {
        // Get active contracts for this season to determine player positions
        const contracts = await ctx.db.query.contracts.findMany({
          where: eq(schema.contracts.startSeasonId, input.seasonId),
          columns: { playerId: true, position: true },
        })
        const positionMap = new Map(contracts.map((c) => [c.playerId, c.position]))

        return stats.filter((s) => positionMap.get(s.playerId) === input.position)
      }

      return stats
    }),

  goalieStats: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.goalieSeasonStats.seasonId, input.seasonId)]
      if (input.teamId) {
        conditions.push(eq(schema.goalieSeasonStats.teamId, input.teamId))
      }

      const stats = await ctx.db.query.goalieSeasonStats.findMany({
        where: and(...conditions),
        with: {
          player: true,
          team: { columns: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: (s, { asc, desc }) => [asc(s.gaa), desc(s.gamesPlayed)],
      })

      // Get goalie_min_games from divisions in this season
      const divisions = await ctx.db.query.divisions.findMany({
        where: eq(schema.divisions.seasonId, input.seasonId),
        columns: { goalieMinGames: true },
      })
      // Use the minimum threshold across all divisions in the season
      const minGames = divisions.length > 0 ? Math.min(...divisions.map((d) => d.goalieMinGames)) : 7

      const qualified = stats.filter((s) => s.gamesPlayed >= minGames)
      const belowThreshold = stats.filter((s) => s.gamesPlayed < minGames)

      return { qualified, belowThreshold, minGames }
    }),

  penaltyStats: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const gameIds = await getEligibleGameIds(ctx.db, input.seasonId, "countsForPlayerStats")
      if (gameIds.length === 0) return []

      const teamCondition = input.teamId ? eq(schema.gameEvents.teamId, input.teamId) : undefined

      const penaltyAgg = await ctx.db
        .select({
          playerId: schema.gameEvents.penaltyPlayerId,
          teamId: schema.gameEvents.teamId,
          penaltyMinutes: sql<number>`coalesce(${schema.gameEvents.penaltyMinutes}, 0)`,
          penaltyTypeId: schema.gameEvents.penaltyTypeId,
        })
        .from(schema.gameEvents)
        .where(
          and(
            inArray(schema.gameEvents.gameId, gameIds),
            eq(schema.gameEvents.eventType, "penalty"),
            sql`${schema.gameEvents.penaltyPlayerId} IS NOT NULL`,
            teamCondition,
          ),
        )

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
        if (!row.playerId) continue
        const key = `${row.playerId}:${row.teamId}`
        let entry = playerMap.get(key)
        if (!entry) {
          entry = { playerId: row.playerId, teamId: row.teamId, totalMinutes: 0, totalCount: 0, byType: new Map() }
          playerMap.set(key, entry)
        }
        const mins = Number(row.penaltyMinutes)
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
      const penaltyTypes = await ctx.db.query.penaltyTypes.findMany()
      const typeMap = new Map(penaltyTypes.map((pt) => [pt.id, pt]))

      // Fetch player and team names
      const playerIds = [...new Set(Array.from(playerMap.values()).map((p) => p.playerId))]
      const players =
        playerIds.length > 0
          ? await ctx.db.query.players.findMany({ where: inArray(schema.players.id, playerIds) })
          : []
      const playerLookup = new Map(players.map((p) => [p.id, p]))

      const teamIds = [...new Set(Array.from(playerMap.values()).map((p) => p.teamId))]
      const teams =
        teamIds.length > 0
          ? await ctx.db.query.teams.findMany({
              where: inArray(schema.teams.id, teamIds),
              columns: { id: true, name: true, shortName: true, logoUrl: true },
            })
          : []
      const teamLookup = new Map(teams.map((t) => [t.id, t]))

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

  teamPenaltyStats: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const gameIds = await getEligibleGameIds(ctx.db, input.seasonId, "countsForPlayerStats")
      if (gameIds.length === 0) return []

      const penaltyAgg = await ctx.db
        .select({
          teamId: schema.gameEvents.teamId,
          penaltyMinutes: sql<number>`coalesce(${schema.gameEvents.penaltyMinutes}, 0)`,
          penaltyTypeId: schema.gameEvents.penaltyTypeId,
        })
        .from(schema.gameEvents)
        .where(and(inArray(schema.gameEvents.gameId, gameIds), eq(schema.gameEvents.eventType, "penalty")))

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
        const mins = Number(row.penaltyMinutes)
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
      const penaltyTypes = await ctx.db.query.penaltyTypes.findMany()
      const typeMapLookup = new Map(penaltyTypes.map((pt) => [pt.id, pt]))

      const teamIds = Array.from(teamMap.keys())
      const teams =
        teamIds.length > 0
          ? await ctx.db.query.teams.findMany({
              where: inArray(schema.teams.id, teamIds),
              columns: { id: true, name: true, shortName: true, logoUrl: true },
            })
          : []
      const teamLookup = new Map(teams.map((t) => [t.id, t]))

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
})
