import type { Prisma, PrismaClient } from "../generated/prisma/client"

/** A Prisma client or an interactive-transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Runs the given lazy Prisma operations atomically. When `db` is already a
 * transaction client the caller's transaction provides atomicity and the
 * operations simply run in order.
 */
export async function runAtomic(db: DbClient, ops: Prisma.PrismaPromise<unknown>[]): Promise<void> {
  if (ops.length === 0) return
  if ("$transaction" in db && typeof db.$transaction === "function") {
    await db.$transaction(ops)
    return
  }
  for (const op of ops) {
    await op
  }
}
