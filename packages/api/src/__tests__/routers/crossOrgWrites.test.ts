import { beforeEach, describe, expect, it } from "vitest"
import { createOtherOrgAdminCaller, createTestCaller, getTestDb, OTHER_ORG_ID, seedSecondOrg } from "../testUtils"

/**
 * Cross-organization write protection.
 *
 * Every mutation that takes a foreign id (round, division, season, team,
 * player, trikot, page) must refuse ids that belong to another organization,
 * even when the caller is an admin of their own organization. Foreign ids are
 * reported as NOT_FOUND so they are indistinguishable from missing rows.
 */

async function seedStructure(caller: ReturnType<typeof createTestCaller>, tag: string) {
  const season = (await caller.season.create({
    name: `Season ${tag}`,
    seasonStart: "2025-09-01",
    seasonEnd: "2026-04-30",
  }))!
  const division = (await caller.division.create({ seasonId: season.id, name: `Liga ${tag}` }))!
  const round = (await caller.round.create({ divisionId: division.id, name: `Runde ${tag}` }))!
  const homeTeam = (await caller.team.create({ name: `Home ${tag}`, shortName: "HOM" }))!
  const awayTeam = (await caller.team.create({ name: `Away ${tag}`, shortName: "AWY" }))!
  await caller.teamDivision.assign({ teamId: homeTeam.id, divisionId: division.id })
  await caller.teamDivision.assign({ teamId: awayTeam.id, divisionId: division.id })
  const player = (await caller.player.create({ firstName: "Pat", lastName: tag }))!
  await caller.contract.signPlayer({
    playerId: player.id,
    teamId: homeTeam.id,
    seasonId: season.id,
    position: "forward",
  })
  const game = (await caller.game.create({ roundId: round.id, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id }))!
  const page = (await caller.page.create({ title: `Page ${tag}`, content: "<p>hi</p>" }))!
  return { season, division, round, homeTeam, awayTeam, player, game, page }
}

describe("cross-organization writes are rejected", () => {
  let attacker: ReturnType<typeof createTestCaller>
  let victim: ReturnType<typeof createOtherOrgAdminCaller>
  let own: Awaited<ReturnType<typeof seedStructure>>
  let foreign: Awaited<ReturnType<typeof seedStructure>>

  beforeEach(async () => {
    await seedSecondOrg()
    attacker = createTestCaller({ asAdmin: true })
    victim = createOtherOrgAdminCaller()
    own = await seedStructure(attacker, "A")
    foreign = await seedStructure(victim, "B")
  })

  it("bonusPoints.create refuses a foreign round and leaves foreign standings untouched", async () => {
    await expect(
      attacker.bonusPoints.create({ teamId: own.homeTeam.id, roundId: foreign.round.id, points: 3 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.bonusPoints.create({ teamId: foreign.homeTeam.id, roundId: own.round.id, points: 3 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })

    const foreignStandings = await getTestDb().standing.findMany({ where: { roundId: foreign.round.id } })
    expect(foreignStandings).toHaveLength(0)
  })

  it("standings.recalculate / recalculateAll refuse foreign ids", async () => {
    await expect(attacker.standings.recalculate({ roundId: foreign.round.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await expect(attacker.standings.recalculateAll({ divisionId: foreign.division.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("stats.recalculate refuses a foreign season", async () => {
    await expect(attacker.stats.recalculate({ seasonId: foreign.season.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("round.create and division.create refuse foreign parents", async () => {
    await expect(attacker.round.create({ divisionId: foreign.division.id, name: "Injected" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await expect(attacker.division.create({ seasonId: foreign.season.id, name: "Injected" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    const injected = await getTestDb().round.findFirst({ where: { divisionId: foreign.division.id, name: "Injected" } })
    expect(injected).toBeNull()
  })

  it("season.scaffoldFromTemplate refuses a foreign season", async () => {
    await expect(
      attacker.season.scaffoldFromTemplate({ seasonId: foreign.season.id, template: "standard" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("teamDivision.assign refuses foreign team or division", async () => {
    await expect(
      attacker.teamDivision.assign({ teamId: foreign.homeTeam.id, divisionId: own.division.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.teamDivision.assign({ teamId: own.homeTeam.id, divisionId: foreign.division.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("game.create / update / generateDoubleRoundRobin refuse foreign rounds and teams", async () => {
    await expect(
      attacker.game.create({ roundId: foreign.round.id, homeTeamId: own.homeTeam.id, awayTeamId: own.awayTeam.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.game.create({ roundId: own.round.id, homeTeamId: foreign.homeTeam.id, awayTeamId: own.awayTeam.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(attacker.game.update({ id: own.game.id, roundId: foreign.round.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await expect(
      attacker.game.generateDoubleRoundRobin({
        seasonId: foreign.season.id,
        divisionId: foreign.division.id,
        roundId: foreign.round.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })

    const foreignGames = await getTestDb().game.count({ where: { roundId: foreign.round.id } })
    expect(foreignGames).toBe(1)
  })

  it("contract.signPlayer / transferPlayer / releasePlayer refuse foreign player, team and season", async () => {
    await expect(
      attacker.contract.signPlayer({
        playerId: foreign.player.id,
        teamId: own.homeTeam.id,
        seasonId: own.season.id,
        position: "forward",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.contract.signPlayer({
        playerId: own.player.id,
        teamId: foreign.homeTeam.id,
        seasonId: own.season.id,
        position: "forward",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })

    const contract = (await getTestDb().contract.findFirst({ where: { playerId: own.player.id } }))!
    await expect(
      attacker.contract.transferPlayer({
        contractId: contract.id,
        newTeamId: foreign.awayTeam.id,
        seasonId: own.season.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.contract.releasePlayer({ contractId: contract.id, seasonId: foreign.season.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("gameReport.setLineup / addEvent / addSuspension refuse foreign players and teams", async () => {
    await expect(
      attacker.gameReport.setLineup({
        gameId: own.game.id,
        players: [{ playerId: foreign.player.id, teamId: own.homeTeam.id, position: "forward" }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.gameReport.addEvent({
        gameId: own.game.id,
        eventType: "goal",
        teamId: own.homeTeam.id,
        period: 1,
        timeMinutes: 1,
        timeSeconds: 0,
        scorerId: foreign.player.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      attacker.gameReport.addSuspension({
        gameId: own.game.id,
        playerId: foreign.player.id,
        teamId: own.homeTeam.id,
        suspensionType: "match_penalty",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("sponsor.create refuses a foreign team", async () => {
    await expect(attacker.sponsor.create({ name: "Sponsor", teamId: foreign.homeTeam.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("page.createAlias refuses a foreign target page", async () => {
    await expect(attacker.page.createAlias({ title: "Alias", targetPageId: foreign.page.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("own-organization writes still work", async () => {
    const bp = await attacker.bonusPoints.create({ teamId: own.homeTeam.id, roundId: own.round.id, points: 2 })
    expect(bp.organizationId).not.toBe(OTHER_ORG_ID)
    expect(bp.roundId).toBe(own.round.id)
    await expect(attacker.standings.recalculate({ roundId: own.round.id })).resolves.toEqual({ success: true })
    await expect(attacker.round.create({ divisionId: own.division.id, name: "Playoffs" })).resolves.toMatchObject({
      divisionId: own.division.id,
    })
  })
})
