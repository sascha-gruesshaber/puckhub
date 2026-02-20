import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { gameEvents } from "./gameEvents"
import { games } from "./games"
import { organization } from "./organization"
import { players } from "./players"
import { teams } from "./teams"

export const gameSuspensions = pgTable(
  "game_suspensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    gameEventId: uuid("game_event_id").references(() => gameEvents.id, { onDelete: "set null" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    suspensionType: text("suspension_type").notNull(),
    suspendedGames: integer("suspended_games").notNull().default(1),
    servedGames: integer("served_games").notNull().default(0),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("game_suspensions_game_id_idx").on(t.gameId),
    index("game_suspensions_team_id_idx").on(t.teamId),
    index("game_suspensions_org_id_idx").on(t.organizationId),
  ],
)
