import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { gameEventTypeEnum } from "./enums"
import { organization } from "./organization"
import { games } from "./games"
import { penaltyTypes } from "./penaltyTypes"
import { players } from "./players"
import { teams } from "./teams"

export const gameEvents = pgTable(
  "game_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    eventType: gameEventTypeEnum("event_type").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    period: integer("period").notNull(),
    timeMinutes: integer("time_minutes").notNull(),
    timeSeconds: integer("time_seconds").notNull(),

    // Goal fields
    scorerId: uuid("scorer_id").references(() => players.id, { onDelete: "set null" }),
    assist1Id: uuid("assist1_id").references(() => players.id, { onDelete: "set null" }),
    assist2Id: uuid("assist2_id").references(() => players.id, { onDelete: "set null" }),

    // Goal — goalie scored on
    goalieId: uuid("goalie_id").references(() => players.id, { onDelete: "set null" }),

    // Penalty fields
    penaltyPlayerId: uuid("penalty_player_id").references(() => players.id, { onDelete: "set null" }),
    penaltyTypeId: uuid("penalty_type_id").references(() => penaltyTypes.id, { onDelete: "set null" }),
    penaltyMinutes: integer("penalty_minutes"),
    penaltyDescription: text("penalty_description"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("game_events_game_id_idx").on(t.gameId), index("game_events_org_id_idx").on(t.organizationId)],
)
