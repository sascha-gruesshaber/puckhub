import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
