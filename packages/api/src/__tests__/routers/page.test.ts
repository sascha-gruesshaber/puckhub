import { describe, expect, it, beforeEach } from "vitest"
import { createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

describe("page router", () => {
  describe("list", () => {
    it("returns empty list when no pages exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.page.list()
      expect(result).toEqual([])
    })

    it("returns pages ordered by sortOrder then title", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Zebra", sortOrder: 2 })
      await admin.page.create({ title: "Alpha", sortOrder: 1 })
      await admin.page.create({ title: "Beta", sortOrder: 1 })

      const result = await admin.page.list()
      expect(result).toHaveLength(3)
      expect(result[0]?.title).toBe("Alpha")
      expect(result[1]?.title).toBe("Beta")
      expect(result[2]?.title).toBe("Zebra")
    })

    it("includes children in results (parentId populated)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Eltern" })
      await admin.page.create({ title: "Kind", parentId: parent?.id })

      const result = await admin.page.list()
      const parentResult = result.find((p) => p.title === "Eltern")
      expect(parentResult?.children).toHaveLength(1)
    })
  })

  describe("create", () => {
    it("creates a page with auto-generated slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Über die Liga", status: "published" })
      expect(page?.slug).toBe("ueber-die-liga")
    })

    it("generates correct slug from German umlauts", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Größte Überraschung" })
      expect(page?.slug).toBe("groesste-ueberraschung")
    })

    it("strips special characters from slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Saison 2024/25 — Infos & Regeln!" })
      expect(page?.slug).toBe("saison-202425-infos-regeln")
    })

    it("rejects forbidden slugs", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.page.create({ title: "Mannschaften" })).rejects.toThrow("PAGE_SLUG_RESERVED")
    })

    it("rejects duplicate slugs", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Test Seite" })
      await expect(admin.page.create({ title: "Test Seite" })).rejects.toThrow("PAGE_SLUG_CONFLICT")
    })

    it("rejects title that produces empty slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.page.create({ title: "!!!" })).rejects.toThrow("PAGE_INVALID_SLUG")
    })

    it("creates page with menu locations", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({
        title: "Info Seite",
        menuLocations: ["main_nav", "footer"],
      })
      expect(page?.menuLocations).toEqual(["main_nav", "footer"])
    })

    it("defaults to draft status and empty menu locations", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Entwurf" })
      expect(page?.status).toBe("draft")
      expect(page?.menuLocations).toEqual([])
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.page.create({ title: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("sub-pages", () => {
    it("creates a sub-page under a parent", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Über uns" })
      const child = await admin.page.create({
        title: "Vorstand",
        parentId: parent?.id,
      })
      expect(child?.parentId).toBe(parent?.id)
      expect(child?.slug).toBe("vorstand")
    })

    it("allows menuLocations on sub-pages", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Infos" })
      const child = await admin.page.create({
        title: "Details",
        parentId: parent?.id,
        menuLocations: ["main_nav"],
      })
      expect(child?.menuLocations).toEqual(["main_nav"])
    })

    it("rejects nested sub-pages (parent is already a child)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Level 0" })
      const child = await admin.page.create({ title: "Level 1", parentId: parent?.id })
      await expect(admin.page.create({ title: "Level 2", parentId: child?.id })).rejects.toThrow()
    })

    it("rejects parentId pointing to non-existent page", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.page.create({ title: "Orphan", parentId: "00000000-0000-0000-0000-000000000000" }),
      ).rejects.toThrow()
    })

    it("allows sub-page slugs that duplicate top-level slugs", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Verein" })
      await admin.page.create({ title: "Info" }) // top-level
      const child = await admin.page.create({ title: "Info", parentId: parent?.id })
      expect(child?.slug).toBe("info")
    })

    it("rejects duplicate slugs among siblings", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Verein Zwei" })
      await admin.page.create({ title: "Kontaktinfo", parentId: parent?.id })
      await expect(admin.page.create({ title: "Kontaktinfo", parentId: parent?.id })).rejects.toThrow(
        "PAGE_SLUG_CONFLICT",
      )
    })
  })

  describe("getById", () => {
    it("returns page by id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Testseite" })
      const result = await admin.page.getById({ id: page?.id })
      expect(result?.title).toBe("Testseite")
    })

    it("includes children when fetching parent", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Eltern Seite" })
      await admin.page.create({ title: "Kind Seite", parentId: parent?.id })
      const result = await admin.page.getById({ id: parent?.id })
      expect(result?.children).toHaveLength(1)
      expect(result?.children?.[0]?.title).toBe("Kind Seite")
    })

    it("throws NOT_FOUND for non-existent id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.page.getById({ id: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow(
        "PAGE_NOT_FOUND",
      )
    })
  })

  describe("getBySlug", () => {
    it("returns published page by slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Öffentlich", status: "published" })
      const result = await admin.page.getBySlug({ slug: "oeffentlich" })
      expect(result).not.toHaveProperty("redirect")
      expect((result as any).title).toBe("Öffentlich")
    })

    it("does not return draft pages", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Geheim", status: "draft" })
      await expect(admin.page.getBySlug({ slug: "geheim" })).rejects.toThrow("PAGE_NOT_FOUND")
    })

    it("resolves nested slug for sub-pages (parent-slug/child-slug)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Vereinsinfo", status: "published" })
      await admin.page.create({ title: "Geschichte", parentId: parent?.id, status: "published" })
      const result = await admin.page.getBySlug({ slug: "vereinsinfo/geschichte" })
      expect(result).not.toHaveProperty("redirect")
      expect((result as any).title).toBe("Geschichte")
    })
  })

  describe("listByMenuLocation", () => {
    it("returns only published pages for given location", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Nav Page", status: "published", menuLocations: ["main_nav"] })
      await admin.page.create({ title: "Footer Page", status: "published", menuLocations: ["footer"] })
      await admin.page.create({ title: "Draft Page", status: "draft", menuLocations: ["main_nav"] })

      const navPages = await admin.page.listByMenuLocation({ location: "main_nav" })
      expect(navPages).toHaveLength(1)
      expect(navPages[0]?.title).toBe("Nav Page")
    })

    it("returns pages assigned to multiple locations", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Beide Orte", status: "published", menuLocations: ["main_nav", "footer"] })

      const navPages = await admin.page.listByMenuLocation({ location: "main_nav" })
      const footerPages = await admin.page.listByMenuLocation({ location: "footer" })
      expect(navPages).toHaveLength(1)
      expect(footerPages).toHaveLength(1)
    })
  })

  describe("update", () => {
    it("updates page content", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Seite Eins" })
      const updated = await admin.page.update({
        id: page?.id,
        content: "<p>Neuer Inhalt</p>",
      })
      expect(updated?.content).toBe("<p>Neuer Inhalt</p>")
    })

    it("regenerates slug when title changes on dynamic page", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Alter Titel" })
      expect(page?.slug).toBe("alter-titel")
      const updated = await admin.page.update({ id: page?.id, title: "Neuer Titel" })
      expect(updated?.slug).toBe("neuer-titel")
    })

    it("updates menuLocations", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Menü Seite", menuLocations: [] })
      const updated = await admin.page.update({
        id: page?.id,
        menuLocations: ["main_nav", "footer"],
      })
      expect(updated?.menuLocations).toEqual(["main_nav", "footer"])
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Auth Seite" })
      const caller = createTestCaller()
      await expect(caller.page.update({ id: page?.id, content: "hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("aliases", () => {
    it("creates an alias with auto-generated slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Zielseite", status: "published" })
      const alias = await admin.page.createAlias({ title: "Alte URL", targetPageId: page?.id })
      expect(alias?.slug).toBe("alte-url")
      expect(alias?.targetPageId).toBe(page?.id)
    })

    it("rejects alias slug that collides with existing page slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.page.create({ title: "Meine Seite" })
      const target = await admin.page.create({ title: "Ziel" })
      await expect(admin.page.createAlias({ title: "Meine Seite", targetPageId: target?.id })).rejects.toThrow(
        "PAGE_SLUG_CONFLICT",
      )
    })

    it("rejects alias slug that collides with another alias", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Ziel Zwei" })
      await admin.page.createAlias({ title: "Weiterleitung", targetPageId: page?.id })
      await expect(admin.page.createAlias({ title: "Weiterleitung", targetPageId: page?.id })).rejects.toThrow(
        "PAGE_ALIAS_CONFLICT",
      )
    })

    it("rejects alias with forbidden slug", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Ziel Drei" })
      await expect(admin.page.createAlias({ title: "Mannschaften", targetPageId: page?.id })).rejects.toThrow(
        "PAGE_SLUG_RESERVED",
      )
    })

    it("getBySlug returns redirect info for alias", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Zielseite Zwei", status: "published" })
      await admin.page.createAlias({ title: "Umleitung", targetPageId: page?.id })
      const result = await admin.page.getBySlug({ slug: "umleitung" })
      expect(result).toHaveProperty("redirect", true)
      expect(result).toHaveProperty("targetSlug", "zielseite-zwei")
    })

    it("deletes an alias", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Ziel Vier" })
      const alias = await admin.page.createAlias({ title: "Alias Eins", targetPageId: page?.id })
      await admin.page.deleteAlias({ id: alias?.id })
      const aliases = await admin.page.listAliases()
      expect(aliases).toHaveLength(0)
    })

    it("cascade-deletes aliases when target page is deleted", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Ziel Fünf" })
      await admin.page.createAlias({ title: "Alias Zwei", targetPageId: page?.id })
      await admin.page.delete({ id: page?.id })
      const aliases = await admin.page.listAliases()
      expect(aliases).toHaveLength(0)
    })

    it("rejects unauthenticated alias creation", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Ziel Sechs" })
      const caller = createTestCaller()
      await expect(caller.page.createAlias({ title: "Hack", targetPageId: page?.id })).rejects.toThrow(
        "Not authenticated",
      )
    })
  })

  describe("delete", () => {
    it("deletes a dynamic page", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Löschbar" })
      await admin.page.delete({ id: page?.id })
      await expect(admin.page.getById({ id: page?.id })).rejects.toThrow("PAGE_NOT_FOUND")
    })

    it("cascade-deletes children when parent is deleted", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const parent = await admin.page.create({ title: "Eltern Lösch" })
      const child = await admin.page.create({ title: "Kind Lösch", parentId: parent?.id })
      await admin.page.delete({ id: parent?.id })
      await expect(admin.page.getById({ id: child?.id })).rejects.toThrow("PAGE_NOT_FOUND")
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const page = await admin.page.create({ title: "Delete Auth" })
      const caller = createTestCaller()
      await expect(caller.page.delete({ id: page?.id })).rejects.toThrow("Not authenticated")
    })
  })

  describe("system route pages", () => {
    async function createSystemRoutePage() {
      const db = getTestDb()
      const page = await db.page.create({
        data: {
          organizationId: TEST_ORG_ID,
          title: "Start",
          slug: "_route-home",
          routePath: "/",
          content: "",
          status: "published",
          isSystemRoute: true,
          menuLocations: ["main_nav"],
          sortOrder: 0,
        },
      })
      return page
    }

    it("cannot delete system route pages", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const systemPage = await createSystemRoutePage()
      await expect(admin.page.delete({ id: systemPage.id })).rejects.toThrow(
        "PAGE_SYSTEM_ROUTE_CANNOT_DELETE",
      )
    })

    it("can update title of system route pages (slug stays fixed)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const systemPage = await createSystemRoutePage()
      const updated = await admin.page.update({
        id: systemPage.id,
        title: "Home Page",
      })
      expect(updated?.title).toBe("Home Page")
      expect(updated?.slug).toBe("_route-home")
    })

    it("can update menuLocations and sortOrder of system route pages", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const systemPage = await createSystemRoutePage()
      const updated = await admin.page.update({
        id: systemPage.id,
        menuLocations: ["main_nav", "footer"],
        sortOrder: 10,
      })
      expect(updated?.menuLocations).toEqual(["main_nav", "footer"])
      expect(updated?.sortOrder).toBe(10)
    })

    it("can set status to draft to hide from navigation", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const systemPage = await createSystemRoutePage()
      const updated = await admin.page.update({
        id: systemPage.id,
        status: "draft",
      })
      expect(updated?.status).toBe("draft")
    })
  })
})
