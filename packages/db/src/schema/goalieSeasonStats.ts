import { integer, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { players } from "./players"
import { seasons } from "./seasons"
import { teams } from "./teams"

export const goalieSeasonStats = pgTable("goalie_season_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  gamesPlayed: integer("games_played").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  gaa: numeric("gaa", { precision: 5, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
