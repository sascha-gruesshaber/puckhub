import { index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { players } from "./players"
import { seasons } from "./seasons"
import { teams } from "./teams"

export const goalieSeasonStats = pgTable(
  "goalie_season_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
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
  },
  (t) => [index("goalie_season_stats_org_id_idx").on(t.organizationId)],
)
