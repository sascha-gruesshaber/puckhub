import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { positionEnum } from "./enums"
import { organization } from "./organization"
import { games } from "./games"
import { players } from "./players"
import { teams } from "./teams"

export const gameLineups = pgTable(
  "game_lineups",
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
    position: positionEnum("position").notNull(),
    jerseyNumber: integer("jersey_number"),
    isStartingGoalie: boolean("is_starting_goalie").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.gameId, t.playerId),
    index("game_lineups_game_id_idx").on(t.gameId),
    index("game_lineups_org_id_idx").on(t.organizationId),
  ],
)
