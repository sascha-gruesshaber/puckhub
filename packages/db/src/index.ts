import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
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
  const adapter = new PrismaPg({ connectionString })
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
