import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import type { Database } from "./index"

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../drizzle")

/**
 * Run all pending Drizzle migrations.
 * Drizzle tracks applied migrations in a journal table, so this is idempotent.
 */
export async function runMigrations(db: Database) {
  console.log("Running migrations...")
  await migrate(db, { migrationsFolder })
  console.log("Migrations complete.")
}
