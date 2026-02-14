import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { teams } from "./teams"
import { trikots } from "./trikots"

export const teamTrikots = pgTable(
  "team_trikots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    trikotId: uuid("trikot_id")
      .notNull()
      .references(() => trikots.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.teamId, t.trikotId, t.name)],
)
