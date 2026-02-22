import { Prisma } from "@prisma/client"
import type { Database } from "../index"

/**
 * Recalculates player season stats after a game is finalized.
 * Only counts games from rounds where countsForPlayerStats = true.
 */
export async function recalculatePlayerStats(db: Database, seasonId: string, organizationId?: string): Promise<void> {
  // Resolve org from season if not provided
  let orgId = organizationId
  if (!orgId) {
    const season = await db.season.findUnique({
      where: { id: seasonId },
      select: { organizationId: true },
    })
    orgId = season?.organizationId
  }
  if (!orgId) return

  // 1. Find all rounds in this season where countsForPlayerStats = true
  const eligibleRounds = await db.round.findMany({
    where: {
      division: { seasonId },
      countsForPlayerStats: true,
    },
    select: { id: true },
  })

  const roundIds = eligibleRounds.map((r) => r.id)
  if (roundIds.length === 0) {
    await db.playerSeasonStat.deleteMany({ where: { seasonId } })
    return
  }

  // 2. Find all completed games in those rounds
  const completedGames = await db.game.findMany({
    where: { roundId: { in: roundIds }, status: "completed" },
    select: { id: true },
  })

  const gameIds = completedGames.map((g) => g.id)
  if (gameIds.length === 0) {
    await db.playerSeasonStat.deleteMany({ where: { seasonId } })
    return
  }

  // 3. Aggregate goals: COUNT where player is scorerId
  const goalAgg = await db.gameEvent.groupBy({
    by: ["scorerId", "teamId"],
    where: {
      gameId: { in: gameIds },
      eventType: "goal",
      scorerId: { not: null },
    },
    _count: { id: true },
  })

  // 4. Aggregate assists: COUNT where player is assist1Id or assist2Id
  const assist1Agg = await db.gameEvent.groupBy({
    by: ["assist1Id", "teamId"],
    where: {
      gameId: { in: gameIds },
      eventType: "goal",
      assist1Id: { not: null },
    },
    _count: { id: true },
  })

  const assist2Agg = await db.gameEvent.groupBy({
    by: ["assist2Id", "teamId"],
    where: {
      gameId: { in: gameIds },
      eventType: "goal",
      assist2Id: { not: null },
    },
    _count: { id: true },
  })

  // 5. Aggregate penalty minutes
  const penaltyAgg = await db.gameEvent.groupBy({
    by: ["penaltyPlayerId", "teamId"],
    where: {
      gameId: { in: gameIds },
      eventType: "penalty",
      penaltyPlayerId: { not: null },
    },
    _sum: { penaltyMinutes: true },
  })

  // 6. Games played: COUNT distinct games from gameLineups
  // Prisma groupBy doesn't support count(distinct), so we query raw lineups and compute in JS
  const lineups = await db.gameLineup.findMany({
    where: { gameId: { in: gameIds } },
    select: { playerId: true, teamId: true, gameId: true },
  })

  const gamesPlayedMap = new Map<string, Set<string>>()
  for (const lineup of lineups) {
    const key = `${lineup.playerId}:${lineup.teamId}`
    let games = gamesPlayedMap.get(key)
    if (!games) {
      games = new Set()
      gamesPlayedMap.set(key, games)
    }
    games.add(lineup.gameId)
  }

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
    if (row.scorerId) getOrCreate(row.scorerId, row.teamId).goals = row._count.id
  }
  for (const row of assist1Agg) {
    if (row.assist1Id) getOrCreate(row.assist1Id, row.teamId).assists += row._count.id
  }
  for (const row of assist2Agg) {
    if (row.assist2Id) getOrCreate(row.assist2Id, row.teamId).assists += row._count.id
  }
  for (const row of penaltyAgg) {
    if (row.penaltyPlayerId) getOrCreate(row.penaltyPlayerId, row.teamId).penaltyMinutes = row._sum.penaltyMinutes ?? 0
  }
  for (const [key, games] of gamesPlayedMap) {
    const [playerId, teamId] = key.split(":")
    getOrCreate(playerId!, teamId!).gamesPlayed = games.size
  }

  // 8. Delete existing stats and insert fresh
  await db.playerSeasonStat.deleteMany({ where: { seasonId } })

  const values = Array.from(statsMap.values()).map((s) => ({
    organizationId: orgId!,
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
    await db.playerSeasonStat.createMany({ data: values })
  }
}

/**
 * Recalculates goalie season stats after a game is finalized.
 * Only counts games from rounds where countsForGoalieStats = true.
 */
export async function recalculateGoalieStats(db: Database, seasonId: string, organizationId?: string): Promise<void> {
  // Resolve org from season if not provided
  let orgId = organizationId
  if (!orgId) {
    const season = await db.season.findUnique({
      where: { id: seasonId },
      select: { organizationId: true },
    })
    orgId = season?.organizationId
  }
  if (!orgId) return

  // 1. Find all rounds where countsForGoalieStats = true
  const eligibleRounds = await db.round.findMany({
    where: {
      division: { seasonId },
      countsForGoalieStats: true,
    },
    select: { id: true },
  })

  const roundIds = eligibleRounds.map((r) => r.id)
  if (roundIds.length === 0) {
    await db.goalieSeasonStat.deleteMany({ where: { seasonId } })
    return
  }

  // 2. Find all completed games in those rounds
  const completedGames = await db.game.findMany({
    where: { roundId: { in: roundIds }, status: "completed" },
    select: { id: true },
  })

  const gameIds = completedGames.map((g) => g.id)
  if (gameIds.length === 0) {
    await db.goalieSeasonStat.deleteMany({ where: { seasonId } })
    return
  }

  // 3. Aggregate from goalieGameStats
  const goalieAgg = await db.goalieGameStat.groupBy({
    by: ["playerId", "teamId"],
    where: { gameId: { in: gameIds } },
    _count: { id: true },
    _sum: { goalsAgainst: true },
  })

  // 4. Delete existing and insert fresh
  await db.goalieSeasonStat.deleteMany({ where: { seasonId } })

  const values = goalieAgg.map((row) => {
    const gamesPlayed = row._count.id
    const goalsAgainst = row._sum.goalsAgainst ?? 0
    const gaa = gamesPlayed > 0 ? Number((goalsAgainst / gamesPlayed).toFixed(2)) : 0
    return {
      organizationId: orgId!,
      playerId: row.playerId,
      seasonId,
      teamId: row.teamId,
      gamesPlayed,
      goalsAgainst,
      gaa: new Prisma.Decimal(gaa),
      updatedAt: new Date(),
    }
  })

  if (values.length > 0) {
    await db.goalieSeasonStat.createMany({ data: values })
  }
}
