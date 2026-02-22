import { createPrismaClientWithUrl, type PrismaClient } from "@puckhub/db"
import { appRouter } from "../trpc"
import type { Context } from "../trpc/context"

let testDb: PrismaClient | null = null

/**
 * Initializes a test DB connection for the current test.
 * Called by beforeEach in setup.ts after creating a per-test database.
 */
export function initTestDb(url: string) {
  testDb = createPrismaClientWithUrl(url)
}

/**
 * Returns the current per-test Prisma DB instance.
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
  if (testDb) {
    await testDb.$disconnect()
    testDb = null
  }
}

// --- Test org constants ---
export const TEST_ORG_ID = "test-org-id"
export const TEST_ORG_NAME = "Test League"

// --- Second org constants (for cross-org tests) ---
export const OTHER_ORG_ID = "other-org-id"
export const OTHER_ORG_NAME = "Other League"

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

const testPlatformAdminUser = {
  id: "test-platform-admin-id",
  email: "platform@test.local",
  name: "Platform Admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
  role: "admin",
}

const testPlatformAdminSession = {
  id: "test-platform-admin-session-id",
  userId: "test-platform-admin-id",
  expiresAt: new Date(Date.now() + 86400000),
  token: "test-platform-admin-token",
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: null,
  activeOrganizationId: null as string | null,
}

const testOtherAdminUser = {
  id: "other-admin-id",
  email: "other-admin@test.local",
  name: "Other Admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
  role: null,
}

const testOtherAdminSession = {
  id: "test-other-admin-session-id",
  userId: "other-admin-id",
  expiresAt: new Date(Date.now() + 86400000),
  token: "test-other-admin-token",
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: null,
  activeOrganizationId: OTHER_ORG_ID,
}

/**
 * Seeds the test organization + member records into the database.
 * Must be called AFTER initTestDb() but BEFORE createTestCaller() when
 * the template DB does not already contain the org data.
 *
 * Returns the org id for convenience.
 */
export async function seedTestOrg(db?: PrismaClient) {
  const d = db ?? getTestDb()

  await d.organization.create({
    data: {
      id: TEST_ORG_ID,
      name: TEST_ORG_NAME,
    },
  })

  // Admin user is member (role field ignored — auth comes from MemberRole)
  await d.member.create({
    data: {
      id: "test-admin-member-id",
      userId: "test-admin-id",
      organizationId: TEST_ORG_ID,
      role: "member",
    },
  })

  // Admin gets "owner" MemberRole
  await d.memberRole.create({
    data: {
      memberId: "test-admin-member-id",
      role: "owner",
    },
  })

  // Regular user is member (no MemberRole entries)
  await d.member.create({
    data: {
      id: "test-user-member-id",
      userId: "test-user-id",
      organizationId: TEST_ORG_ID,
      role: "member",
    },
  })

  return TEST_ORG_ID
}

/**
 * Seeds a second organization with its own owner for cross-org testing.
 * Returns the org ID.
 */
export async function seedSecondOrg(db?: PrismaClient) {
  const d = db ?? getTestDb()

  await d.organization.create({
    data: {
      id: OTHER_ORG_ID,
      name: OTHER_ORG_NAME,
    },
  })

  // Other admin user is member of the second org
  await d.member.create({
    data: {
      id: "other-admin-member-id",
      userId: "other-admin-id",
      organizationId: OTHER_ORG_ID,
      role: "member",
    },
  })

  // Other admin gets "owner" MemberRole
  await d.memberRole.create({
    data: {
      memberId: "other-admin-member-id",
      role: "owner",
    },
  })

  return OTHER_ORG_ID
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

/**
 * Creates a caller authenticated as a platform admin (user.role = "admin").
 * Optionally set activeOrganizationId to test platform admin accessing specific orgs.
 */
export function createPlatformAdminCaller(activeOrgId?: string | null): ReturnType<typeof appRouter.createCaller> {
  const db = getTestDb()
  const sessionData = { ...testPlatformAdminSession, activeOrganizationId: activeOrgId ?? null }

  const session = { session: sessionData, user: testPlatformAdminUser } as unknown as Context["session"]
  const user = testPlatformAdminUser as unknown as NonNullable<Context["user"]>
  const activeOrganizationId = activeOrgId ?? null

  const ctx: Context = { db, session, user, activeOrganizationId }
  return appRouter.createCaller(ctx)
}

/**
 * Creates a caller authenticated as the other org's admin (owner of OTHER_ORG_ID).
 * seedSecondOrg() must be called first.
 */
export function createOtherOrgAdminCaller(): ReturnType<typeof appRouter.createCaller> {
  const db = getTestDb()

  const session = { session: testOtherAdminSession, user: testOtherAdminUser } as unknown as Context["session"]
  const user = testOtherAdminUser as unknown as NonNullable<Context["user"]>
  const activeOrganizationId = OTHER_ORG_ID

  const ctx: Context = { db, session, user, activeOrganizationId }
  return appRouter.createCaller(ctx)
}

/**
 * Creates a caller authenticated as the other org's admin but with activeOrganizationId
 * set to TEST_ORG_ID — for testing cross-org rejection (accessing org A's data from org B's user).
 * seedSecondOrg() must be called first.
 */
export function createCrossOrgCaller(): ReturnType<typeof appRouter.createCaller> {
  const db = getTestDb()

  const crossSession = { ...testOtherAdminSession, activeOrganizationId: TEST_ORG_ID }
  const session = { session: crossSession, user: testOtherAdminUser } as unknown as Context["session"]
  const user = testOtherAdminUser as unknown as NonNullable<Context["user"]>
  const activeOrganizationId = TEST_ORG_ID

  const ctx: Context = { db, session, user, activeOrganizationId }
  return appRouter.createCaller(ctx)
}
