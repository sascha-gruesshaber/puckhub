import { db } from "@puckhub/db"
import { DEMO_ORG_ID } from "@puckhub/db/seed/demoSeed"
import { createBackup, enforceRetention, shouldRunBackup } from "../../services/backupService"
import { getOrgPlan } from "../../services/planLimits"
import { isS3Configured } from "../s3"
import type { Job } from "../scheduler"

const DEFAULT_CRON = "0 2 * * *" // daily at 02:00

export function createBackupJob(): Job {
  const cronExpression = process.env.BACKUP_CRON || DEFAULT_CRON

  return {
    name: "backup",
    cronExpression,
    enabled: isS3Configured(),
    handler: async (_ctx) => {
      console.log("[backup] Starting automated backup run...")

      const orgs = await db.organization.findMany({ select: { id: true } })
      const eligibleOrgs = orgs.filter((o) => o.id !== DEMO_ORG_ID)
      console.log(`[backup] Found ${eligibleOrgs.length} eligible org(s) (${orgs.length} total, excluding demo)`)

      let backed = 0
      let skipped = 0
      let failed = 0

      for (const org of eligibleOrgs) {
        try {
          const plan = await getOrgPlan(db, org.id)
          const frequencyDays = plan?.backupFrequencyDays ?? 7
          const maxBackups = plan?.maxBackups ?? 1

          const due = await shouldRunBackup(db, org.id, frequencyDays)
          if (!due) {
            skipped++
            continue
          }

          await createBackup(db, org.id)
          await enforceRetention(db, org.id, maxBackups)
          backed++
        } catch (err) {
          failed++
          console.error(`[backup] Failed for org ${org.id}:`, err)
        }
      }

      console.log(`[backup] Complete — backed up ${backed}, skipped ${skipped}, failed ${failed}`)
    },
  }
}
