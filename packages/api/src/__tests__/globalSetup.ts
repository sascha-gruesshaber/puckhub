import { execSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(__dirname, "../../../../")

const TEMPLATE_DB = "puckhub_test_template"

/**
 * Replaces the database name in a postgres URL.
 */
function replaceDbName(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

/**
 * Global test setup.
 *
 * Strategy:
 * 1. Start a Testcontainers Postgres (or use existing DATABASE_URL)
 * 2. Create a template DB with schema + admin seed
 * 3. Workers clone the template per-test via CREATE DATABASE ... TEMPLATE
 */
export default async function globalSetup() {
  let teardown: (() => Promise<void>) | undefined
  let baseUrl: string

  if (!process.env.DATABASE_URL) {
    const { PostgreSqlContainer } = await import("@testcontainers/postgresql")
    const container = await new PostgreSqlContainer("postgres:16-alpine").start()
    baseUrl = container.getConnectionUri()
    teardown = async () => {
      await container.stop()
    }
  } else {
    baseUrl = process.env.DATABASE_URL
  }

  // baseUrl points to a DB (e.g. "test" or "postgres"). We need the maintenance DB
  // to create/drop template + test databases.
  const maintenanceUrl = replaceDbName(baseUrl, "postgres")
  const templateUrl = replaceDbName(baseUrl, TEMPLATE_DB)

  // Connect to maintenance DB to manage template
  const postgres = (await import("postgres")).default
  const maintenanceSql = postgres(maintenanceUrl, { max: 1 })

  try {
    // Drop stale template if it exists
    await maintenanceSql.unsafe(`DROP DATABASE IF EXISTS ${TEMPLATE_DB} WITH (FORCE)`)

    // Create template DB
    await maintenanceSql.unsafe(`CREATE DATABASE ${TEMPLATE_DB}`)

    // Push schema to template DB using prisma db push
    const dbPkgDir = resolve(monorepoRoot, "packages/db")
    execSync("npx prisma db push --accept-data-loss", {
      cwd: dbPkgDir,
      env: { ...process.env, DATABASE_URL: templateUrl },
      stdio: "pipe",
    })

    // Seed template with admin user + role using Prisma
    const { createPrismaClientWithUrl } = await import("@puckhub/db")
    const db = createPrismaClientWithUrl(templateUrl)

    await db.user.create({
      data: {
        id: "test-admin-id",
        name: "Test Admin",
        email: "admin@test.local",
        emailVerified: true,
      },
    })

    // Seed a regular (non-admin) user for protectedProcedure tests
    await db.user.create({
      data: {
        id: "test-user-id",
        name: "Test User",
        email: "user@test.local",
        emailVerified: true,
      },
    })

    // Seed a platform admin user (user.role = "admin")
    await db.user.create({
      data: {
        id: "test-platform-admin-id",
        name: "Platform Admin",
        email: "platform@test.local",
        emailVerified: true,
        role: "admin",
      },
    })

    // Seed a second org owner user (for cross-org tests)
    await db.user.create({
      data: {
        id: "other-admin-id",
        name: "Other Admin",
        email: "other-admin@test.local",
        emailVerified: true,
      },
    })

    // Seed test organization + member records
    await db.organization.create({
      data: {
        id: "test-org-id",
        name: "Test League",
      },
    })

    // Admin user is org member (role field kept as "member" — ignored for auth)
    await db.member.create({
      data: {
        id: "test-admin-member-id",
        userId: "test-admin-id",
        organizationId: "test-org-id",
        role: "member",
      },
    })

    // Admin gets "owner" MemberRole
    await db.memberRole.create({
      data: {
        memberId: "test-admin-member-id",
        role: "owner",
      },
    })

    // Regular user is org member (no MemberRole entries = no permissions)
    await db.member.create({
      data: {
        id: "test-user-member-id",
        userId: "test-user-id",
        organizationId: "test-org-id",
        role: "member",
      },
    })

    await db.$disconnect()
  } finally {
    await maintenanceSql.end()
  }

  // Set env vars for workers
  process.env.TEST_DB_BASE_URL = maintenanceUrl
  process.env.TEST_DB_TEMPLATE = TEMPLATE_DB
  // Workers need DATABASE_URL set to something valid so @puckhub/db module loads
  process.env.DATABASE_URL = templateUrl

  return async () => {
    // Cleanup: drop all puckhub_test_* databases
    const cleanupSql = postgres(maintenanceUrl, { max: 1 })
    try {
      const dbs = await cleanupSql`
        SELECT datname FROM pg_database
        WHERE datname LIKE 'puckhub_test_%'
      `
      for (const row of dbs) {
        await cleanupSql.unsafe(`DROP DATABASE IF EXISTS ${row.datname} WITH (FORCE)`)
      }
    } finally {
      await cleanupSql.end()
    }
    await teardown?.()
  }
}
