import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("team router", () => {
  describe("list", () => {
    it("returns empty list when no teams exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.team.list()
      expect(result).toEqual([])
    })

    it("returns teams ordered by name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.team.create({ name: "Wolves", shortName: "WOL" })
      await admin.team.create({ name: "Bears", shortName: "BEA" })
      await admin.team.create({ name: "Eagles", shortName: "EAG" })

      const result = await admin.team.list()
      expect(result).toHaveLength(3)
      expect(result[0]?.name).toBe("Bears")
      expect(result[1]?.name).toBe("Eagles")
      expect(result[2]?.name).toBe("Wolves")
    })
  })

  describe("create", () => {
    it("creates a team with all fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({
        name: "Ice Eagles",
        shortName: "IEA",
        city: "Munich",
        contactEmail: "info@eagles.test",
        website: "https://eagles.test",
      })

      expect(team?.name).toBe("Ice Eagles")
      expect(team?.shortName).toBe("IEA")
      expect(team?.city).toBe("Munich")
      expect(team?.contactEmail).toBe("info@eagles.test")
    })
  })

  describe("getById", () => {
    it("returns team by id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const created = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      const result = await admin.team.getById({ id: created?.id })
      expect(result?.name).toBe("Eagles")
    })
  })

  describe("update", () => {
    it("updates team fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      const updated = await admin.team.update({
        id: team?.id,
        name: "Ice Eagles",
        city: "Berlin",
      })

      expect(updated?.name).toBe("Ice Eagles")
      expect(updated?.city).toBe("Berlin")
      expect(updated?.shortName).toBe("EAG")
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      const caller = createTestCaller()
      await expect(caller.team.update({ id: team?.id, name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a team", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      await admin.team.delete({ id: team?.id })

      const result = await admin.team.getById({ id: team?.id })
      expect(result).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      const caller = createTestCaller()
      await expect(caller.team.delete({ id: team?.id })).rejects.toThrow("Not authenticated")
    })
  })
})
