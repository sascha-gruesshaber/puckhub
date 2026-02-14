import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { trikotTemplates } from "./trikotTemplates"

export const trikots = pgTable("trikots", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => trikotTemplates.id, { onDelete: "restrict" }),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
