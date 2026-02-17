import { eq } from "drizzle-orm"
import type { Database } from "../index"
import * as schema from "../schema"

/**
 * Seed reference data (penalty types, trikot templates).
 * Uses onConflictDoNothing() so it's safe to run repeatedly.
 */
export async function runSeed(db: Database) {
  console.log("Seeding penalty types...")
  await db
    .insert(schema.penaltyTypes)
    .values([
      { code: "MINOR", name: "Kleine Strafe", shortName: "2min", defaultMinutes: 2 },
      { code: "DOUBLE_MINOR", name: "Doppelte Kleine Strafe", shortName: "2+2min", defaultMinutes: 4 },
      { code: "MAJOR", name: "Große Strafe", shortName: "5min", defaultMinutes: 5 },
      { code: "MISCONDUCT", name: "Disziplinarstrafe", shortName: "10min", defaultMinutes: 10 },
      { code: "GAME_MISCONDUCT", name: "Spieldauer-Disziplinarstrafe", shortName: "SD", defaultMinutes: 20 },
      { code: "MATCH_PENALTY", name: "Matchstrafe", shortName: "MS", defaultMinutes: 25 },
    ])
    .onConflictDoNothing()

  console.log("Seeding trikot templates...")
  await db
    .insert(schema.trikotTemplates)
    .values([
      {
        name: "One-color",
        templateType: "one_color",
        colorCount: 1,
        svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
</svg>`,
      },
      {
        name: "Two-color",
        templateType: "two_color",
        colorCount: 2,
        svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
  <path id="schulter" fill="{{color_schulter}}" stroke="#000" stroke-width="0" d="m 11.281638,47.768982 14.298956,37.743671 c 0,0 0.07017,0.05963 40.892953,-26.364418 44.282223,-11.865387 74.894513,-11.712062 117.051423,-0.115073 40.82279,26.424051 40.70605,26.428872 40.70605,26.428872 l 14.23102,-37.693051 -48.97471,-34.6076 -27.231,0.376583 C 140.0897,29.243719 108.88499,28.731064 86.718361,13.025311 H 60.512656 Z"/>
</svg>`,
      },
    ])
    .onConflictDoNothing()

  console.log("Seeding static pages...")
  const existingStaticPages = await db
    .select({ id: schema.pages.id })
    .from(schema.pages)
    .where(eq(schema.pages.isStatic, true))
    .limit(1)

  if (existingStaticPages.length === 0) {
    await db.insert(schema.pages).values([
      {
        title: "Impressum",
        slug: "impressum",
        content: "<h2>Impressum</h2><p>Angaben gemäß § 5 TMG</p><p>[Hier Impressum-Daten eintragen]</p>",
        status: "published",
        isStatic: true,
        menuLocations: ["footer"],
        sortOrder: 100,
      },
      {
        title: "Datenschutz",
        slug: "datenschutz",
        content: "<h2>Datenschutzerklärung</h2><p>[Hier Datenschutzerklärung eintragen]</p>",
        status: "published",
        isStatic: true,
        menuLocations: ["footer"],
        sortOrder: 101,
      },
      {
        title: "Kontakt",
        slug: "kontakt",
        content: "<h2>Kontakt</h2><p>[Hier Kontaktinformationen eintragen]</p>",
        status: "published",
        isStatic: true,
        menuLocations: ["footer"],
        sortOrder: 102,
      },
    ])
  } else {
    console.log("  Static pages already exist, skipping.")
  }

  console.log("Seed complete.")
}
