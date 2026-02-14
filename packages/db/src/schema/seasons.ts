import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  seasonStart: timestamp("season_start", { withTimezone: true }).notNull(),
  seasonEnd: timestamp("season_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
