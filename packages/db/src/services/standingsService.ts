import { Prisma } from "../generated/prisma/client"
import { type DbClient, runAtomic } from "./atomic"
import { uuidv7 } from "./uuid"

/**
 * Recalculates standings for a round after a game result or bonus point
 * changes. Sort order: totalPoints DESC, gamesPlayed ASC, goalDifference DESC,
 * goalsFor DESC.
 *
 * All reads are scoped to the round's organization and the write is a single
 * atomic upsert + prune, so concurrent readers never see an empty or
 * duplicated table. When `organizationId` is given the round must belong to
 * it; otherwise nothing happens.
 */
export async function recalculateStandings(db: DbClient, roundId: string, organizationId?: string): Promise<void> {
  // 1. Fetch the round to get point rules (and the owning organization)
  const round = await db.round.findFirst({
    where: { id: roundId, ...(organizationId ? { organizationId } : {}) },
    select: { organizationId: true, pointsWin: true, pointsDraw: true, pointsLoss: true },
  })
  if (!round) return

  const orgId = round.organizationId
  const { pointsWin, pointsDraw, pointsLoss } = round

  // 2. Fetch all completed games for the round
  const completedGames = await db.game.findMany({
    where: { roundId, organizationId: orgId, status: "completed" },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
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
    where: { roundId, organizationId: orgId },
    _sum: { points: true },
  })

  const bonusMap = new Map(bonusPointRows.map((r) => [r.teamId, r._sum.points ?? 0]))

  // 5. Build standings entries and sort
  const entries = Array.from(teamMap.entries()).map(([teamId, stats]) => {
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

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    return b.goalsFor - a.goalsFor
  })

  // 6. Atomic write: prune teams no longer in the round, upsert the rest.
  //    `previous_rank` keeps the rank the row had before this recalculation.
  const ops: Prisma.PrismaPromise<unknown>[] = []

  if (entries.length === 0) {
    ops.push(db.standing.deleteMany({ where: { roundId, organizationId: orgId } }))
  } else {
    ops.push(
      db.standing.deleteMany({
        where: { roundId, organizationId: orgId, teamId: { notIn: entries.map((e) => e.teamId) } },
      }),
    )

    const rows = entries.map(
      (e, idx) => Prisma.sql`(
        ${uuidv7()}::uuid, ${orgId}, ${e.teamId}::uuid, ${roundId}::uuid,
        ${e.gamesPlayed}, ${e.wins}, ${e.draws}, ${e.losses},
        ${e.goalsFor}, ${e.goalsAgainst}, ${e.goalDifference},
        ${e.points}, ${e.bonusPoints}, ${e.totalPoints}, ${idx + 1}, NOW()
      )`,
    )

    ops.push(
      db.$executeRaw`
        INSERT INTO standings (
          id, organization_id, team_id, round_id,
          games_played, wins, draws, losses,
          goals_for, goals_against, goal_difference,
          points, bonus_points, total_points, rank, updated_at
        )
        VALUES ${Prisma.join(rows)}
        ON CONFLICT (round_id, team_id) DO UPDATE SET
          games_played = EXCLUDED.games_played,
          wins = EXCLUDED.wins,
          draws = EXCLUDED.draws,
          losses = EXCLUDED.losses,
          goals_for = EXCLUDED.goals_for,
          goals_against = EXCLUDED.goals_against,
          goal_difference = EXCLUDED.goal_difference,
          points = EXCLUDED.points,
          bonus_points = EXCLUDED.bonus_points,
          total_points = EXCLUDED.total_points,
          previous_rank = standings.rank,
          rank = EXCLUDED.rank,
          updated_at = EXCLUDED.updated_at
      `,
    )
  }

  await runAtomic(db, ops)
}
