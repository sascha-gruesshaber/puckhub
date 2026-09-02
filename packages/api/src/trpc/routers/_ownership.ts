import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES, type AppErrorCode } from "../../errors/codes"

/**
 * Models that carry an `organizationId` and may be referenced by id from a
 * mutation input. The value is the error code raised when the row does not
 * belong to the caller's organization (reported as NOT_FOUND on purpose, so a
 * foreign id is indistinguishable from a missing one).
 */
const OWNED_MODELS = {
  season: APP_ERROR_CODES.SEASON_NOT_FOUND,
  division: APP_ERROR_CODES.DIVISION_NOT_FOUND,
  round: APP_ERROR_CODES.ROUND_NOT_FOUND,
  team: APP_ERROR_CODES.TEAM_NOT_FOUND,
  player: APP_ERROR_CODES.PLAYER_NOT_FOUND,
  game: APP_ERROR_CODES.GAME_NOT_FOUND,
  contract: APP_ERROR_CODES.CONTRACT_NOT_FOUND,
  trikot: APP_ERROR_CODES.TRIKOT_NOT_FOUND,
  page: APP_ERROR_CODES.PAGE_NOT_FOUND,
} as const satisfies Record<string, AppErrorCode>

export type OwnedModel = keyof typeof OWNED_MODELS

type OwnershipDb = {
  [K in OwnedModel]: { count(args: { where: { id: { in: string[] }; organizationId: string } }): Promise<number> }
}

/**
 * Asserts that every given id refers to a row of `model` that belongs to
 * `organizationId`. `null`/`undefined` entries are skipped so optional inputs
 * can be passed straight through. Throws NOT_FOUND with the model's error code
 * when any id is missing or belongs to another organization.
 */
export async function assertOrgOwnershipMany(
  db: OwnershipDb,
  model: OwnedModel,
  ids: Iterable<string | null | undefined>,
  organizationId: string,
): Promise<void> {
  const unique = Array.from(new Set(Array.from(ids).filter((id): id is string => typeof id === "string" && id !== "")))
  if (unique.length === 0) return

  const found = await db[model].count({
    where: { id: { in: unique }, organizationId },
  })

  if (found !== unique.length) {
    throw createAppError("NOT_FOUND", OWNED_MODELS[model])
  }
}

/**
 * Asserts that a single id refers to a row of `model` owned by `organizationId`.
 * No-op for `null`/`undefined` so optional inputs can be passed directly.
 */
export async function assertOrgOwnership(
  db: OwnershipDb,
  model: OwnedModel,
  id: string | null | undefined,
  organizationId: string,
): Promise<void> {
  await assertOrgOwnershipMany(db, model, [id], organizationId)
}
