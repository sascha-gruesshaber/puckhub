import { sql } from "drizzle-orm"
import { check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const systemSettings = pgTable(
  "system_settings",
  {
    id: integer("id").primaryKey().default(1),
    leagueName: text("league_name").notNull(),
    leagueShortName: text("league_short_name").notNull(),
    locale: text("locale").notNull().default("de-DE"),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    pointsWin: integer("points_win").notNull().default(2),
    pointsDraw: integer("points_draw").notNull().default(1),
    pointsLoss: integer("points_loss").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("singleton_row", sql`${table.id} = 1`)],
)
