import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { user } from "./auth"

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text("role"),
  inviterId: text("inviterId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
})
