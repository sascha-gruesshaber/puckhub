import { db } from "@puckhub/db"
import type { Job } from "../scheduler"

const DEFAULT_CRON = "* * * * *" // every minute

/**
 * Promotes scheduled news articles to "published" once their publish time has
 * passed. Previously the public news list ran this UPDATE on every read.
 */
export function createNewsAutoPublishJob(): Job {
  return {
    name: "news-auto-publish",
    cronExpression: process.env.NEWS_AUTO_PUBLISH_CRON || DEFAULT_CRON,
    enabled: true,
    handler: async () => {
      const now = new Date()
      const promoted = await db.news.updateMany({
        where: { status: "draft", scheduledPublishAt: { lte: now } },
        data: { status: "published", publishedAt: now, scheduledPublishAt: null, updatedAt: now },
      })
      if (promoted.count > 0) {
        console.log(`[news-auto-publish] Published ${promoted.count} scheduled article(s)`)
      }
    },
  }
}
