/**
 * Helper: get IDs of completed games in rounds matching a stats toggle for a given season.
 */
export async function getEligibleGameIds(
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
