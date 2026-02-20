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

// --- Test org constants ---
export const TEST_ORG_ID = "test-org-id"
export const TEST_ORG_NAME = "Test League"
export const TEST_ORG_SLUG = "test-league"

const testAdminUser = {
  id: "test-admin-id",
  email: "admin@test.local",
  name: "Test Admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
  role: null,
}

const testAdminSession = {
  id: "test-session-id",
  userId: "test-admin-id",
  expiresAt: new Date(Date.now() + 86400000),
  token: "test-token",
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: null,
  activeOrganizationId: TEST_ORG_ID,
}

const testRegularUser = {
  id: "test-user-id",
  email: "user@test.local",
  name: "Test User",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
  role: null,
}

const testRegularSession = {
  id: "test-user-session-id",
  userId: "test-user-id",
  expiresAt: new Date(Date.now() + 86400000),
  token: "test-user-token",
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: null,
  activeOrganizationId: TEST_ORG_ID,
}

/**
 * Seeds the test organization + member records into the database.
 * Must be called AFTER initTestDb() but BEFORE createTestCaller() when
 * the template DB does not already contain the org data.
 *
 * Returns the org id for convenience.
 */
export async function seedTestOrg(db?: ReturnType<typeof getTestDb>) {
  const d = db ?? getTestDb()

  await d.insert(schema.organization).values({
    id: TEST_ORG_ID,
    name: TEST_ORG_NAME,
    slug: TEST_ORG_SLUG,
  })

  // Admin user is "owner" of the org
  await d.insert(schema.member).values({
    id: "test-admin-member-id",
    userId: "test-admin-id",
    organizationId: TEST_ORG_ID,
    role: "owner",
  })

  // Regular user is "member" of the org
  await d.insert(schema.member).values({
    id: "test-user-member-id",
    userId: "test-user-id",
    organizationId: TEST_ORG_ID,
    role: "member",
  })

  return TEST_ORG_ID
}

/**
 * Creates a tRPC caller that talks to the real test database.
 * By default creates an unauthenticated (public) caller.
 * Pass `asAdmin: true` to simulate an authenticated admin user (org owner).
 * Pass `asUser: true` to simulate an authenticated non-admin user (org member).
 */
export function createTestCaller(opts?: {
  asAdmin?: boolean
  asUser?: boolean
}): ReturnType<typeof appRouter.createCaller> {
  const db = getTestDb()

  let session: Context["session"] = null
  let user: Context["user"] = null
  let activeOrganizationId: Context["activeOrganizationId"] = null

  if (opts?.asAdmin) {
    session = { session: testAdminSession, user: testAdminUser } as unknown as Context["session"]
    user = testAdminUser as unknown as NonNullable<Context["user"]>
    activeOrganizationId = TEST_ORG_ID
  } else if (opts?.asUser) {
    session = { session: testRegularSession, user: testRegularUser } as unknown as Context["session"]
    user = testRegularUser as unknown as NonNullable<Context["user"]>
    activeOrganizationId = TEST_ORG_ID
  }

  const ctx: Context = { db, session, user, activeOrganizationId }

  return appRouter.createCaller(ctx)
}
