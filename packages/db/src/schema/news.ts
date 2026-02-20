import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { newsStatusEnum } from "./enums"
import { organization } from "./organization"

export const news = pgTable(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    shortText: text("short_text"),
    content: text("content").notNull(),
    status: newsStatusEnum("status").notNull().default("draft"),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledPublishAt: timestamp("scheduled_publish_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("news_org_id_idx").on(t.organizationId)],
)
