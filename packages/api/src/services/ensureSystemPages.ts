import type { Database } from "@puckhub/db"

/**
 * The canonical list of system route pages every league site needs to function.
 * Slug is the unique key — if a page with that slug + isSystemRoute already exists,
 * it will not be re-created.
 *
 * routePath is the English (default) URL, routePathDe is the German URL.
 */
const SYSTEM_ROUTES = [
  { slug: "_route-home", routePath: "/", routePathDe: "/", sortOrder: 0, titleDe: "Start", titleEn: "Home" },
  { slug: "_route-standings", routePath: "/standings", routePathDe: "/tabelle", sortOrder: 1, titleDe: "Tabelle", titleEn: "Standings" },
  { slug: "_route-schedule", routePath: "/schedule", routePathDe: "/spielplan", sortOrder: 2, titleDe: "Spielplan", titleEn: "Schedule" },
  { slug: "_route-teams", routePath: "/teams", routePathDe: "/teams", sortOrder: 3, titleDe: "Teams", titleEn: "Teams" },
  { slug: "_route-stats", routePath: "/stats", routePathDe: "/statistiken", sortOrder: 4, titleDe: "Statistiken", titleEn: "Statistics" },
]

/**
 * Sub-route system pages that live as children of top-level system routes.
 * Their visibility is controlled via status (published/draft) in the admin UI.
 * menuLocations is always [] — they only appear as children of their parent.
 */
const SYSTEM_SUB_ROUTES = [
  { slug: "_route-stats-scorers", routePath: "/stats/scorers", routePathDe: "/statistiken/scorer", parentSlug: "_route-stats", sortOrder: 0, titleDe: "Scorer", titleEn: "Scorers" },
  { slug: "_route-stats-goals", routePath: "/stats/goals", routePathDe: "/statistiken/tore", parentSlug: "_route-stats", sortOrder: 1, titleDe: "Tore", titleEn: "Goals" },
  { slug: "_route-stats-assists", routePath: "/stats/assists", routePathDe: "/statistiken/vorlagen", parentSlug: "_route-stats", sortOrder: 2, titleDe: "Vorlagen", titleEn: "Assists" },
  { slug: "_route-stats-penalties", routePath: "/stats/penalties", routePathDe: "/statistiken/strafen", parentSlug: "_route-stats", sortOrder: 3, titleDe: "Strafen", titleEn: "Penalties" },
  { slug: "_route-stats-goalies", routePath: "/stats/goalies", routePathDe: "/statistiken/torhueter", parentSlug: "_route-stats", sortOrder: 4, titleDe: "Torhüter", titleEn: "Goalies" },
  { slug: "_route-teams-compare", routePath: "/stats/compare-teams", routePathDe: "/statistiken/teamvergleich", parentSlug: "_route-teams", sortOrder: 0, titleDe: "Teamvergleich", titleEn: "Team Comparison" },
]

/**
 * Ensures all required system route pages exist for an organization.
 * Missing pages are created with default values; existing ones have their
 * routePath and title updated to match the current locale.
 *
 * Call this after league import or any operation that might leave the org
 * without the full set of system pages the frontend needs.
 */
export async function ensureSystemPages(
  db: Database,
  organizationId: string,
  locale?: string,
): Promise<{ created: string[]; unmarked: string[] }> {
  const isGerman = (locale ?? "de-DE").startsWith("de")
  const created: string[] = []

  // Fetch existing system route pages for this org
  const existing = await db.page.findMany({
    where: { organizationId, isSystemRoute: true },
    select: { slug: true },
  })
  const existingSlugs = new Set(existing.map((p) => p.slug))

  // Create missing top-level system routes
  const missingTopLevel = SYSTEM_ROUTES.filter((r) => !existingSlugs.has(r.slug))

  if (missingTopLevel.length > 0) {
    await db.page.createMany({
      data: missingTopLevel.map((r) => ({
        organizationId,
        title: isGerman ? r.titleDe : r.titleEn,
        slug: r.slug,
        routePath: isGerman ? r.routePathDe : r.routePath,
        isSystemRoute: true,
        status: "published" as const,
        content: "",
        menuLocations: ["main_nav"],
        sortOrder: r.sortOrder,
      })),
    })
    created.push(...missingTopLevel.map((r) => r.slug))
  }

  // Create missing sub-route system pages
  const missingSubRoutes = SYSTEM_SUB_ROUTES.filter((r) => !existingSlugs.has(r.slug))

  if (missingSubRoutes.length > 0) {
    // Query parent pages to resolve their IDs
    const parentSlugs = [...new Set(missingSubRoutes.map((r) => r.parentSlug))]
    const parents = await db.page.findMany({
      where: { organizationId, isSystemRoute: true, slug: { in: parentSlugs } },
      select: { id: true, slug: true },
    })
    const parentMap = new Map(parents.map((p) => [p.slug, p.id]))

    const subRouteData = missingSubRoutes
      .filter((r) => parentMap.has(r.parentSlug))
      .map((r) => ({
        organizationId,
        title: isGerman ? r.titleDe : r.titleEn,
        slug: r.slug,
        routePath: isGerman ? r.routePathDe : r.routePath,
        isSystemRoute: true,
        status: "published" as const,
        content: "",
        menuLocations: [] as any,
        sortOrder: r.sortOrder,
        parentId: parentMap.get(r.parentSlug)!,
      }))

    if (subRouteData.length > 0) {
      await db.page.createMany({ data: subRouteData })
      created.push(...subRouteData.map((r) => r.slug))
    }
  }

  // Update routePaths and titles for existing system pages to match the current locale
  const allRoutes = [...SYSTEM_ROUTES, ...SYSTEM_SUB_ROUTES]
  for (const route of allRoutes) {
    if (existingSlugs.has(route.slug)) {
      const expectedPath = isGerman ? route.routePathDe : route.routePath
      const expectedTitle = isGerman ? route.titleDe : route.titleEn
      await db.page.updateMany({
        where: { organizationId, slug: route.slug, isSystemRoute: true },
        data: { routePath: expectedPath, title: expectedTitle },
      })
    }
  }

  // Unmark orphaned system pages whose slugs are no longer in the canonical list.
  // This turns them into regular pages so users can delete them in the admin UI.
  const allKnownSlugs = new Set([
    ...SYSTEM_ROUTES.map((r) => r.slug),
    ...SYSTEM_SUB_ROUTES.map((r) => r.slug),
  ])

  const orphaned = await db.page.findMany({
    where: {
      organizationId,
      isSystemRoute: true,
      slug: { notIn: [...allKnownSlugs] },
    },
    select: { id: true, slug: true },
  })

  const unmarked: string[] = []
  if (orphaned.length > 0) {
    await db.page.updateMany({
      where: { id: { in: orphaned.map((p) => p.id) } },
      data: { isSystemRoute: false, routePath: null, updatedAt: new Date() },
    })
    unmarked.push(...orphaned.map((p) => p.slug))
  }

  return { created, unmarked }
}
