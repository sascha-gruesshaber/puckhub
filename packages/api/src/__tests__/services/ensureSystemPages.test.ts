import { describe, expect, it } from "vitest"
import { ensureSystemPages } from "../../services/ensureSystemPages"
import { getTestDb, TEST_ORG_ID } from "../testUtils"

const TOP_LEVEL_SLUGS = [
  "_route-home",
  "_route-standings",
  "_route-schedule",
  "_route-structure",
  "_route-teams",
  "_route-stats",
]

const SUB_ROUTE_SLUGS = [
  "_route-stats-scorers",
  "_route-stats-goals",
  "_route-stats-assists",
  "_route-stats-penalties",
  "_route-stats-goalies",
  "_route-teams-compare",
]

const ALL_SYSTEM_SLUGS = [...TOP_LEVEL_SLUGS, ...SUB_ROUTE_SLUGS]

describe("ensureSystemPages service", () => {
  it("creates all 11 system pages (5 top-level + 6 sub-routes) when none exist", async () => {
    const db = getTestDb()
    const result = await ensureSystemPages(db, TEST_ORG_ID)

    expect(result.created).toHaveLength(12)
    expect(result.created.sort()).toEqual(ALL_SYSTEM_SLUGS.sort())

    // Verify pages actually exist in DB
    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true },
    })
    expect(pages).toHaveLength(12)
  })

  it("returns German titles by default (locale de-DE)", async () => {
    const db = getTestDb()
    await ensureSystemPages(db, TEST_ORG_ID)

    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true, parentId: null },
      orderBy: { sortOrder: "asc" },
    })

    const titles = pages.map((p) => p.title)
    expect(titles).toEqual(["Start", "Tabelle", "Spielplan", "Saisonstruktur", "Teams", "Statistiken"])
  })

  it("returns English titles for en-US locale", async () => {
    const db = getTestDb()
    await ensureSystemPages(db, TEST_ORG_ID, "en-US")

    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true, parentId: null },
      orderBy: { sortOrder: "asc" },
    })

    const titles = pages.map((p) => p.title)
    expect(titles).toEqual(["Home", "Standings", "Schedule", "Structure", "Teams", "Statistics"])
  })

  it("is idempotent — second call creates nothing", async () => {
    const db = getTestDb()

    const first = await ensureSystemPages(db, TEST_ORG_ID)
    expect(first.created).toHaveLength(12)

    const second = await ensureSystemPages(db, TEST_ORG_ID)
    expect(second.created).toHaveLength(0)

    // Still only 11 pages total
    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true },
    })
    expect(pages).toHaveLength(12)
  })

  it("only creates missing pages when some already exist", async () => {
    const db = getTestDb()

    // Pre-create 2 system pages manually
    await db.page.createMany({
      data: [
        {
          organizationId: TEST_ORG_ID,
          title: "Start",
          slug: "_route-home",
          routePath: "/",
          isSystemRoute: true,
          status: "published",
          content: "",
          menuLocations: ["main_nav"],
          sortOrder: 0,
        },
        {
          organizationId: TEST_ORG_ID,
          title: "Tabelle",
          slug: "_route-standings",
          routePath: "/standings",
          isSystemRoute: true,
          status: "published",
          content: "",
          menuLocations: ["main_nav"],
          sortOrder: 1,
        },
      ],
    })

    const result = await ensureSystemPages(db, TEST_ORG_ID)

    // Should create the 4 missing top-level + 6 sub-routes = 10
    expect(result.created).toHaveLength(10)
    expect(result.created).not.toContain("_route-home")
    expect(result.created).not.toContain("_route-standings")
    expect(result.created).toContain("_route-schedule")
    expect(result.created).toContain("_route-teams")
    expect(result.created).toContain("_route-stats")
    // Sub-routes should also be created
    expect(result.created).toContain("_route-stats-scorers")
    expect(result.created).toContain("_route-teams-compare")

    // Total should be 11
    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true },
    })
    expect(pages).toHaveLength(12)
  })

  it("creates pages with correct routePath and sortOrder", async () => {
    const db = getTestDb()
    await ensureSystemPages(db, TEST_ORG_ID)

    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true, parentId: null },
      orderBy: { sortOrder: "asc" },
    })

    // Default locale is de-DE, so German route paths are used
    expect(pages[0]?.routePath).toBe("/")
    expect(pages[0]?.sortOrder).toBe(0)
    expect(pages[1]?.routePath).toBe("/tabelle")
    expect(pages[1]?.sortOrder).toBe(1)
    expect(pages[2]?.routePath).toBe("/spielplan")
    expect(pages[2]?.sortOrder).toBe(2)
    expect(pages[3]?.routePath).toBe("/struktur")
    expect(pages[3]?.sortOrder).toBe(3)
    expect(pages[4]?.routePath).toBe("/teams")
    expect(pages[4]?.sortOrder).toBe(4)
    expect(pages[5]?.routePath).toBe("/statistiken")
    expect(pages[5]?.sortOrder).toBe(5)
  })

  it("creates pages with published status and main_nav menu location", async () => {
    const db = getTestDb()
    await ensureSystemPages(db, TEST_ORG_ID)

    const pages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true, parentId: null },
    })

    for (const page of pages) {
      expect(page.status).toBe("published")
      expect(page.menuLocations).toEqual(["main_nav"])
      expect(page.isSystemRoute).toBe(true)
    }
  })

  it("creates sub-routes with correct parentId and routePath", async () => {
    const db = getTestDb()
    await ensureSystemPages(db, TEST_ORG_ID)

    const statsParent = await db.page.findFirst({
      where: { organizationId: TEST_ORG_ID, slug: "_route-stats" },
    })
    const teamsParent = await db.page.findFirst({
      where: { organizationId: TEST_ORG_ID, slug: "_route-teams" },
    })

    expect(statsParent).not.toBeNull()
    expect(teamsParent).not.toBeNull()

    const statsChildren = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, parentId: statsParent!.id, isSystemRoute: true },
      orderBy: { sortOrder: "asc" },
    })

    expect(statsChildren).toHaveLength(5)
    expect(statsChildren.map((c) => c.slug)).toEqual([
      "_route-stats-scorers",
      "_route-stats-goals",
      "_route-stats-assists",
      "_route-stats-penalties",
      "_route-stats-goalies",
    ])
    // Default locale is de-DE, so German route paths are used
    expect(statsChildren.map((c) => c.routePath)).toEqual([
      "/statistiken/scorer",
      "/statistiken/tore",
      "/statistiken/vorlagen",
      "/statistiken/strafen",
      "/statistiken/torhueter",
    ])

    const teamsChildren = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, parentId: teamsParent!.id, isSystemRoute: true },
      orderBy: { sortOrder: "asc" },
    })

    expect(teamsChildren).toHaveLength(1)
    expect(teamsChildren[0]?.slug).toBe("_route-teams-compare")
    expect(teamsChildren[0]?.routePath).toBe("/statistiken/teamvergleich")
  })

  it("creates sub-routes with empty menuLocations and published status", async () => {
    const db = getTestDb()
    await ensureSystemPages(db, TEST_ORG_ID)

    const subRoutes = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true, parentId: { not: null } },
    })

    expect(subRoutes).toHaveLength(6)
    for (const sub of subRoutes) {
      expect(sub.menuLocations).toEqual([])
      expect(sub.status).toBe("published")
      expect(sub.isSystemRoute).toBe(true)
    }
  })

  it("unmarks orphaned system pages that are no longer in the canonical list", async () => {
    const db = getTestDb()

    // Create a fake system route page that is no longer in the canonical list
    await db.page.create({
      data: {
        organizationId: TEST_ORG_ID,
        title: "News",
        slug: "news",
        routePath: "/news",
        isSystemRoute: true,
        status: "published",
        content: "",
        menuLocations: ["main_nav"],
        sortOrder: 10,
      },
    })

    const result = await ensureSystemPages(db, TEST_ORG_ID)

    // The orphaned page should be unmarked
    expect(result.unmarked).toEqual(["news"])

    // The page should no longer be a system route
    const orphanedPage = await db.page.findFirst({
      where: { organizationId: TEST_ORG_ID, slug: "news" },
    })
    expect(orphanedPage).not.toBeNull()
    expect(orphanedPage!.isSystemRoute).toBe(false)
    expect(orphanedPage!.routePath).toBeNull()

    // All 11 real system pages should still exist
    const systemPages = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true },
    })
    expect(systemPages).toHaveLength(12)
  })

  it("returns empty unmarked array when no orphans exist", async () => {
    const db = getTestDb()
    const result = await ensureSystemPages(db, TEST_ORG_ID)

    expect(result.unmarked).toHaveLength(0)
    expect(result.created).toHaveLength(12)
  })

  it("creates sub-routes even when top-level already exists", async () => {
    const db = getTestDb()

    // First call creates everything
    await ensureSystemPages(db, TEST_ORG_ID)

    // Delete only sub-routes
    await db.page.deleteMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true, parentId: { not: null } },
    })

    // Second call should re-create only the sub-routes
    const result = await ensureSystemPages(db, TEST_ORG_ID)
    expect(result.created).toHaveLength(6)
    expect(result.created.sort()).toEqual(SUB_ROUTE_SLUGS.sort())

    const total = await db.page.findMany({
      where: { organizationId: TEST_ORG_ID, isSystemRoute: true },
    })
    expect(total).toHaveLength(12)
  })
})
