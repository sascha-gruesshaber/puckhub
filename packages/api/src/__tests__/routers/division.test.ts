import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("division router", () => {
  async function createSeason() {
    const admin = createTestCaller({ asAdmin: true })
    return (await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }))!
  }

  describe("listBySeason", () => {
    it("returns empty list when no divisions exist", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.division.listBySeason({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("returns divisions ordered by sortOrder", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      await admin.division.create({ seasonId: season.id, name: "Playoffs", sortOrder: 2 })
      await admin.division.create({ seasonId: season.id, name: "Liga", sortOrder: 0 })
      await admin.division.create({ seasonId: season.id, name: "Zwischenrunde", sortOrder: 1 })

      const result = await admin.division.listBySeason({ seasonId: season.id })
      expect(result).toHaveLength(3)
      expect(result[0]?.name).toBe("Liga")
      expect(result[1]?.name).toBe("Zwischenrunde")
      expect(result[2]?.name).toBe("Playoffs")
    })

    it("only returns divisions for the specified season", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season1 = (await admin.season.create({
        name: "2024/25",
        seasonStart: "2024-09-01",
        seasonEnd: "2025-04-30",
      }))!
      const season2 = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      await admin.division.create({ seasonId: season1.id, name: "Liga A" })
      await admin.division.create({ seasonId: season2.id, name: "Liga B" })

      const result = await admin.division.listBySeason({ seasonId: season2.id })
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe("Liga B")
    })
  })

  describe("create", () => {
    it("creates a division", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      const division = await admin.division.create({
        seasonId: season.id,
        name: "Hauptrunde",
        sortOrder: 0,
      })

      expect(division?.name).toBe("Hauptrunde")
      expect(division?.seasonId).toBe(season.id)
    })

    it("rejects unauthenticated calls", async () => {
      const season = await createSeason()
      const caller = createTestCaller()
      await expect(caller.division.create({ seasonId: season.id, name: "Test" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("update", () => {
    it("updates division name", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      const division = await admin.division.create({ seasonId: season.id, name: "Liga" })

      const updated = await admin.division.update({ id: division?.id, name: "Hauptrunde" })
      expect(updated?.name).toBe("Hauptrunde")
    })

    it("rejects unauthenticated calls", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      const division = await admin.division.create({ seasonId: season.id, name: "Liga" })

      const caller = createTestCaller()
      await expect(caller.division.update({ id: division?.id, name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a division", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      const division = await admin.division.create({ seasonId: season.id, name: "Liga" })

      await admin.division.delete({ id: division?.id })

      const result = await admin.division.getById({ id: division?.id })
      expect(result).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const season = await createSeason()
      const admin = createTestCaller({ asAdmin: true })
      const division = await admin.division.create({ seasonId: season.id, name: "Liga" })

      const caller = createTestCaller()
      await expect(caller.division.delete({ id: division?.id })).rejects.toThrow("Not authenticated")
    })
  })
})
