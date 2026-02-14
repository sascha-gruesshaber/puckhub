import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("trikot router", () => {
  async function createTrikotFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const template = await admin.trikotTemplate.list()
    return { templateId: template[0]?.id }
  }

  describe("list", () => {
    it("returns empty list when no trikots exist", async () => {
      const caller = createTestCaller()
      const result = await caller.trikot.list()
      expect(result).toEqual([])
    })

    it("returns trikots ordered by name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        await admin.trikot.create({ name: "Home Jersey", templateId, primaryColor: "#FF0000" })
        await admin.trikot.create({ name: "Away Jersey", templateId, primaryColor: "#0000FF" })
        await admin.trikot.create({ name: "Third Jersey", templateId, primaryColor: "#00FF00" })

        const caller = createTestCaller()
        const result = await caller.trikot.list()
        expect(result.length).toBeGreaterThanOrEqual(3)
        const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name))
        expect(result.map((t) => t.name)).toEqual(sorted.map((t) => t.name))
      }
    })
  })

  describe("getById", () => {
    it("returns trikot by id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const created = await admin.trikot.create({ name: "Home Jersey", templateId, primaryColor: "#FF0000" })

        const caller = createTestCaller()
        const result = await caller.trikot.getById({ id: created?.id })
        expect(result?.name).toBe("Home Jersey")
        expect(result?.primaryColor).toBe("#FF0000")
      }
    })

    it("is publicly accessible", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const created = await admin.trikot.create({ name: "Public Jersey", templateId, primaryColor: "#000000" })

        const publicCaller = createTestCaller()
        const result = await publicCaller.trikot.getById({ id: created?.id })
        expect(result).toBeDefined()
        expect(result?.name).toBe("Public Jersey")
      }
    })
  })

  describe("create", () => {
    it("creates a trikot with all fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const trikot = await admin.trikot.create({
          name: "Special Jersey",
          templateId,
          primaryColor: "#AA5500",
          secondaryColor: "#FFFFFF",
        })

        expect(trikot?.name).toBe("Special Jersey")
        expect(trikot?.primaryColor).toBe("#AA5500")
        expect(trikot?.secondaryColor).toBe("#FFFFFF")
      }
    })

    it("creates a trikot with minimal fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const trikot = await admin.trikot.create({
          name: "Minimal Jersey",
          templateId,
          primaryColor: "#000000",
        })

        expect(trikot?.name).toBe("Minimal Jersey")
        expect(trikot?.secondaryColor).toBeNull()
      }
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        await expect(
          caller.trikot.create({ name: "Unauthorized Jersey", templateId, primaryColor: "#FF0000" }),
        ).rejects.toThrow("Not authenticated")
      }
    })
  })

  describe("update", () => {
    it("updates trikot fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const trikot = await admin.trikot.create({ name: "Original", templateId, primaryColor: "#000000" })

        const updated = await admin.trikot.update({
          id: trikot?.id,
          name: "Updated",
          primaryColor: "#FFFFFF",
        })

        expect(updated?.name).toBe("Updated")
        expect(updated?.primaryColor).toBe("#FFFFFF")
      }
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const trikot = await admin.trikot.create({ name: "Original", templateId, primaryColor: "#000000" })

        const caller = createTestCaller()
        await expect(caller.trikot.update({ id: trikot?.id, name: "Hacked" })).rejects.toThrow("Not authenticated")
      }
    })
  })

  describe("delete", () => {
    it("deletes a trikot", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const trikot = await admin.trikot.create({ name: "To Delete", templateId, primaryColor: "#000000" })

        await admin.trikot.delete({ id: trikot?.id })

        const caller = createTestCaller()
        const result = await caller.trikot.getById({ id: trikot?.id })
        expect(result).toBeUndefined()
      }
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { templateId } = await createTrikotFixtures()

      if (templateId) {
        const trikot = await admin.trikot.create({ name: "Protected", templateId, primaryColor: "#000000" })

        const caller = createTestCaller()
        await expect(caller.trikot.delete({ id: trikot?.id })).rejects.toThrow("Not authenticated")
      }
    })
  })
})
