import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { players } from "./players"
import { seasons } from "./seasons"
import { teams } from "./teams"

export const playerSeasonStats = pgTable("player_season_stats", {
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
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  penaltyMinutes: integer("penalty_minutes").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
