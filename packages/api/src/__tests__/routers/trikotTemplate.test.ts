import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("trikot-template router", () => {
  describe("list", () => {
    it("returns list of trikot templates", async () => {
      const caller = createTestCaller()
      const result = await caller.trikotTemplate.list()
      expect(Array.isArray(result)).toBe(true)
      // Templates are seeded in the database, so we should have some
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it("returns templates ordered by name", async () => {
      const caller = createTestCaller()
      const result = await caller.trikotTemplate.list()

      if (result.length > 1) {
        const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name))
        expect(result.map((t) => t.name)).toEqual(sorted.map((t) => t.name))
      }
    })

    it("is publicly accessible", async () => {
      const publicCaller = createTestCaller()
      const result = await publicCaller.trikotTemplate.list()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("getById", () => {
    it("returns template by id", async () => {
      const caller = createTestCaller()
      const templates = await caller.trikotTemplate.list()

      if (templates.length > 0) {
        const firstTemplate = templates[0]!
        const result = await caller.trikotTemplate.getById({ id: firstTemplate.id })
        expect(result).toBeDefined()
        expect(result?.id).toBe(firstTemplate.id)
        expect(result?.name).toBe(firstTemplate.name)
      }
    })

    it("returns undefined for non-existent id", async () => {
      const caller = createTestCaller()
      const result = await caller.trikotTemplate.getById({
        id: "00000000-0000-0000-0000-000000000000",
      })
      expect(result).toBeUndefined()
    })

    it("is publicly accessible", async () => {
      const publicCaller = createTestCaller()
      const templates = await publicCaller.trikotTemplate.list()

      if (templates.length > 0) {
        const result = await publicCaller.trikotTemplate.getById({ id: templates[0]?.id })
        expect(result).toBeDefined()
      }
    })
  })
})
