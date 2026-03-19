import { db } from "@puckhub/db"
import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import type { Job } from "../scheduler"

const DEFAULT_CRON = "0 3 * * *" // daily at 03:00

export function createStatsRecalcJob(): Job {
  const cronExpression = process.env.STATS_RECALC_CRON || DEFAULT_CRON

  return {
    name: "stats-recalc",
    cronExpression,
    enabled: true,
    handler: async (_ctx) => {
      console.log("[stats-recalc] Starting nightly recalculation for all orgs...")

      const orgs = await db.organization.findMany({ select: { id: true } })
      console.log(`[stats-recalc] Found ${orgs.length} org(s)`)

      let totalRounds = 0
      let totalSeasons = 0

      for (const org of orgs) {
        try {
          // Find all seasons for this org
          const seasons = await db.season.findMany({
            where: { organizationId: org.id },
            select: {
              id: true,
              divisions: {
                select: {
                  rounds: { select: { id: true } },
                },
              },
            },
          })

          // Recalculate standings for every round
          for (const season of seasons) {
            for (const division of season.divisions) {
              for (const round of division.rounds) {
                await recalculateStandings(db, round.id, org.id)
                totalRounds++
              }
            }

            // Recalculate player + goalie stats per season
            await recalculatePlayerStats(db, season.id, org.id)
            await recalculateGoalieStats(db, season.id, org.id)
            totalSeasons++
          }
        } catch (err) {
          console.error(`[stats-recalc] Failed for org ${org.id}:`, err)
        }
      }

      console.log(
        `[stats-recalc] Complete — recalculated ${totalRounds} round(s) standings, ${totalSeasons} season(s) player/goalie stats`,
      )
    },
  }
}
