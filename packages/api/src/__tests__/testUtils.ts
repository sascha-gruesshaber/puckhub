import * as schema from "@puckhub/db/schema"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { appRouter } from "../trpc"
import type { Context } from "../trpc/context"

let client: ReturnType<typeof postgres> | null = null
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null

/**
 * Initializes a test DB connection for the current test.
 * Called by beforeEach in setup.ts after creating a per-test database.
 */
export function initTestDb(url: string) {
  client = postgres(url)
  testDb = drizzle(client, { schema })
}

/**
 * Returns the current per-test Drizzle DB instance.
 */
export function getTestDb() {
  if (!testDb) {
    throw new Error("Test DB not initialized — did beforeEach run?")
  }
  return testDb
}

/**
 * Closes the per-test DB connection. Called in afterEach.
 */
export async function closeTestDb() {
  if (client) {
    await client.end()
    client = null
    testDb = null
  }
}

const testUser = {
  id: "test-admin-id",
  email: "admin@test.local",
  name: "Test Admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
}

const testSession = {
  id: "test-session-id",
  userId: "test-admin-id",
  expiresAt: new Date(Date.now() + 86400000),
  token: "test-token",
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: null,
}

/**
 * Creates a tRPC caller that talks to the real test database.
 * By default creates an unauthenticated (public) caller.
 * Pass `asAdmin: true` to simulate an authenticated admin user.
 */
export function createTestCaller(opts?: { asAdmin?: boolean }): ReturnType<typeof appRouter.createCaller> {
  const db = getTestDb()

  const ctx: Context = {
    db,
    session: opts?.asAdmin ? ({ session: testSession, user: testUser } as unknown as Context["session"]) : null,
    user: opts?.asAdmin ? (testUser as unknown as NonNullable<Context["user"]>) : null,
  }

  return appRouter.createCaller(ctx)
}
