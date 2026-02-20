import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    mimeType: text("mime_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_org_id_idx").on(t.organizationId)],
)
