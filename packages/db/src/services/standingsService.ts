import { and, eq, sql } from "drizzle-orm"
import type { Database } from "../index"
import * as schema from "../schema"

/**
 * Recalculates standings for a given round after a game result changes.
 * Sort order: totalPoints DESC, gamesPlayed ASC, goalDifference DESC, goalsFor DESC
 */
export async function recalculateStandings(db: Database, roundId: string): Promise<void> {
  // 1. Fetch the round to get point rules
  const round = await db.query.rounds.findFirst({
    where: eq(schema.rounds.id, roundId),
  })
  if (!round) return

  const { pointsWin, pointsDraw, pointsLoss } = round

  // 2. Fetch all completed games for the round
  const completedGames = await db.query.games.findMany({
    where: and(eq(schema.games.roundId, roundId), eq(schema.games.status, "completed")),
    columns: { id: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  })

  // 3. Aggregate per team
  type TeamStats = {
    gamesPlayed: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
  }

  const teamMap = new Map<string, TeamStats>()

  function getOrCreate(teamId: string): TeamStats {
    let stats = teamMap.get(teamId)
    if (!stats) {
      stats = { gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
      teamMap.set(teamId, stats)
    }
    return stats
  }

  for (const game of completedGames) {
    const hs = game.homeScore ?? 0
    const as_ = game.awayScore ?? 0

    const home = getOrCreate(game.homeTeamId)
    const away = getOrCreate(game.awayTeamId)

    home.gamesPlayed++
    away.gamesPlayed++
    home.goalsFor += hs
    home.goalsAgainst += as_
    away.goalsFor += as_
    away.goalsAgainst += hs

    if (hs > as_) {
      home.wins++
      away.losses++
    } else if (hs < as_) {
      away.wins++
      home.losses++
    } else {
      home.draws++
      away.draws++
    }
  }

  // 4. Add bonus points
  const bonusPointRows = await db
    .select({
      teamId: schema.bonusPoints.teamId,
      total: sql<number>`coalesce(sum(${schema.bonusPoints.points}), 0)`.as("total"),
    })
    .from(schema.bonusPoints)
    .where(eq(schema.bonusPoints.roundId, roundId))
    .groupBy(schema.bonusPoints.teamId)

  const bonusMap = new Map(bonusPointRows.map((r) => [r.teamId, Number(r.total)]))

  // 5. Build standings entries and sort
  type StandingEntry = {
    teamId: string
    gamesPlayed: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    points: number
    bonusPoints: number
    totalPoints: number
  }

  const entries: StandingEntry[] = Array.from(teamMap.entries()).map(([teamId, stats]) => {
    const pts = stats.wins * pointsWin + stats.draws * pointsDraw + stats.losses * pointsLoss
    const bp = bonusMap.get(teamId) ?? 0
    return {
      teamId,
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      goalDifference: stats.goalsFor - stats.goalsAgainst,
      points: pts,
      bonusPoints: bp,
      totalPoints: pts + bp,
    }
  })

  // Sort: totalPoints DESC, gamesPlayed ASC, goalDifference DESC, goalsFor DESC
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    return b.goalsFor - a.goalsFor
  })

  // 6. Read current ranks before deleting (for previousRank tracking)
  const existing = await db.query.standings.findMany({
    where: eq(schema.standings.roundId, roundId),
    columns: { teamId: true, rank: true },
  })
  const previousRankMap = new Map(existing.map((s) => [s.teamId, s.rank]))

  // 7. Delete existing standings and insert fresh with ranks
  await db.delete(schema.standings).where(eq(schema.standings.roundId, roundId))

  if (entries.length > 0) {
    await db.insert(schema.standings).values(
      entries.map((e, idx) => ({
        teamId: e.teamId,
        roundId,
        gamesPlayed: e.gamesPlayed,
        wins: e.wins,
        draws: e.draws,
        losses: e.losses,
        goalsFor: e.goalsFor,
        goalsAgainst: e.goalsAgainst,
        goalDifference: e.goalDifference,
        points: e.points,
        bonusPoints: e.bonusPoints,
        totalPoints: e.totalPoints,
        rank: idx + 1,
        previousRank: previousRankMap.get(e.teamId) ?? null,
        updatedAt: new Date(),
      })),
    )
  }
}
