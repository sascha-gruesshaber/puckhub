import type { Database } from "../index"
import type { MenuLocation } from "../generated/prisma/enums"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Seed reference data (penalty types, trikot templates, plans).
 * Uses skipDuplicates / upsert so it's safe to run repeatedly.
 *
 * Note: static pages are NOT seeded here because the pages table requires
 * an organizationId. Static pages must be created per-organization, either
 * via the demo seed (demo.ts) or through the admin UI after creating an org.
 */
export async function runSeed(db: Database) {
  console.log("Seeding penalty types...")
  await db.penaltyType.createMany({
    data: [
      { code: "MINOR", name: "Kleine Strafe", shortName: "2min", defaultMinutes: 2 },
      { code: "DOUBLE_MINOR", name: "Doppelte Kleine Strafe", shortName: "2+2min", defaultMinutes: 4 },
      { code: "MAJOR", name: "Große Strafe", shortName: "5min", defaultMinutes: 5 },
      { code: "MISCONDUCT", name: "Disziplinarstrafe", shortName: "10min", defaultMinutes: 10 },
      { code: "GAME_MISCONDUCT", name: "Spieldauer-Disziplinarstrafe", shortName: "SD", defaultMinutes: 20 },
      { code: "MATCH_PENALTY", name: "Matchstrafe", shortName: "MS", defaultMinutes: 25 },
    ],
    skipDuplicates: true,
  })

  console.log("Seeding trikot templates...")
  await db.trikotTemplate.createMany({
    data: [
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
    ],
    skipDuplicates: true,
  })

  // ─── Plans ──────────────────────────────────────────────────────────────────
  console.log("Seeding plans...")

  // Fixed plan IDs — these are stable across all environments
  const PLAN_IDS = {
    free: "00000000-0000-0000-0000-000000000001",
    starter: "00000000-0000-0000-0000-000000000002",
    pro: "00000000-0000-0000-0000-000000000003",
  } as const

  const planData = [
    {
      id: PLAN_IDS.free,
      slug: "free",
      name: "Free",
      sortOrder: 0,
      priceMonthly: 0,
      priceYearly: 0,
      maxTeams: 4,
      maxPlayers: 40,
      maxDivisionsPerSeason: 1,
      maxSeasons: 2,
      maxAdmins: 2,
      maxNewsArticles: 10,
      maxPages: 5,
      maxSponsors: 0,
      maxDocuments: 0,
      storageQuotaMb: 50,
      featureCustomDomain: false,
      featureWebsiteBuilder: false,
      featureSponsorMgmt: false,
      featureTrikotDesigner: false,
      featureGameReports: true,
      featurePlayerStats: true,
      featureScheduler: false,
      featureScheduledNews: false,
      featureAdvancedRoles: false,
      featureAdvancedStats: false,
    },
    {
      id: PLAN_IDS.starter,
      slug: "starter",
      name: "Starter",
      sortOrder: 1,
      priceMonthly: 1999,
      priceYearly: 19990,
      maxTeams: 16,
      maxPlayers: 250,
      maxDivisionsPerSeason: 3,
      maxSeasons: 5,
      maxAdmins: 5,
      maxNewsArticles: 50,
      maxPages: 10,
      maxSponsors: 5,
      maxDocuments: 10,
      storageQuotaMb: 500,
      featureCustomDomain: false,
      featureWebsiteBuilder: true,
      featureSponsorMgmt: true,
      featureTrikotDesigner: false,
      featureGameReports: true,
      featurePlayerStats: true,
      featureScheduler: false,
      featureScheduledNews: false,
      featureAdvancedRoles: false,
      featureAdvancedStats: false,
    },
    {
      id: PLAN_IDS.pro,
      slug: "pro",
      name: "Pro",
      sortOrder: 2,
      priceMonthly: 4999,
      priceYearly: 49990,
      maxTeams: null,
      maxPlayers: null,
      maxDivisionsPerSeason: null,
      maxSeasons: null,
      maxAdmins: null,
      maxNewsArticles: null,
      maxPages: null,
      maxSponsors: null,
      maxDocuments: null,
      storageQuotaMb: 2048,
      featureCustomDomain: true,
      featureWebsiteBuilder: true,
      featureSponsorMgmt: true,
      featureTrikotDesigner: true,
      featureGameReports: true,
      featurePlayerStats: true,
      featureScheduler: true,
      featureScheduledNews: true,
      featureAdvancedRoles: true,
      featureAdvancedStats: true,
      featureAiRecaps: true,
      featurePublicReports: true,
    },
  ] as const

  for (const plan of planData) {
    await db.plan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: plan,
    })
  }

  // ─── Assign Free plan + slug to existing orgs ──────────────────────────────
  const freePlan = await db.plan.findUnique({ where: { id: PLAN_IDS.free } })
  if (freePlan) {
    const orgs = await db.organization.findMany({
      select: { id: true, name: true, slug: true },
    })

    for (const org of orgs) {
      // Generate slug if missing
      if (!org.slug) {
        let baseSlug = slugify(org.name)
        if (!baseSlug) baseSlug = org.id.slice(0, 8)
        let slug = baseSlug
        let counter = 1
        while (await db.organization.findFirst({ where: { slug, id: { not: org.id } } })) {
          slug = `${baseSlug}-${counter++}`
        }
        await db.organization.update({
          where: { id: org.id },
          data: { slug },
        })
      }

      // Assign Free plan if no subscription exists
      const existing = await db.orgSubscription.findUnique({
        where: { organizationId: org.id },
      })
      if (!existing) {
        const now = new Date()
        const oneYear = new Date(now)
        oneYear.setFullYear(oneYear.getFullYear() + 100) // effectively unlimited for free
        await db.orgSubscription.create({
          data: {
            organizationId: org.id,
            planId: freePlan.id,
            interval: "monthly",
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: oneYear,
          },
        })
      }
    }
    console.log(`Ensured ${orgs.length} organization(s) have slug + Free plan subscription.`)
  }

  // ─── Backfill system route pages for existing orgs ────────────────────────
  console.log("Backfilling system route pages for existing orgs...")
  const allOrgs = await db.organization.findMany({
    select: { id: true },
  })

  for (const org of allOrgs) {
    const existingSystemRoutes = await db.page.count({
      where: { organizationId: org.id, isSystemRoute: true },
    })
    if (existingSystemRoutes > 0) continue

    // Determine locale from system settings
    const settings = await db.systemSettings.findUnique({
      where: { organizationId: org.id },
      select: { locale: true },
    })
    const isGerman = settings?.locale?.startsWith("de") ?? true

    const ml: MenuLocation[] = ["main_nav"]
    const systemRoutePages = isGerman
      ? [
          { title: "Start", slug: "_route-home", routePath: "/", menuLocations: ml, sortOrder: 0 },
          { title: "Tabelle", slug: "_route-standings", routePath: "/standings", menuLocations: ml, sortOrder: 1 },
          { title: "Spielplan", slug: "_route-schedule", routePath: "/schedule", menuLocations: ml, sortOrder: 2 },
          { title: "Saisonstruktur", slug: "_route-structure", routePath: "/struktur", menuLocations: ml, sortOrder: 3 },
          { title: "Teams", slug: "_route-teams", routePath: "/teams", menuLocations: ml, sortOrder: 4 },
          { title: "Statistiken", slug: "_route-stats", routePath: "/stats", menuLocations: ml, sortOrder: 5 },
        ]
      : [
          { title: "Home", slug: "_route-home", routePath: "/", menuLocations: ml, sortOrder: 0 },
          { title: "Standings", slug: "_route-standings", routePath: "/standings", menuLocations: ml, sortOrder: 1 },
          { title: "Schedule", slug: "_route-schedule", routePath: "/schedule", menuLocations: ml, sortOrder: 2 },
          { title: "Structure", slug: "_route-structure", routePath: "/structure", menuLocations: ml, sortOrder: 3 },
          { title: "Teams", slug: "_route-teams", routePath: "/teams", menuLocations: ml, sortOrder: 4 },
          { title: "Statistics", slug: "_route-stats", routePath: "/stats", menuLocations: ml, sortOrder: 5 },
        ]

    await db.page.createMany({
      data: systemRoutePages.map((p) => ({
        organizationId: org.id,
        ...p,
        isSystemRoute: true,
        status: "published" as const,
        content: "",
      })),
    })
    console.log(`  Created system route pages for org ${org.id}`)
  }

  console.log("Seed complete.")
}
