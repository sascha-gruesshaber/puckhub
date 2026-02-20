import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { games } from "./games"
import { organization } from "./organization"
import { players } from "./players"
import { teams } from "./teams"

export const goalieGameStats = pgTable(
  "goalie_game_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    goalsAgainst: integer("goals_against").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goalie_game_stats_org_id_idx").on(t.organizationId)],
)
