import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

/**
 * Splitting an imported contract is how a player's real history is restored: legacy
 * systems store only today's position, so a migrated goalie who moved to forward years
 * ago looks like he was a forward for his whole career.
 */
describe("contract.splitContract", () => {
  async function createCareerFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const s2023 = (await admin.season.create({
      name: "2023/24",
      seasonStart: "2023-09-01",
      seasonEnd: "2024-04-30",
    }))!
    const s2024 = (await admin.season.create({
      name: "2024/25",
      seasonStart: "2024-09-01",
      seasonEnd: "2025-04-30",
    }))!
    const s2025 = (await admin.season.create({
      name: "2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!
    const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const player = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!
    const contract = (await admin.contract.signPlayer({
      playerId: player.id,
      teamId: team.id,
      seasonId: s2023.id,
      position: "forward",
      jerseyNumber: 12,
    }))!

    return { admin, s2023, s2024, s2025, team, player, contract }
  }

  it("closes the old contract and opens a new one at the split season", async () => {
    const { admin, s2023, s2024, s2025, contract } = await createCareerFixtures()

    const result = await admin.contract.splitContract({
      contractId: contract.id,
      splitAtSeasonId: s2025.id,
      position: "goalie",
      jerseyNumber: 1,
    })

    expect(result.earlier.endSeasonId).toBe(s2024.id)
    expect(result.earlier.position).toBe("forward")
    expect(result.earlier.startSeasonId).toBe(s2023.id)

    expect(result.later.startSeasonId).toBe(s2025.id)
    expect(result.later.endSeasonId).toBeNull()
    expect(result.later.position).toBe("goalie")
    expect(result.later.jerseyNumber).toBe(1)
    expect(result.later.previousContractId).toBe(contract.id)
  })

  it("keeps the original end season on the new contract", async () => {
    const { admin, s2024, s2025, contract } = await createCareerFixtures()
    await admin.contract.releasePlayer({ contractId: contract.id, seasonId: s2025.id })

    const result = await admin.contract.splitContract({
      contractId: contract.id,
      splitAtSeasonId: s2025.id,
      position: "defense",
    })

    expect(result.earlier.endSeasonId).toBe(s2024.id)
    expect(result.later.endSeasonId).toBe(s2025.id)
  })

  it("carries position and jersey number over when they are not given", async () => {
    const { admin, s2024, contract } = await createCareerFixtures()

    const result = await admin.contract.splitContract({
      contractId: contract.id,
      splitAtSeasonId: s2024.id,
    })

    expect(result.later.position).toBe("forward")
    expect(result.later.jerseyNumber).toBe(12)
  })

  it("rejects splitting at the season the contract started in", async () => {
    const { admin, s2023, contract } = await createCareerFixtures()

    await expect(
      admin.contract.splitContract({ contractId: contract.id, splitAtSeasonId: s2023.id, position: "goalie" }),
    ).rejects.toThrow()
  })

  it("rejects splitting after the contract ended", async () => {
    const { admin, s2024, s2025, contract } = await createCareerFixtures()
    await admin.contract.releasePlayer({ contractId: contract.id, seasonId: s2024.id })

    await expect(
      admin.contract.splitContract({ contractId: contract.id, splitAtSeasonId: s2025.id, position: "goalie" }),
    ).rejects.toThrow()
  })

  it("rejects a second contract starting in the same season for the same team", async () => {
    const { admin, s2024, s2025, contract } = await createCareerFixtures()
    const first = await admin.contract.splitContract({
      contractId: contract.id,
      splitAtSeasonId: s2024.id,
      position: "goalie",
    })

    await expect(
      admin.contract.splitContract({ contractId: contract.id, splitAtSeasonId: s2024.id, position: "defense" }),
    ).rejects.toThrow()

    // a career with three positions is two splits — the second one splits the new spell
    const second = await admin.contract.splitContract({
      contractId: first.later.id,
      splitAtSeasonId: s2025.id,
      position: "defense",
    })
    expect(second.earlier.endSeasonId).toBe(s2024.id)
    expect(second.later.startSeasonId).toBe(s2025.id)
    expect(second.later.previousContractId).toBe(first.later.id)
  })

  it("rejects unauthenticated calls", async () => {
    const { s2024, contract } = await createCareerFixtures()
    const caller = createTestCaller()

    await expect(
      caller.contract.splitContract({ contractId: contract.id, splitAtSeasonId: s2024.id }),
    ).rejects.toThrow()
  })

  it("shows both spells in the player's contract history", async () => {
    const { admin, s2025, player, contract } = await createCareerFixtures()
    await admin.contract.splitContract({ contractId: contract.id, splitAtSeasonId: s2025.id, position: "goalie" })

    const history = await admin.contract.getByPlayer({ playerId: player.id })
    expect(history).toHaveLength(2)
    expect(history.map((c) => c.position).sort()).toEqual(["forward", "goalie"])
  })
})

/**
 * Season stats carry no position of their own — it is read from the contract. Once a
 * spell is split, the contract that covers *that* season has to be the one consulted.
 */
describe("position filters after a split", () => {
  it("filters season stats by the position held in that season", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const db = getTestDb()

    const s2023 = (await admin.season.create({
      name: "2023/24",
      seasonStart: "2023-09-01",
      seasonEnd: "2024-04-30",
    }))!
    const s2024 = (await admin.season.create({
      name: "2024/25",
      seasonStart: "2024-09-01",
      seasonEnd: "2025-04-30",
    }))!
    const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const player = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!

    const contract = (await admin.contract.signPlayer({
      playerId: player.id,
      teamId: team.id,
      seasonId: s2023.id,
      position: "defense",
    }))!
    await admin.contract.splitContract({
      contractId: contract.id,
      splitAtSeasonId: s2024.id,
      position: "forward",
    })

    for (const seasonId of [s2023.id, s2024.id]) {
      await db.playerSeasonStat.create({
        data: {
          organizationId: TEST_ORG_ID,
          playerId: player.id,
          teamId: team.id,
          seasonId,
          gamesPlayed: 10,
          goals: 5,
          assists: 5,
          totalPoints: 10,
        },
      })
    }

    const defense2023 = await admin.stats.playerStats({ seasonId: s2023.id, position: "defense" })
    const forward2023 = await admin.stats.playerStats({ seasonId: s2023.id, position: "forward" })
    const forward2024 = await admin.stats.playerStats({ seasonId: s2024.id, position: "forward" })
    const defense2024 = await admin.stats.playerStats({ seasonId: s2024.id, position: "defense" })

    expect(defense2023).toHaveLength(1)
    expect(forward2023).toHaveLength(0)
    expect(forward2024).toHaveLength(1)
    expect(defense2024).toHaveLength(0)
  })
})

describe("contracts after a split", () => {
  it("refuses to reopen the earlier half of a split spell", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const s2023 = (await admin.season.create({
      name: "2023/24",
      seasonStart: "2023-09-01",
      seasonEnd: "2024-04-30",
    }))!
    const s2024 = (await admin.season.create({
      name: "2024/25",
      seasonStart: "2024-09-01",
      seasonEnd: "2025-04-30",
    }))!
    const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const player = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!
    const contract = (await admin.contract.signPlayer({
      playerId: player.id,
      teamId: team.id,
      seasonId: s2023.id,
      position: "goalie",
    }))!

    await admin.contract.splitContract({ contractId: contract.id, splitAtSeasonId: s2024.id, position: "forward" })

    await expect(admin.contract.reopenContract({ id: contract.id })).rejects.toThrow()
  })
})
