import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const seedDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(seedDir, "../../../../.env") })

import { createPrismaClientWithUrl } from "../index"
import { runSeed } from "./index"

const db = createPrismaClientWithUrl(process.env.DATABASE_URL!)

runSeed(db)
  .then(() => db.$disconnect())
  .catch((err) => {
    console.error("Seed failed:", err)
    db.$disconnect()
    process.exit(1)
  })
