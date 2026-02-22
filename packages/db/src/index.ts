import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}

/** Creates a PrismaClient connected to a specific database URL. Used by seeds and tests. */
export function createPrismaClientWithUrl(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export type Database = PrismaClient
export { PrismaClient }
export type { Prisma } from "./generated/prisma/client"
export * from "./generated/prisma/enums"
export { runMigrations } from "./migrate"
export { runSeed } from "./seed/index"
