import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("contract router", () => {
  async function createContractFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }))!
    const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const player = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!
    return { season, team, player }
  }

  describe("signPlayer", () => {
    it("signs a player to a team", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const contract = await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "forward",
        jerseyNumber: 99,
      })

      expect(contract?.playerId).toBe(player.id)
      expect(contract?.teamId).toBe(team.id)
      expect(contract?.position).toBe("forward")
      expect(contract?.jerseyNumber).toBe(99)
      expect(contract?.endSeasonId).toBeNull()
    })

    it("rejects signing a player who already has an active contract", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })
      const otherTeam = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!

      await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "forward",
      })

      await expect(
        admin.contract.signPlayer({
          playerId: player.id,
          teamId: otherTeam.id,
          seasonId: season.id,
          position: "defense",
        }),
      ).rejects.toThrow()
    })

    it("rejects unauthenticated calls", async () => {
      const { season, team, player } = await createContractFixtures()
      const caller = createTestCaller()

      await expect(
        caller.contract.signPlayer({
          playerId: player.id,
          teamId: team.id,
          seasonId: season.id,
          position: "forward",
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  describe("rosterForSeason", () => {
    it("returns the roster for a team in a season", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "goalie",
        jerseyNumber: 1,
      })

      const roster = await admin.contract.rosterForSeason({
        teamId: team.id,
        seasonId: season.id,
      })

      expect(roster).toHaveLength(1)
      expect(roster[0]?.player.firstName).toBe("Max")
      expect(roster[0]?.player.lastName).toBe("Müller")
      expect(roster[0]?.position).toBe("goalie")
    })

    it("excludes players whose contracts ended before the season", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season2024 = (await admin.season.create({
        name: "2024/25",
        seasonStart: "2024-09-01",
        seasonEnd: "2025-04-30",
      }))!
      const season2025 = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const player = (await admin.player.create({ firstName: "Old", lastName: "Player" }))!

      const contract = await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season2024.id,
        position: "forward",
      })

      // End the contract in the 2024 season
      await admin.contract.releasePlayer({
        contractId: contract?.id,
        seasonId: season2024.id,
      })

      const roster = await admin.contract.rosterForSeason({
        teamId: team.id,
        seasonId: season2025.id,
      })

      expect(roster).toHaveLength(0)
    })
  })

  describe("getByPlayer", () => {
    it("returns contract history for a player", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "defense",
      })

      const history = await admin.contract.getByPlayer({ playerId: player.id })
      expect(history).toHaveLength(1)
      expect(history[0]?.position).toBe("defense")
    })
  })

  describe("transferPlayer", () => {
    it("closes old contract and creates new one", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season2024 = (await admin.season.create({
        name: "2024/25",
        seasonStart: "2024-09-01",
        seasonEnd: "2025-04-30",
      }))!
      const season2025 = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const oldTeam = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const newTeam = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
      const player = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!

      const oldContract = await admin.contract.signPlayer({
        playerId: player.id,
        teamId: oldTeam.id,
        seasonId: season2024.id,
        position: "forward",
      })

      const newContract = await admin.contract.transferPlayer({
        contractId: oldContract?.id,
        newTeamId: newTeam.id,
        seasonId: season2025.id,
        position: "defense",
        jerseyNumber: 7,
      })

      expect(newContract?.teamId).toBe(newTeam.id)
      expect(newContract?.position).toBe("defense")
      expect(newContract?.jerseyNumber).toBe(7)

      // Old contract should be closed
      const history = await admin.contract.getByPlayer({ playerId: player.id })
      const closedContract = history.find((c) => c.id === oldContract?.id)
      expect(closedContract?.endSeasonId).toBeDefined()
    })
  })

  describe("releasePlayer", () => {
    it("closes a contract", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const contract = await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "forward",
      })

      const released = await admin.contract.releasePlayer({
        contractId: contract?.id,
        seasonId: season.id,
      })

      expect(released?.endSeasonId).toBe(season.id)
    })

    it("rejects releasing an already-ended contract", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const contract = await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "forward",
      })

      await admin.contract.releasePlayer({
        contractId: contract?.id,
        seasonId: season.id,
      })

      await expect(
        admin.contract.releasePlayer({
          contractId: contract?.id,
          seasonId: season.id,
        }),
      ).rejects.toThrow()
    })
  })

  describe("updateContract", () => {
    it("updates position and jersey number", async () => {
      const { season, team, player } = await createContractFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const contract = await admin.contract.signPlayer({
        playerId: player.id,
        teamId: team.id,
        seasonId: season.id,
        position: "forward",
        jerseyNumber: 10,
      })

      const updated = await admin.contract.updateContract({
        id: contract?.id,
        position: "defense",
        jerseyNumber: 5,
      })

      expect(updated?.position).toBe("defense")
      expect(updated?.jerseyNumber).toBe(5)
    })
  })
})
