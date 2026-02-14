import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { trikotTemplateTypeEnum } from "./enums"

export const trikotTemplates = pgTable("trikot_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  templateType: trikotTemplateTypeEnum("template_type").notNull().unique(),
  svg: text("svg").notNull(),
  colorCount: integer("color_count").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
