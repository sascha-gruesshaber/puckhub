import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("season router", () => {
  describe("list", () => {
    it("returns empty list when no seasons exist", async () => {
      const caller = createTestCaller()
      const result = await caller.season.list()
      expect(result).toEqual([])
    })

    it("returns seasons ordered by seasonStart descending", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.season.create({ name: "2023/24", seasonStart: "2023-09-01", seasonEnd: "2024-04-30" })
      await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })
      await admin.season.create({ name: "2024/25", seasonStart: "2024-09-01", seasonEnd: "2025-04-30" })

      const caller = createTestCaller()
      const result = await caller.season.list()
      expect(result).toHaveLength(3)
      expect(result[0]?.name).toBe("2025/26")
      expect(result[1]?.name).toBe("2024/25")
      expect(result[2]?.name).toBe("2023/24")
    })
  })

  describe("create", () => {
    it("creates a season and returns it", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      expect(season).toBeDefined()
      expect(season?.name).toBe("2025/26")
      expect(new Date(season?.seasonStart).toISOString().slice(0, 10)).toBe("2025-09-01")
      expect(new Date(season?.seasonEnd).toISOString().slice(0, 10)).toBe("2026-04-30")
      expect(season?.id).toBeDefined()
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  describe("getById", () => {
    it("returns the season by id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const created = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      const caller = createTestCaller()
      const result = await caller.season.getById({ id: created?.id })
      expect(result).toBeDefined()
      expect(result?.name).toBe("2025/26")
    })

    it("returns undefined for non-existent id", async () => {
      const caller = createTestCaller()
      const result = await caller.season.getById({ id: "00000000-0000-0000-0000-000000000000" })
      expect(result).toBeUndefined()
    })
  })

  describe("getCurrent", () => {
    it("returns season that contains current date", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const now = new Date()
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)
      await admin.season.create({ name: "Current", seasonStart: start, seasonEnd: end })

      const caller = createTestCaller()
      const result = await caller.season.getCurrent()
      expect(result).toBeDefined()
      expect(result?.name).toBe("Current")
    })

    it("falls back to latest past season when between seasons", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.season.create({ name: "Older", seasonStart: "2022-09-01", seasonEnd: "2023-04-30" })
      await admin.season.create({ name: "Latest Past", seasonStart: "2023-09-01", seasonEnd: "2024-04-30" })

      const caller = createTestCaller()
      const result = await caller.season.getCurrent()
      expect(result).toBeDefined()
      expect(result?.name).toBe("Latest Past")
    })

    it("returns undefined when no seasons exist", async () => {
      const caller = createTestCaller()
      const result = await caller.season.getCurrent()
      expect(result).toBeUndefined()
    })
  })

  describe("update", () => {
    it("updates season fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      const updated = await admin.season.update({
        id: season?.id,
        name: "Updated Name",
        seasonEnd: "2026-05-31",
      })

      expect(updated?.name).toBe("Updated Name")
      expect(new Date(updated?.seasonEnd).toISOString().slice(0, 10)).toBe("2026-05-31")
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      const caller = createTestCaller()
      await expect(caller.season.update({ id: season?.id, name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a season", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      await admin.season.delete({ id: season?.id })

      const caller = createTestCaller()
      const result = await caller.season.getById({ id: season?.id })
      expect(result).toBeUndefined()
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      const caller = createTestCaller()
      await expect(caller.season.delete({ id: season?.id })).rejects.toThrow("Not authenticated")
    })
  })

  describe("structureCounts", () => {
    it("returns division counts per season", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })
      await admin.division.create({ seasonId: season?.id, name: "Division A" })
      await admin.division.create({ seasonId: season?.id, name: "Division B" })

      const caller = createTestCaller()
      const counts = await caller.season.structureCounts()
      expect(counts[season?.id]).toBe(2)
    })
  })

  describe("scaffoldFromTemplate", () => {
    it("scaffolds standard template with division, round, and team assignments", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })
      await admin.team.create({ name: "Team A", shortName: "TA" })
      await admin.team.create({ name: "Team B", shortName: "TB" })

      const result = await admin.season.scaffoldFromTemplate({
        seasonId: season?.id,
        template: "standard",
      })

      expect(result.divisionsCreated).toBe(1)
      expect(result.roundsCreated).toBe(1)
      expect(result.teamsAssigned).toBe(2)
    })

    it("copies structure from another season", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const source = await admin.season.create({ name: "2024/25", seasonStart: "2024-09-01", seasonEnd: "2025-04-30" })
      const target = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      const div = await admin.division.create({ seasonId: source?.id, name: "Liga" })
      await admin.round.create({ divisionId: div?.id, name: "Hauptrunde", pointsWin: 3 })

      const result = await admin.season.scaffoldFromTemplate({
        seasonId: target?.id,
        template: "copy",
        sourceSeasonId: source?.id,
      })

      expect(result.divisionsCreated).toBe(1)
      expect(result.roundsCreated).toBe(1)
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })

      const caller = createTestCaller()
      await expect(
        caller.season.scaffoldFromTemplate({
          seasonId: season?.id,
          template: "standard",
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  describe("getFullStructure", () => {
    it("returns full season structure with divisions, rounds, and team assignments", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })
      const div = await admin.division.create({ seasonId: season?.id, name: "Liga" })
      await admin.round.create({ divisionId: div?.id, name: "Hauptrunde" })
      await admin.teamDivision.assign({ teamId: team?.id, divisionId: div?.id })

      const caller = createTestCaller()
      const structure = await caller.season.getFullStructure({ id: season?.id })

      expect(structure).toBeDefined()
      expect(structure?.season.name).toBe("2025/26")
      expect(structure?.divisions).toHaveLength(1)
      expect(structure?.rounds).toHaveLength(1)
      expect(structure?.teamAssignments).toHaveLength(1)
      expect(structure?.teamAssignments[0]?.team.name).toBe("Eagles")
    })

    it("returns null for non-existent season", async () => {
      const caller = createTestCaller()
      const result = await caller.season.getFullStructure({
        id: "00000000-0000-0000-0000-000000000000",
      })
      expect(result).toBeNull()
    })
  })
})
