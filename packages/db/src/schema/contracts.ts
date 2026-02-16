import { index, integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { positionEnum } from "./enums"
import { players } from "./players"
import { seasons } from "./seasons"
import { teams } from "./teams"

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    position: positionEnum("position").notNull(),
    jerseyNumber: integer("jersey_number"),
    startSeasonId: uuid("start_season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    endSeasonId: uuid("end_season_id").references(() => seasons.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.playerId, t.teamId, t.startSeasonId),
    index("contracts_player_id_idx").on(t.playerId),
    index("contracts_team_id_idx").on(t.teamId),
    index("contracts_start_season_id_idx").on(t.startSeasonId),
  ],
)
