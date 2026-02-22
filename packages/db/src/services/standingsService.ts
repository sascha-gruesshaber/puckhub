import type { Database } from "../index"

/**
 * Recalculates standings for a given round after a game result changes.
 * Sort order: totalPoints DESC, gamesPlayed ASC, goalDifference DESC, goalsFor DESC
 */
export async function recalculateStandings(db: Database, roundId: string, organizationId?: string): Promise<void> {
  // 1. Fetch the round to get point rules
  const round = await db.round.findUnique({ where: { id: roundId } })
  if (!round) return

  const { pointsWin, pointsDraw, pointsLoss } = round

  // 2. Fetch all completed games for the round
  const completedGames = await db.game.findMany({
    where: { roundId, status: "completed" },
    select: { id: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
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
  const bonusPointRows = await db.bonusPoint.groupBy({
    by: ["teamId"],
    where: { roundId },
    _sum: { points: true },
  })

  const bonusMap = new Map(bonusPointRows.map((r) => [r.teamId, r._sum.points ?? 0]))

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
  const existing = await db.standing.findMany({
    where: { roundId },
    select: { teamId: true, rank: true },
  })
  const previousRankMap = new Map(existing.map((s) => [s.teamId, s.rank]))

  // 7. Delete existing standings and insert fresh with ranks
  await db.standing.deleteMany({ where: { roundId } })

  if (entries.length > 0) {
    const orgId = organizationId ?? round.organizationId
    await db.standing.createMany({
      data: entries.map((e, idx) => ({
        organizationId: orgId,
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
    })
  }
}
