import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const penaltyTypes = pgTable("penalty_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  defaultMinutes: integer("default_minutes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
