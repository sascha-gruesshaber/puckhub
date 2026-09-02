import { PrismaPg } from "@prisma/adapter-pg"
import type { PoolConfig } from "pg"
import { PrismaClient } from "./generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    console.warn(`[db] Ignoring ${name}="${raw}" (expected a positive integer), using ${fallback}`)
    return fallback
  }
  return value
}

/**
 * pg pool settings shared by every client this package creates.
 *
 * - `max` (DB_POOL_MAX, default 10): connections per process. Keep
 *   `max * processes` well below the server's `max_connections`.
 * - `statement_timeout` (DB_STATEMENT_TIMEOUT_MS, default 30 s): server-side
 *   cap per statement, so a runaway query cannot pin a connection forever.
 * - `connectionTimeoutMillis`: fail fast when the database is unreachable
 *   instead of queueing requests indefinitely.
 * - `application_name` (DB_APPLICATION_NAME, default "puckhub-api"): shows up
 *   in `pg_stat_activity` so connections can be attributed to this service.
 */
function poolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: intFromEnv("DB_POOL_MAX", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: intFromEnv("DB_STATEMENT_TIMEOUT_MS", 30_000),
    application_name: process.env.DB_APPLICATION_NAME || "puckhub-api",
  }
}

// Without these handlers an idle-connection error is an unhandled 'error'
// event on the pool and crashes the process.
const adapterOptions = {
  onPoolError: (err: Error) => {
    console.error("[db] Pool error:", err)
  },
  onConnectionError: (err: Error) => {
    console.error("[db] Connection error:", err)
  },
}

function createClient() {
  const adapter = new PrismaPg(poolConfig(process.env.DATABASE_URL!), adapterOptions)
  return new PrismaClient({ adapter })
}

function getOrCreateDb(): PrismaClient {
  // The client must be cached in every environment, production included: the
  // `db` proxy below calls this on every property access, so an uncached
  // client opens a fresh pg pool per `db.<model>` access and exhausts the
  // database's connection slots ("too many clients already").
  const existing = globalForPrisma.prisma
  if (existing) {
    return existing
  }

  const client = createClient()
  globalForPrisma.prisma = client
  return client
}

/** Creates a PrismaClient connected to a specific database URL. Used by seeds and tests. */
export function createPrismaClientWithUrl(connectionString: string): PrismaClient {
  const adapter = new PrismaPg(poolConfig(connectionString), adapterOptions)
  return new PrismaClient({ adapter })
}

/**
 * Disconnects and clears the package-global Prisma client.
 * Tests use this to rebind the lazy `db` proxy to a per-test database URL.
 */
export async function resetDbClient() {
  if (!globalForPrisma.prisma) {
    return
  }

  await globalForPrisma.prisma.$disconnect()
  delete globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateDb()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
}) as PrismaClient

export type Database = PrismaClient
export type { Prisma } from "./generated/prisma/client"
export * from "./generated/prisma/enums"
export { runMigrations } from "./migrate"
export { runSeed } from "./seed/index"
export { PrismaClient }
