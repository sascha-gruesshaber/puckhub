import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { pages } from "./pages"

export const pageAliases = pgTable("page_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  targetPageId: uuid("target_page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
