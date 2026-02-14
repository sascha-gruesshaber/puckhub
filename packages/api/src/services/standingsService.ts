import type { Database } from "@puckhub/db"

/**
 * Recalculates standings for a given round after a game result changes.
 * Sort order: totalPoints DESC, gamesPlayed ASC, goalDifference DESC, goalsFor DESC
 */
export async function recalculateStandings(_db: Database, _roundId: string): Promise<void> {
  // TODO: Implement standings calculation
  // 1. Fetch all completed games for the round
  // 2. Aggregate wins/draws/losses/goals per team
  // 3. Apply scoring rules from the round (pointsWin, pointsDraw, pointsLoss)
  // 4. Add bonus points
  // 5. Calculate ranks
  // 6. Upsert standings rows
}
