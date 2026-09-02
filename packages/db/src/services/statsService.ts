import { Prisma } from "../generated/prisma/client"
import { type DbClient, runAtomic } from "./atomic"
import { uuidv7 } from "./uuid"

/**
 * Resolves the owning organization of a season. When `organizationId` is
 * given the season must belong to it; otherwise `null` is returned and the
 * caller does nothing.
 */
async function resolveSeasonOrg(db: DbClient, seasonId: string, organizationId?: string): Promise<string | null> {
  const season = await db.season.findFirst({
    where: { id: seasonId, ...(organizationId ? { organizationId } : {}) },
    select: { organizationId: true },
  })
  return season?.organizationId ?? null
}

/** Ids of completed games in rounds of the season that count for the given toggle. */
async function completedGameIds(
  db: DbClient,
  seasonId: string,
  orgId: string,
  toggle: "countsForPlayerStats" | "countsForGoalieStats",
): Promise<string[]> {
  const eligibleRounds = await db.round.findMany({
    where: { organizationId: orgId, division: { seasonId, organizationId: orgId }, [toggle]: true },
    select: { id: true },
  })
  const roundIds = eligibleRounds.map((r) => r.id)
  if (roundIds.length === 0) return []

  const completedGames = await db.game.findMany({
    where: { organizationId: orgId, roundId: { in: roundIds }, status: "completed" },
    select: { id: true },
  })
  return completedGames.map((g) => g.id)
}

/**
 * Recalculates player season stats after a game is finalized.
 * Only counts games from rounds where countsForPlayerStats = true.
 *
 * The write is a single atomic prune + upsert keyed on
 * (player_id, season_id, team_id), so readers never observe an empty table.
 */
export async function recalculatePlayerStats(db: DbClient, seasonId: string, organizationId?: string): Promise<void> {
  const orgId = await resolveSeasonOrg(db, seasonId, organizationId)
  if (!orgId) return

  const gameIds = await completedGameIds(db, seasonId, orgId, "countsForPlayerStats")
  if (gameIds.length === 0) {
    await db.playerSeasonStat.deleteMany({ where: { seasonId, organizationId: orgId } })
    return
  }

  // Aggregate goals, assists and penalty minutes per (player, team)
  const [goalAgg, assist1Agg, assist2Agg, penaltyAgg, lineups] = await Promise.all([
    db.gameEvent.groupBy({
      by: ["scorerId", "teamId"],
      where: { organizationId: orgId, gameId: { in: gameIds }, eventType: "goal", scorerId: { not: null } },
      _count: { id: true },
    }),
    db.gameEvent.groupBy({
      by: ["assist1Id", "teamId"],
      where: { organizationId: orgId, gameId: { in: gameIds }, eventType: "goal", assist1Id: { not: null } },
      _count: { id: true },
    }),
    db.gameEvent.groupBy({
      by: ["assist2Id", "teamId"],
      where: { organizationId: orgId, gameId: { in: gameIds }, eventType: "goal", assist2Id: { not: null } },
      _count: { id: true },
    }),
    db.gameEvent.groupBy({
      by: ["penaltyPlayerId", "teamId"],
      where: { organizationId: orgId, gameId: { in: gameIds }, eventType: "penalty", penaltyPlayerId: { not: null } },
      _sum: { penaltyMinutes: true },
    }),
    // Games played: distinct games per (player, team) from lineups
    db.gameLineup.findMany({
      where: { organizationId: orgId, gameId: { in: gameIds } },
      select: { playerId: true, teamId: true, gameId: true },
    }),
  ])

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
    if (row.scorerId && row.teamId) getOrCreate(row.scorerId, row.teamId).goals = row._count.id
  }
  for (const row of assist1Agg) {
    if (row.assist1Id && row.teamId) getOrCreate(row.assist1Id, row.teamId).assists += row._count.id
  }
  for (const row of assist2Agg) {
    if (row.assist2Id && row.teamId) getOrCreate(row.assist2Id, row.teamId).assists += row._count.id
  }
  for (const row of penaltyAgg) {
    if (row.penaltyPlayerId && row.teamId)
      getOrCreate(row.penaltyPlayerId, row.teamId).penaltyMinutes = row._sum.penaltyMinutes ?? 0
  }
  for (const [key, games] of gamesPlayedMap) {
    const [playerId, teamId] = key.split(":")
    getOrCreate(playerId!, teamId!).gamesPlayed = games.size
  }

  const entries = Array.from(statsMap.values())
  const ops: Prisma.PrismaPromise<unknown>[] = []

  if (entries.length === 0) {
    ops.push(db.playerSeasonStat.deleteMany({ where: { seasonId, organizationId: orgId } }))
  } else {
    const keys = entries.map((e) => Prisma.sql`(${e.playerId}::uuid, ${e.teamId}::uuid)`)
    ops.push(
      db.$executeRaw`
        DELETE FROM player_season_stats
        WHERE season_id = ${seasonId}::uuid
          AND organization_id = ${orgId}
          AND (player_id, team_id) NOT IN (${Prisma.join(keys)})
      `,
    )

    const rows = entries.map(
      (e) => Prisma.sql`(
        ${uuidv7()}::uuid, ${orgId}, ${e.playerId}::uuid, ${seasonId}::uuid, ${e.teamId}::uuid,
        ${e.gamesPlayed}, ${e.goals}, ${e.assists}, ${e.goals + e.assists}, ${e.penaltyMinutes}, NOW()
      )`,
    )
    ops.push(
      db.$executeRaw`
        INSERT INTO player_season_stats (
          id, organization_id, player_id, season_id, team_id,
          games_played, goals, assists, total_points, penalty_minutes, updated_at
        )
        VALUES ${Prisma.join(rows)}
        ON CONFLICT (player_id, season_id, team_id) DO UPDATE SET
          games_played = EXCLUDED.games_played,
          goals = EXCLUDED.goals,
          assists = EXCLUDED.assists,
          total_points = EXCLUDED.total_points,
          penalty_minutes = EXCLUDED.penalty_minutes,
          updated_at = EXCLUDED.updated_at
      `,
    )
  }

  await runAtomic(db, ops)
}

/**
 * Recalculates goalie season stats after a game is finalized.
 * Only counts games from rounds where countsForGoalieStats = true.
 */
export async function recalculateGoalieStats(db: DbClient, seasonId: string, organizationId?: string): Promise<void> {
  const orgId = await resolveSeasonOrg(db, seasonId, organizationId)
  if (!orgId) return

  const gameIds = await completedGameIds(db, seasonId, orgId, "countsForGoalieStats")
  if (gameIds.length === 0) {
    await db.goalieSeasonStat.deleteMany({ where: { seasonId, organizationId: orgId } })
    return
  }

  const goalieAgg = await db.goalieGameStat.groupBy({
    by: ["playerId", "teamId"],
    where: { organizationId: orgId, gameId: { in: gameIds } },
    _count: { id: true },
    _sum: { goalsAgainst: true },
  })

  const entries = goalieAgg.map((row) => {
    const gamesPlayed = row._count.id
    const goalsAgainst = row._sum.goalsAgainst ?? 0
    const gaa = gamesPlayed > 0 ? Number((goalsAgainst / gamesPlayed).toFixed(2)) : 0
    return { playerId: row.playerId, teamId: row.teamId, gamesPlayed, goalsAgainst, gaa }
  })

  const ops: Prisma.PrismaPromise<unknown>[] = []

  if (entries.length === 0) {
    ops.push(db.goalieSeasonStat.deleteMany({ where: { seasonId, organizationId: orgId } }))
  } else {
    const keys = entries.map((e) => Prisma.sql`(${e.playerId}::uuid, ${e.teamId}::uuid)`)
    ops.push(
      db.$executeRaw`
        DELETE FROM goalie_season_stats
        WHERE season_id = ${seasonId}::uuid
          AND organization_id = ${orgId}
          AND (player_id, team_id) NOT IN (${Prisma.join(keys)})
      `,
    )

    const rows = entries.map(
      (e) => Prisma.sql`(
        ${uuidv7()}::uuid, ${orgId}, ${e.playerId}::uuid, ${seasonId}::uuid, ${e.teamId}::uuid,
        ${e.gamesPlayed}, ${e.goalsAgainst}, ${e.gaa}::numeric(5,2), NOW()
      )`,
    )
    ops.push(
      db.$executeRaw`
        INSERT INTO goalie_season_stats (
          id, organization_id, player_id, season_id, team_id,
          games_played, goals_against, gaa, updated_at
        )
        VALUES ${Prisma.join(rows)}
        ON CONFLICT (player_id, season_id, team_id) DO UPDATE SET
          games_played = EXCLUDED.games_played,
          goals_against = EXCLUDED.goals_against,
          gaa = EXCLUDED.gaa,
          updated_at = EXCLUDED.updated_at
      `,
    )
  }

  await runAtomic(db, ops)
}
