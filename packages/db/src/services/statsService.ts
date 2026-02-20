import { and, eq, inArray, sql } from "drizzle-orm"
import type { Database } from "../index"
import * as schema from "../schema"

/**
 * Recalculates player season stats after a game is finalized.
 * Only counts games from rounds where countsForPlayerStats = true.
 */
export async function recalculatePlayerStats(db: Database, seasonId: string): Promise<void> {
  // 1. Find all rounds in this season where countsForPlayerStats = true
  const eligibleRounds = await db
    .select({ id: schema.rounds.id })
    .from(schema.rounds)
    .innerJoin(schema.divisions, eq(schema.rounds.divisionId, schema.divisions.id))
    .where(and(eq(schema.divisions.seasonId, seasonId), eq(schema.rounds.countsForPlayerStats, true)))

  const roundIds = eligibleRounds.map((r) => r.id)
  if (roundIds.length === 0) {
    // No eligible rounds — clear all player stats for this season
    await db.delete(schema.playerSeasonStats).where(eq(schema.playerSeasonStats.seasonId, seasonId))
    return
  }

  // 2. Find all completed games in those rounds
  const completedGames = await db
    .select({ id: schema.games.id })
    .from(schema.games)
    .where(and(inArray(schema.games.roundId, roundIds), eq(schema.games.status, "completed")))

  const gameIds = completedGames.map((g) => g.id)
  if (gameIds.length === 0) {
    await db.delete(schema.playerSeasonStats).where(eq(schema.playerSeasonStats.seasonId, seasonId))
    return
  }

  // 3. Aggregate goals: COUNT where player is scorerId
  const goalAgg = await db
    .select({
      playerId: schema.gameEvents.scorerId,
      teamId: schema.gameEvents.teamId,
      goals: sql<number>`count(*)`.as("goals"),
    })
    .from(schema.gameEvents)
    .where(
      and(
        inArray(schema.gameEvents.gameId, gameIds),
        eq(schema.gameEvents.eventType, "goal"),
        sql`${schema.gameEvents.scorerId} IS NOT NULL`,
      ),
    )
    .groupBy(schema.gameEvents.scorerId, schema.gameEvents.teamId)

  // 4. Aggregate assists: COUNT where player is assist1Id or assist2Id
  const assist1Agg = await db
    .select({
      playerId: schema.gameEvents.assist1Id,
      teamId: schema.gameEvents.teamId,
      assists: sql<number>`count(*)`.as("assists"),
    })
    .from(schema.gameEvents)
    .where(
      and(
        inArray(schema.gameEvents.gameId, gameIds),
        eq(schema.gameEvents.eventType, "goal"),
        sql`${schema.gameEvents.assist1Id} IS NOT NULL`,
      ),
    )
    .groupBy(schema.gameEvents.assist1Id, schema.gameEvents.teamId)

  const assist2Agg = await db
    .select({
      playerId: schema.gameEvents.assist2Id,
      teamId: schema.gameEvents.teamId,
      assists: sql<number>`count(*)`.as("assists"),
    })
    .from(schema.gameEvents)
    .where(
      and(
        inArray(schema.gameEvents.gameId, gameIds),
        eq(schema.gameEvents.eventType, "goal"),
        sql`${schema.gameEvents.assist2Id} IS NOT NULL`,
      ),
    )
    .groupBy(schema.gameEvents.assist2Id, schema.gameEvents.teamId)

  // 5. Aggregate penalty minutes
  const penaltyAgg = await db
    .select({
      playerId: schema.gameEvents.penaltyPlayerId,
      teamId: schema.gameEvents.teamId,
      penaltyMinutes: sql<number>`coalesce(sum(${schema.gameEvents.penaltyMinutes}), 0)`.as("penalty_minutes"),
    })
    .from(schema.gameEvents)
    .where(
      and(
        inArray(schema.gameEvents.gameId, gameIds),
        eq(schema.gameEvents.eventType, "penalty"),
        sql`${schema.gameEvents.penaltyPlayerId} IS NOT NULL`,
      ),
    )
    .groupBy(schema.gameEvents.penaltyPlayerId, schema.gameEvents.teamId)

  // 6. Games played: COUNT distinct games from gameLineups
  const gamesPlayedAgg = await db
    .select({
      playerId: schema.gameLineups.playerId,
      teamId: schema.gameLineups.teamId,
      gamesPlayed: sql<number>`count(distinct ${schema.gameLineups.gameId})`.as("games_played"),
    })
    .from(schema.gameLineups)
    .where(inArray(schema.gameLineups.gameId, gameIds))
    .groupBy(schema.gameLineups.playerId, schema.gameLineups.teamId)

  // 7. Merge all stats into a single map: key = "playerId:teamId"
  type StatEntry = {
    playerId: string
    teamId: string
    goals: number
    assists: number
    penaltyMinutes: number
    gamesPlayed: number
  }

  const statsMap = new Map<string, StatEntry>()

  function getOrCreate(playerId: string, teamId: string): StatEntry {
    const key = `${playerId}:${teamId}`
    let entry = statsMap.get(key)
    if (!entry) {
      entry = { playerId, teamId, goals: 0, assists: 0, penaltyMinutes: 0, gamesPlayed: 0 }
      statsMap.set(key, entry)
    }
    return entry
  }

  for (const row of goalAgg) {
    if (row.playerId) getOrCreate(row.playerId, row.teamId).goals = Number(row.goals)
  }
  for (const row of assist1Agg) {
    if (row.playerId) getOrCreate(row.playerId, row.teamId).assists += Number(row.assists)
  }
  for (const row of assist2Agg) {
    if (row.playerId) getOrCreate(row.playerId, row.teamId).assists += Number(row.assists)
  }
  for (const row of penaltyAgg) {
    if (row.playerId) getOrCreate(row.playerId, row.teamId).penaltyMinutes = Number(row.penaltyMinutes)
  }
  for (const row of gamesPlayedAgg) {
    getOrCreate(row.playerId, row.teamId).gamesPlayed = Number(row.gamesPlayed)
  }

  // 8. Delete existing stats and insert fresh
  await db.delete(schema.playerSeasonStats).where(eq(schema.playerSeasonStats.seasonId, seasonId))

  const values = Array.from(statsMap.values()).map((s) => ({
    playerId: s.playerId,
    seasonId,
    teamId: s.teamId,
    gamesPlayed: s.gamesPlayed,
    goals: s.goals,
    assists: s.assists,
    totalPoints: s.goals + s.assists,
    penaltyMinutes: s.penaltyMinutes,
    updatedAt: new Date(),
  }))

  if (values.length > 0) {
    await db.insert(schema.playerSeasonStats).values(values)
  }
}

/**
 * Recalculates goalie season stats after a game is finalized.
 * Only counts games from rounds where countsForGoalieStats = true.
 */
export async function recalculateGoalieStats(db: Database, seasonId: string): Promise<void> {
  // 1. Find all rounds where countsForGoalieStats = true
  const eligibleRounds = await db
    .select({ id: schema.rounds.id })
    .from(schema.rounds)
    .innerJoin(schema.divisions, eq(schema.rounds.divisionId, schema.divisions.id))
    .where(and(eq(schema.divisions.seasonId, seasonId), eq(schema.rounds.countsForGoalieStats, true)))

  const roundIds = eligibleRounds.map((r) => r.id)
  if (roundIds.length === 0) {
    await db.delete(schema.goalieSeasonStats).where(eq(schema.goalieSeasonStats.seasonId, seasonId))
    return
  }

  // 2. Find all completed games in those rounds
  const completedGames = await db
    .select({ id: schema.games.id })
    .from(schema.games)
    .where(and(inArray(schema.games.roundId, roundIds), eq(schema.games.status, "completed")))

  const gameIds = completedGames.map((g) => g.id)
  if (gameIds.length === 0) {
    await db.delete(schema.goalieSeasonStats).where(eq(schema.goalieSeasonStats.seasonId, seasonId))
    return
  }

  // 3. Aggregate from goalieGameStats
  const goalieAgg = await db
    .select({
      playerId: schema.goalieGameStats.playerId,
      teamId: schema.goalieGameStats.teamId,
      gamesPlayed: sql<number>`count(*)`.as("games_played"),
      goalsAgainst: sql<number>`coalesce(sum(${schema.goalieGameStats.goalsAgainst}), 0)`.as("goals_against"),
    })
    .from(schema.goalieGameStats)
    .where(inArray(schema.goalieGameStats.gameId, gameIds))
    .groupBy(schema.goalieGameStats.playerId, schema.goalieGameStats.teamId)

  // 4. Delete existing and insert fresh
  await db.delete(schema.goalieSeasonStats).where(eq(schema.goalieSeasonStats.seasonId, seasonId))

  const values = goalieAgg.map((row) => {
    const gamesPlayed = Number(row.gamesPlayed)
    const goalsAgainst = Number(row.goalsAgainst)
    const gaa = gamesPlayed > 0 ? (goalsAgainst / gamesPlayed).toFixed(2) : "0.00"
    return {
      playerId: row.playerId,
      seasonId,
      teamId: row.teamId,
      gamesPlayed,
      goalsAgainst,
      gaa,
      updatedAt: new Date(),
    }
  })

  if (values.length > 0) {
    await db.insert(schema.goalieSeasonStats).values(values)
  }
}
