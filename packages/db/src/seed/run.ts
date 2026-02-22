import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const seedDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(seedDir, "../../../../.env") })

import { PrismaClient } from "@prisma/client"
import { runSeed } from "./index"

const db = new PrismaClient()

runSeed(db)
  .then(() => db.$disconnect())
  .catch((err) => {
    console.error("Seed failed:", err)
    db.$disconnect()
    process.exit(1)
  })
