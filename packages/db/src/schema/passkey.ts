import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const passkey = pgTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("publicKey").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credentialID: text("credentialID").notNull().unique(),
  counter: integer("counter").notNull(),
  deviceType: text("deviceType").notNull(),
  backedUp: boolean("backedUp").notNull(),
  transports: text("transports"),
  aaguid: text("aaguid"),
  createdAt: timestamp("createdAt").defaultNow(),
})
