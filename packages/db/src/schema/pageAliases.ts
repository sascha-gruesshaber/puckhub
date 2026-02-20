import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { pages } from "./pages"

export const pageAliases = pgTable(
  "page_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    targetPageId: uuid("target_page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("page_aliases_org_id_idx").on(t.organizationId)],
)
