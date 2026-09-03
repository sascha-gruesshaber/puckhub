import { execSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const dbPkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Run all pending Prisma migrations.
 * Uses `prisma migrate deploy` which is idempotent.
 */
export async function runMigrations() {
  console.log("Running Prisma migrations...")
  execSync("npx prisma migrate deploy", {
    cwd: dbPkgDir,
    env: { ...process.env },
    stdio: "inherit",
  })
  console.log("Migrations complete.")
}
