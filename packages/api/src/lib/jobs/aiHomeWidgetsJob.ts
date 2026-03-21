import { db } from "@puckhub/db"
import { generateAllEnabledWidgets } from "../../services/aiHomeWidgetService"
import type { Job } from "../scheduler"

const DEFAULT_CRON = "30 5 * * *" // daily at 05:30

export function createAiHomeWidgetsJob(): Job {
  const enabled = !!process.env.OPENROUTER_API_KEY
  const cronExpression = process.env.AI_WIDGETS_CRON || DEFAULT_CRON

  return {
    name: "ai-home-widgets",
    cronExpression,
    enabled,
    handler: async ({ manual }) => {
      console.log(`[ai-home-widgets] Starting widget generation for all eligible orgs...${manual ? " (forced)" : ""}`)

      // Find all orgs with AI enabled + at least one widget toggle on
      const orgs = await db.organization.findMany({
        where: {
          aiEnabled: true,
          OR: [{ aiWidgetLeaguePulse: true }, { aiWidgetHeadlinesTicker: true }],
        },
        select: { id: true },
      })

      console.log(`[ai-home-widgets] Found ${orgs.length} eligible orgs`)

      for (const org of orgs) {
        try {
          await generateAllEnabledWidgets(db, org.id, { force: manual })
        } catch (err) {
          console.error(`[ai-home-widgets] Failed for org ${org.id}:`, err)
        }
      }

      console.log("[ai-home-widgets] Widget generation complete")
    },
  }
}
