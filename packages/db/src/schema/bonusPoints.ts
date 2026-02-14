import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { rounds } from "./rounds"
import { teams } from "./teams"

export const bonusPoints = pgTable("bonus_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  roundId: uuid("round_id")
    .notNull()
    .references(() => rounds.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
