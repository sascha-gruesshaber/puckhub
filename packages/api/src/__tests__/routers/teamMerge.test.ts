import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

/**
 * Legacy systems have no rename: the club is re-created under its new name and the
 * players are moved by hand, leaving two unrelated team records. Merging puts the
 * franchise back together.
 */
describe("team.merge", () => {
  async function createRenameFixtures() {
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

    const oldTeam = (await admin.team.create({ name: "Taxi Pepe Drivers", shortName: "TPD" }))!
    const newTeam = (await admin.team.create({ name: "EV Kaufbeuren", shortName: "EVK" }))!
    const player = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!

    // The old club's season
    const div2023 = (await admin.division.create({ seasonId: s2023.id, name: "Liga A" }))!
    await admin.teamDivision.assign({ teamId: oldTeam.id, divisionId: div2023.id })
    // The new club's season
    const div2024 = (await admin.division.create({ seasonId: s2024.id, name: "Liga A" }))!
    await admin.teamDivision.assign({ teamId: newTeam.id, divisionId: div2024.id })

    // The player was "moved" by hand: closed contract at the old club, new one at the new club
    const oldContract = (await admin.contract.signPlayer({
      playerId: player.id,
      teamId: oldTeam.id,
      seasonId: s2023.id,
      position: "forward",
    }))!
    await admin.contract.releasePlayer({ contractId: oldContract.id, seasonId: s2023.id })
    const newContract = (await admin.contract.signPlayer({
      playerId: player.id,
      teamId: newTeam.id,
      seasonId: s2024.id,
      position: "forward",
    }))!

    return { admin, s2023, s2024, oldTeam, newTeam, player, oldContract, newContract }
  }

  it("previews what would move and allows the merge", async () => {
    const { admin, oldTeam, newTeam, s2023 } = await createRenameFixtures()

    const preview = await admin.team.mergePreview({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })

    expect(preview.canMerge).toBe(true)
    expect(preview.moves.contract).toBe(1)
    expect(preview.moves.teamDivision).toBe(1)
    expect(preview.suggestedNameChangeSeasonId).toBe(s2023.id)
    expect(preview.source.name).toBe("Taxi Pepe Drivers")
  })

  it("moves every row onto the surviving team and deletes the old one", async () => {
    const { admin, oldTeam, newTeam, player } = await createRenameFixtures()

    const result = await admin.team.merge({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })

    expect(result.moved.contract).toBe(1)
    expect(result.moved.teamDivision).toBe(1)
    expect(await admin.team.getById({ id: oldTeam.id })).toBeNull()

    const contracts = await admin.contract.getByPlayer({ playerId: player.id })
    expect(contracts).toHaveLength(2)
    expect(contracts.every((c) => c.teamId === newTeam.id)).toBe(true)
  })

  it("records the former name so past seasons keep it", async () => {
    const { admin, oldTeam, newTeam, s2023 } = await createRenameFixtures()

    await admin.team.merge({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })

    const history = await admin.team.history({ teamId: newTeam.id })
    expect(history?.formerNames).toEqual([
      { name: "Taxi Pepe Drivers", shortName: "TPD", logoUrl: null, untilSeasonId: s2023.id },
    ])

    const season2023 = history?.seasons.find((s) => s.season.id === s2023.id)
    expect(season2023?.teamName.name).toBe("Taxi Pepe Drivers")
  })

  it("links the handed-over contracts as one uninterrupted spell", async () => {
    const { admin, oldTeam, newTeam, oldContract, newContract } = await createRenameFixtures()

    const result = await admin.team.merge({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })

    expect(result.linkedContracts).toBe(1)
    const db = getTestDb()
    const later = await db.contract.findFirst({ where: { id: newContract.id } })
    expect(later?.previousContractId).toBe(oldContract.id)

    const history = await admin.team.history({ teamId: newTeam.id })
    expect(history?.continuedContractIds).toContain(oldContract.id)
  })

  it("refuses to merge two teams that played in the same season", async () => {
    const { admin, oldTeam, newTeam, s2023 } = await createRenameFixtures()
    const division = await admin.division.listBySeason({ seasonId: s2023.id })
    await admin.teamDivision.assign({ teamId: newTeam.id, divisionId: division[0]!.id })

    const preview = await admin.team.mergePreview({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })
    expect(preview.canMerge).toBe(false)
    expect(preview.conflicts.sharedSeasons).toHaveLength(1)

    await expect(admin.team.merge({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })).rejects.toThrow()
  })

  it("refuses to merge a team into itself", async () => {
    const { admin, oldTeam } = await createRenameFixtures()

    await expect(admin.team.mergePreview({ sourceTeamId: oldTeam.id, targetTeamId: oldTeam.id })).rejects.toThrow()
  })

  it("rejects unauthenticated calls", async () => {
    const { oldTeam, newTeam } = await createRenameFixtures()
    const caller = createTestCaller()

    await expect(caller.team.merge({ sourceTeamId: oldTeam.id, targetTeamId: newTeam.id })).rejects.toThrow()
  })
})

/**
 * The merge deletes the source team at the end, and every team reference cascades on
 * delete. A model that is not moved is therefore not merged — it is destroyed.
 */
describe("team merge coverage", () => {
  it("accounts for every model that references a team", async () => {
    const { readFileSync } = await import("node:fs")
    const { dirname, resolve } = await import("node:path")
    const { fileURLToPath } = await import("node:url")
    const { findUnhandledTeamModels, parseTeamReferencingModelsFromSchema } = await import("../../services/teamMerge")

    const __dir = dirname(fileURLToPath(import.meta.url))
    const schemaPath = resolve(__dir, "../../../../db/prisma/schema.prisma")
    const teamModels = parseTeamReferencingModelsFromSchema(readFileSync(schemaPath, "utf-8"))

    expect(teamModels.length, "the parser should find the team-referencing models").toBeGreaterThan(10)

    const unhandled = findUnhandledTeamModels(teamModels)
    expect(unhandled, `Models referencing a team but missing from team.merge: ${unhandled.join(", ")}`).toEqual([])
  })
})
