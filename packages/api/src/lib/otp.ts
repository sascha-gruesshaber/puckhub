import { randomInt } from "node:crypto"
import { createAppError } from "../errors/appError"
import type { AppErrorCode } from "../errors/codes"

/**
 * One-time-code helpers on top of the Better Auth `verification` table.
 *
 * Rows are keyed by `identifier`; the same table doubles as a lightweight
 * rate-limit ledger (marker rows with a TTL), so no extra storage is needed.
 */

type VerificationDb = {
  verification: {
    count(args: { where: { identifier: string; createdAt?: { gte: Date }; expiresAt?: { lt: Date } } }): Promise<number>
    create(args: { data: { id: string; identifier: string; value: string; expiresAt: Date } }): Promise<unknown>
    deleteMany(args: { where: { identifier: string; expiresAt?: { lt: Date } } }): Promise<unknown>
    findFirst(args: {
      where: { identifier: string; value: string; expiresAt: { gte: Date } }
      select?: { id: true }
    }): Promise<{ id: string } | null>
  }
}

export const OTP_TTL_MS = 10 * 60 * 1000

/** Six-digit code from a CSPRNG. */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000))
}

/** Number of marker/code rows created for `identifier` within the window. */
export async function countRecent(db: VerificationDb, identifier: string, windowMs: number): Promise<number> {
  return db.verification.count({
    where: { identifier, createdAt: { gte: new Date(Date.now() - windowMs) } },
  })
}

/** Records a rate-limit marker for `identifier` that expires after `ttlMs`. */
export async function recordMarker(db: VerificationDb, identifier: string, ttlMs: number): Promise<void> {
  await db.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier,
      value: "1",
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })
}

/**
 * Throws `code` (TOO_MANY_REQUESTS) when `identifier` has been used `max` or
 * more times within `windowMs`; otherwise records one more use.
 */
export async function enforceRateLimit(
  db: VerificationDb,
  identifier: string,
  max: number,
  windowMs: number,
  code: AppErrorCode,
  message = "Too many requests. Please try again later.",
): Promise<void> {
  const recent = await countRecent(db, identifier, windowMs)
  if (recent >= max) {
    throw createAppError("TOO_MANY_REQUESTS", code, message)
  }
  await recordMarker(db, identifier, windowMs)
}

/**
 * Issues a fresh code for `identifier`, replacing any previously issued code
 * so exactly one valid code exists at a time. Expired rows for the identifier
 * are pruned on the way.
 */
export async function issueOtp(db: VerificationDb, identifier: string, ttlMs = OTP_TTL_MS): Promise<string> {
  const code = generateOtpCode()
  await db.verification.deleteMany({ where: { identifier } })
  await db.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier,
      value: code,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })
  return code
}

export interface ConsumeOtpOptions {
  /** Identifier the code was issued under. */
  identifier: string
  code: string
  /** Failed attempts allowed within `lockoutWindowMs` before the identifier is locked. */
  maxFailures?: number
  lockoutWindowMs?: number
  /** Error code raised when the lockout is active. */
  lockedCode: AppErrorCode
}

/**
 * Validates and consumes a code. Returns `true` on success (the code and any
 * failure markers are removed), `false` on a wrong or expired code (a failure
 * marker is recorded). Throws TOO_MANY_REQUESTS once the failure budget is
 * exhausted, so brute force stops paying off after a handful of guesses.
 */
export async function consumeOtp(db: VerificationDb, opts: ConsumeOtpOptions): Promise<boolean> {
  const maxFailures = opts.maxFailures ?? 5
  const lockoutWindowMs = opts.lockoutWindowMs ?? 15 * 60 * 1000
  const failIdentifier = `otp-fail:${opts.identifier}`

  const failures = await countRecent(db, failIdentifier, lockoutWindowMs)
  if (failures >= maxFailures) {
    throw createAppError("TOO_MANY_REQUESTS", opts.lockedCode, "Too many failed attempts. Please request a new code.")
  }

  const match = await db.verification.findFirst({
    where: { identifier: opts.identifier, value: opts.code, expiresAt: { gte: new Date() } },
    select: { id: true },
  })

  if (!match) {
    await recordMarker(db, failIdentifier, lockoutWindowMs)
    return false
  }

  await db.verification.deleteMany({ where: { identifier: opts.identifier } })
  await db.verification.deleteMany({ where: { identifier: failIdentifier } })
  return true
}
