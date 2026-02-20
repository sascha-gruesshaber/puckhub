import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: "cascade" }),
    leagueName: text("league_name").notNull(),
    leagueShortName: text("league_short_name").notNull(),
    locale: text("locale").notNull().default("de-DE"),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    pointsWin: integer("points_win").notNull().default(2),
    pointsDraw: integer("points_draw").notNull().default(1),
    pointsLoss: integer("points_loss").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("system_settings_org_id_idx").on(t.organizationId)],
)
