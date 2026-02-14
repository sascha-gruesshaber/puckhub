import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { venues } from "./venues"

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  city: text("city"),
  logoUrl: text("logo_url"),
  teamPhotoUrl: text("team_photo_url"),
  primaryColor: text("primary_color"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  defaultVenueId: uuid("default_venue_id").references(() => venues.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
