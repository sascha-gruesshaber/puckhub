import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    seasonStart: timestamp("season_start", { withTimezone: true }).notNull(),
    seasonEnd: timestamp("season_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("seasons_org_id_idx").on(t.organizationId)],
)
