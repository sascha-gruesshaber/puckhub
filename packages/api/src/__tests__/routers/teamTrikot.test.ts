import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("team-trikot router", () => {
  async function createTeamTrikotFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const team = await admin.team.create({ name: "Test Team", shortName: "TT" })
    const templates = await admin.trikotTemplate.list()
    const templateId = templates[0]?.id

    let trikot: Awaited<ReturnType<typeof admin.trikot.create>> | undefined
    if (templateId) {
      trikot = await admin.trikot.create({
        name: "Test Trikot",
        templateId,
        primaryColor: "#FF0000",
      })
    }

    return { team: team!, trikot, templateId }
  }

  describe("listByTeam", () => {
    it("returns empty list when team has no trikots", async () => {
      const { team } = await createTeamTrikotFixtures()
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.teamTrikot.listByTeam({ teamId: team.id })
      expect(result).toEqual([])
    })

    it("returns trikots assigned to a team", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "Home Kit",
        })

        const reader = createTestCaller({ asAdmin: true })
        const result = await reader.teamTrikot.listByTeam({ teamId: team.id })
        expect(result).toHaveLength(1)
        expect(result[0]?.name).toBe("Home Kit")
        expect(result[0]?.teamId).toBe(team.id)
      }
    })

    it("rejects unauthenticated access", async () => {
      const { team } = await createTeamTrikotFixtures()
      const publicCaller = createTestCaller()
      await expect(publicCaller.teamTrikot.listByTeam({ teamId: team.id })).rejects.toThrow("Not authenticated")
    })
  })

  describe("listByTrikot", () => {
    it("returns empty list when trikot is not assigned to any team", async () => {
      const { trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const admin = createTestCaller({ asAdmin: true })
        const result = await admin.teamTrikot.listByTrikot({ trikotId: trikot.id })
        expect(result).toEqual([])
      }
    })

    it("returns teams assigned to a trikot", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "Home Kit",
        })

        const reader = createTestCaller({ asAdmin: true })
        const result = await reader.teamTrikot.listByTrikot({ trikotId: trikot.id })
        expect(result).toHaveLength(1)
        expect(result[0]?.team.id).toBe(team.id)
      }
    })

    it("rejects unauthenticated access", async () => {
      const { trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const publicCaller = createTestCaller()
        await expect(publicCaller.teamTrikot.listByTrikot({ trikotId: trikot.id })).rejects.toThrow("Not authenticated")
      }
    })
  })

  describe("assign", () => {
    it("assigns a trikot to a team", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const assignment = await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "Away Kit",
        })

        expect(assignment?.teamId).toBe(team.id)
        expect(assignment?.trikotId).toBe(trikot.id)
        expect(assignment?.name).toBe("Away Kit")
      }
    })

    it("rejects unauthenticated calls", async () => {
      const { team, trikot } = await createTeamTrikotFixtures()
      const caller = createTestCaller()

      if (trikot) {
        await expect(
          caller.teamTrikot.assign({
            teamId: team.id,
            trikotId: trikot.id,
            name: "Unauthorized Kit",
          }),
        ).rejects.toThrow("Not authenticated")
      }
    })
  })

  describe("update", () => {
    it("updates team trikot assignment name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const assignment = await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "Original Name",
        })

        const updated = await admin.teamTrikot.update({
          id: assignment?.id,
          name: "Updated Name",
        })

        expect(updated?.name).toBe("Updated Name")
      }
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const assignment = await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "Original",
        })

        const caller = createTestCaller()
        await expect(
          caller.teamTrikot.update({
            id: assignment?.id,
            name: "Hacked",
          }),
        ).rejects.toThrow("Not authenticated")
      }
    })
  })

  describe("remove", () => {
    it("removes a team trikot assignment", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const assignment = await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "To Remove",
        })

        await admin.teamTrikot.remove({ id: assignment?.id })

        const result = await admin.teamTrikot.listByTeam({ teamId: team.id })
        expect(result).toHaveLength(0)
      }
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const { team, trikot } = await createTeamTrikotFixtures()

      if (trikot) {
        const assignment = await admin.teamTrikot.assign({
          teamId: team.id,
          trikotId: trikot.id,
          name: "Protected",
        })

        const caller = createTestCaller()
        await expect(caller.teamTrikot.remove({ id: assignment?.id })).rejects.toThrow("Not authenticated")
      }
    })
  })
})
