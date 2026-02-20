/**
 * Data migration script: Single-tenant → Multi-tenant
 *
 * This script:
 * 1. Creates a default organization from existing system_settings
 * 2. Sets organizationId on ALL existing rows across all tenant-scoped tables
 * 3. Creates a member record (owner) for the first admin user
 * 4. Sets the platform admin role on that user
 *
 * Run this AFTER the schema migration adds organizationId columns (as nullable),
 * then run a second migration to make them NOT NULL.
 *
 * Usage: npx tsx packages/db/src/seed/migrateToMultiTenant.ts
 */
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const seedDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(seedDir, "../../../../.env") })

import { eq, isNull, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../schema"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const client = postgres(DATABASE_URL)
const db = drizzle(client, { schema })

async function migrate() {
  console.log("Starting multi-tenant migration...")

  const DEFAULT_ORG_ID = "default-org"
  const DEFAULT_SLUG = "default"

  // 1. Check if organization already exists
  const existingOrg = await db.query.organization.findFirst({
    where: eq(schema.organization.id, DEFAULT_ORG_ID),
  })

  if (existingOrg) {
    console.log("Default organization already exists, skipping org creation.")
  } else {
    // Try to get league name from existing settings
    const settings = await db.query.systemSettings.findFirst()
    const orgName = settings?.leagueName ?? "Default Organization"

    console.log(`Creating default organization: "${orgName}"`)
    await db.insert(schema.organization).values({
      id: DEFAULT_ORG_ID,
      name: orgName,
      slug: DEFAULT_SLUG,
    })
  }

  // 2. Find the first user (admin) and create membership
  const firstUser = await db.query.user.findFirst({
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  })

  if (firstUser) {
    // Check if member record exists
    const existingMember = await db.query.member.findFirst({
      where: eq(schema.member.userId, firstUser.id),
    })

    if (!existingMember) {
      console.log(`Creating owner membership for user: ${firstUser.email}`)
      await db.insert(schema.member).values({
        id: crypto.randomUUID(),
        userId: firstUser.id,
        organizationId: DEFAULT_ORG_ID,
        role: "owner",
      })
    }

    // Set platform admin role
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.id, firstUser.id))

    console.log(`Set platform admin role for: ${firstUser.email}`)
  }

  // 3. Update system_settings
  const existingSettings = await db.query.systemSettings.findFirst()
  if (existingSettings && !(existingSettings as any).organizationId) {
    console.log("Updating system_settings with organizationId...")
    await db
      .update(schema.systemSettings)
      .set({ organizationId: DEFAULT_ORG_ID })
      .where(eq(schema.systemSettings.id, existingSettings.id))
  }

  // 4. Set organizationId on all tenant-scoped tables
  const tablesToUpdate = [
    { table: schema.seasons, name: "seasons" },
    { table: schema.teams, name: "teams" },
    { table: schema.players, name: "players" },
    { table: schema.venues, name: "venues" },
    { table: schema.news, name: "news" },
    { table: schema.pages, name: "pages" },
    { table: schema.sponsors, name: "sponsors" },
    { table: schema.documents, name: "documents" },
    { table: schema.trikots, name: "trikots" },
    { table: schema.divisions, name: "divisions" },
    { table: schema.contracts, name: "contracts" },
    { table: schema.teamTrikots, name: "teamTrikots" },
    { table: schema.pageAliases, name: "pageAliases" },
    { table: schema.rounds, name: "rounds" },
    { table: schema.teamDivisions, name: "teamDivisions" },
    { table: schema.games, name: "games" },
    { table: schema.standings, name: "standings" },
    { table: schema.bonusPoints, name: "bonusPoints" },
    { table: schema.gameEvents, name: "gameEvents" },
    { table: schema.gameLineups, name: "gameLineups" },
    { table: schema.gameSuspensions, name: "gameSuspensions" },
    { table: schema.goalieGameStats, name: "goalieGameStats" },
    { table: schema.playerSeasonStats, name: "playerSeasonStats" },
    { table: schema.goalieSeasonStats, name: "goalieSeasonStats" },
  ] as const

  for (const { table, name } of tablesToUpdate) {
    const result = await db
      .update(table as any)
      .set({ organizationId: DEFAULT_ORG_ID } as any)
      .where(isNull((table as any).organizationId))

    console.log(`Updated ${name}`)
  }

  console.log("\nMulti-tenant migration complete!")
  console.log(`Default organization ID: ${DEFAULT_ORG_ID}`)
  console.log(`Default organization slug: ${DEFAULT_SLUG}`)

  await client.end()
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
