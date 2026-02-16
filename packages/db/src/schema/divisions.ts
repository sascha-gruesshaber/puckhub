import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { seasons } from "./seasons"

export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    goalieMinGames: integer("goalie_min_games").notNull().default(7),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("divisions_season_id_idx").on(t.seasonId)],
)
