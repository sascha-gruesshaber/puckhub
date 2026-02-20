import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { rounds } from "./rounds"
import { teams } from "./teams"

export const standings = pgTable(
  "standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    goalDifference: integer("goal_difference").notNull().default(0),
    points: integer("points").notNull().default(0),
    bonusPoints: integer("bonus_points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    rank: integer("rank"),
    previousRank: integer("previous_rank"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("standings_round_id_idx").on(t.roundId), index("standings_org_id_idx").on(t.organizationId)],
)
