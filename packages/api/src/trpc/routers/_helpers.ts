/**
 * Helper: get IDs of completed games in rounds matching a stats toggle for a given season.
 */
export async function getEligibleGameIds(
  db: any,
  seasonId: string,
  organizationId: string,
  toggle: "countsForPlayerStats" | "countsForGoalieStats",
): Promise<string[]> {
  const eligibleRounds = await db.round.findMany({
    where: {
      [toggle]: true,
      organizationId,
      division: {
        seasonId,
        organizationId,
      },
    },
    select: { id: true },
  })

  const roundIds = eligibleRounds.map((r: any) => r.id) as string[]
  if (roundIds.length === 0) return []

  const completedGames = await db.game.findMany({
    where: {
      roundId: { in: roundIds },
      organizationId,
      status: "completed",
    },
    select: { id: true },
  })

  return completedGames.map((g: any) => g.id) as string[]
}
