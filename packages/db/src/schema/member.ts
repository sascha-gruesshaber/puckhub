import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { user } from "./auth"

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
