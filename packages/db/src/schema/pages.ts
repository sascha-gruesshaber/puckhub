import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { menuLocationEnum, pageStatusEnum } from "./enums"
import { organization } from "./organization"

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull().default(""),
    status: pageStatusEnum("status").notNull().default("draft"),
    isStatic: boolean("is_static").notNull().default(false),
    parentId: uuid("parent_id").references((): any => pages.id, { onDelete: "cascade" }),
    menuLocations: menuLocationEnum("menu_locations").array().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("pages_slug_parent_org_unique").on(t.slug, t.parentId, t.organizationId).nullsNotDistinct(),
    index("pages_org_id_idx").on(t.organizationId),
  ],
)
