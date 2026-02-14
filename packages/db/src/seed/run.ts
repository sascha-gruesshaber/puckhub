import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const seedDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(seedDir, "../../../../.env") })

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../schema"
import { runSeed } from "./index"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const client = postgres(connectionString)
const db = drizzle(client, { schema })

runSeed(db)
  .then(() => client.end())
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
