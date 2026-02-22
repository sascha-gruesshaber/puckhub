import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("round router", () => {
  async function createDivision() {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }))!
    const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
    return division
  }

  describe("listByDivision", () => {
    it("returns empty list when no rounds exist", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.round.listByDivision({ divisionId: division.id })
      expect(result).toEqual([])
    })

    it("returns rounds ordered by sortOrder", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      await admin.round.create({ divisionId: division.id, name: "Playoffs", sortOrder: 1 })
      await admin.round.create({ divisionId: division.id, name: "Hauptrunde", sortOrder: 0 })

      const result = await admin.round.listByDivision({ divisionId: division.id })
      expect(result).toHaveLength(2)
      expect(result[0]?.name).toBe("Hauptrunde")
      expect(result[1]?.name).toBe("Playoffs")
    })
  })

  describe("create", () => {
    it("creates a round with custom point values", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const round = await admin.round.create({
        divisionId: division.id,
        name: "Hauptrunde",
        roundType: "regular",
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
      })

      expect(round?.name).toBe("Hauptrunde")
      expect(round?.roundType).toBe("regular")
      expect(round?.pointsWin).toBe(3)
      expect(round?.pointsDraw).toBe(1)
      expect(round?.pointsLoss).toBe(0)
    })

    it("uses default point values", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const round = await admin.round.create({
        divisionId: division.id,
        name: "Hauptrunde",
      })

      expect(round?.pointsWin).toBe(2)
      expect(round?.pointsDraw).toBe(1)
      expect(round?.pointsLoss).toBe(0)
    })

    it("supports all round types", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })

      const playoff = await admin.round.create({
        divisionId: division.id,
        name: "Playoffs",
        roundType: "playoffs",
      })
      expect(playoff?.roundType).toBe("playoffs")

      const relegation = await admin.round.create({
        divisionId: division.id,
        name: "Relegation",
        roundType: "relegation",
        sortOrder: 1,
      })
      expect(relegation?.roundType).toBe("relegation")
    })

    it("rejects unauthenticated calls", async () => {
      const division = await createDivision()
      const caller = createTestCaller()
      await expect(caller.round.create({ divisionId: division.id, name: "Unauthorized" })).rejects.toThrow(
        "Not authenticated",
      )
    })
  })

  describe("update", () => {
    it("updates round fields", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const round = await admin.round.create({ divisionId: division.id, name: "Runde 1" })

      const updated = await admin.round.update({
        id: round?.id,
        name: "Hauptrunde",
        pointsWin: 3,
      })

      expect(updated?.name).toBe("Hauptrunde")
      expect(updated?.pointsWin).toBe(3)
    })

    it("rejects unauthenticated calls", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const round = await admin.round.create({ divisionId: division.id, name: "Runde 1" })

      const caller = createTestCaller()
      await expect(caller.round.update({ id: round?.id, name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a round", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const round = await admin.round.create({ divisionId: division.id, name: "Runde 1" })

      await admin.round.delete({ id: round?.id })

      const result = await admin.round.getById({ id: round?.id })
      expect(result).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const division = await createDivision()
      const admin = createTestCaller({ asAdmin: true })
      const round = await admin.round.create({ divisionId: division.id, name: "Runde 1" })

      const caller = createTestCaller()
      await expect(caller.round.delete({ id: round?.id })).rejects.toThrow("Not authenticated")
    })
  })
})
