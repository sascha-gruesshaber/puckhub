import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { gameStatusEnum } from "./enums"
import { rounds } from "./rounds"
import { teams } from "./teams"
import { venues } from "./venues"

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  roundId: uuid("round_id")
    .notNull()
    .references(() => rounds.id, { onDelete: "cascade" }),
  homeTeamId: uuid("home_team_id")
    .notNull()
    .references(() => teams.id),
  awayTeamId: uuid("away_team_id")
    .notNull()
    .references(() => teams.id),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: gameStatusEnum("status").notNull().default("scheduled"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  gameNumber: integer("game_number"),
  notes: text("notes"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
