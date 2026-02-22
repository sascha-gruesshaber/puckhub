import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("teamDivision router", () => {
  async function createFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }))!
    const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
    const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    return { season, division, team }
  }

  describe("assign", () => {
    it("assigns a team to a division", async () => {
      const { division, team } = await createFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const assignment = await admin.teamDivision.assign({
        teamId: team.id,
        divisionId: division.id,
      })

      expect(assignment?.teamId).toBe(team.id)
      expect(assignment?.divisionId).toBe(division.id)
    })

    it("returns existing assignment if already assigned (idempotent)", async () => {
      const { division, team } = await createFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const first = await admin.teamDivision.assign({
        teamId: team.id,
        divisionId: division.id,
      })
      const second = await admin.teamDivision.assign({
        teamId: team.id,
        divisionId: division.id,
      })

      expect(first?.id).toBe(second?.id)
    })

    it("rejects unauthenticated calls", async () => {
      const { division, team } = await createFixtures()
      const caller = createTestCaller()

      await expect(
        caller.teamDivision.assign({
          teamId: team.id,
          divisionId: division.id,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  describe("listByDivision", () => {
    it("returns teams assigned to a division with team details", async () => {
      const { division, team } = await createFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await admin.teamDivision.assign({ teamId: team.id, divisionId: division.id })

      const reader = createTestCaller({ asAdmin: true })
      const result = await reader.teamDivision.listByDivision({ divisionId: division.id })

      expect(result).toHaveLength(1)
      expect(result[0]?.team.name).toBe("Eagles")
      expect(result[0]?.team.shortName).toBe("EAG")
    })
  })

  describe("remove", () => {
    it("removes a team from a division", async () => {
      const { division, team } = await createFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const assignment = await admin.teamDivision.assign({
        teamId: team.id,
        divisionId: division.id,
      })

      await admin.teamDivision.remove({ id: assignment?.id })

      const result = await admin.teamDivision.listByDivision({ divisionId: division.id })
      expect(result).toHaveLength(0)
    })

    it("rejects unauthenticated calls", async () => {
      const { division, team } = await createFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const assignment = await admin.teamDivision.assign({
        teamId: team.id,
        divisionId: division.id,
      })

      const caller = createTestCaller()
      await expect(caller.teamDivision.remove({ id: assignment?.id })).rejects.toThrow("Not authenticated")
    })
  })
})
