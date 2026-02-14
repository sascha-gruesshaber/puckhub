import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { roleEnum } from "./enums"
import { teams } from "./teams"

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  role: roleEnum("role").notNull(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
