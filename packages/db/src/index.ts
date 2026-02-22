import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}

export type Database = PrismaClient
export { PrismaClient }
export type { Prisma } from "@prisma/client"
export { runMigrations } from "./migrate"
export { runSeed } from "./seed/index"
