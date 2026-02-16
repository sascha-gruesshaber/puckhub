import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { divisions } from "./divisions"
import { teams } from "./teams"

export const teamDivisions = pgTable(
  "team_divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("team_divisions_team_id_idx").on(t.teamId), index("team_divisions_division_id_idx").on(t.divisionId)],
)
