import { db } from "@puckhub/db"
import { DEMO_ORG_ID, seedDemoOrg } from "@puckhub/db/seed/demoSeed"
import type { Job } from "../scheduler"

const DEFAULT_CRON = "0 */4 * * *" // every 4 hours

export function createDemoResetJob(): Job {
  const enabled = process.env.DEMO_MODE === "true"
  const cronExpression = process.env.DEMO_RESET_CRON || DEFAULT_CRON

  return {
    name: "demo-reset",
    cronExpression,
    enabled,
    handler: async () => {
      console.log(`[demo-reset] Resetting demo org "${DEMO_ORG_ID}"...`)
      await seedDemoOrg(db)
      console.log(`[demo-reset] Demo org reset complete`)
    },
  }
}
