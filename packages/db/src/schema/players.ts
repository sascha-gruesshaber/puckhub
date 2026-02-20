import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    nationality: text("nationality"),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("players_org_id_idx").on(t.organizationId)],
)
