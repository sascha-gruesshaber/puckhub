import type { Database } from "@puckhub/db"

/**
 * Recalculates player season stats after a game is finalized.
 */
export async function recalculatePlayerStats(_db: Database, _seasonId: string): Promise<void> {
  // TODO: Implement player stats aggregation
  // 1. Aggregate goals, assists, penalty minutes from gameEvents
  // 2. Count games played from game participation
  // 3. Upsert playerSeasonStats rows
}

/**
 * Recalculates goalie season stats after a game is finalized.
 */
export async function recalculateGoalieStats(_db: Database, _seasonId: string): Promise<void> {
  // TODO: Implement goalie stats aggregation
  // 1. Aggregate goals against from goalieGameStats
  // 2. Calculate GAA (goals against average)
  // 3. Upsert goalieSeasonStats rows
}
