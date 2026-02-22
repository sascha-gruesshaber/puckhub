import { dirname, resolve } from "node:path"
import * as readline from "node:readline"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const seedDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(seedDir, "../../../../.env") })

import { PrismaClient } from "@prisma/client"

async function reset() {
  const force = process.argv.includes("--force")

  if (!force) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>((resolve) => {
      rl.question("This will TRUNCATE ALL TABLES. All data will be lost.\n   Continue? (y/N) ", resolve)
    })
    rl.close()
    if (answer.toLowerCase() !== "y") {
      console.log("Aborted.")
      process.exit(0)
    }
  }

  const db = new PrismaClient()

  console.log("Truncating all tables...")
  await db.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      SET client_min_messages TO WARNING;
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
      ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `)

  await db.$disconnect()
  console.log("All tables truncated.")
}

reset().catch((err) => {
  console.error("Reset failed:", err)
  process.exit(1)
})
