import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { divisions } from "./divisions"
import { roundTypeEnum } from "./enums"

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  divisionId: uuid("division_id")
    .notNull()
    .references(() => divisions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  roundType: roundTypeEnum("round_type").notNull().default("regular"),
  sortOrder: integer("sort_order").notNull().default(0),
  pointsWin: integer("points_win").notNull().default(2),
  pointsDraw: integer("points_draw").notNull().default(1),
  pointsLoss: integer("points_loss").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
