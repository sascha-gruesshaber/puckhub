import { TRPCError } from "@trpc/server"
import { beforeEach, describe, expect, it } from "vitest"
import { createTestCaller, createPlatformAdminCaller, createOtherOrgAdminCaller, createCrossOrgCaller, seedSecondOrg } from "../testUtils"

const FAKE_ID = "00000000-0000-0000-0000-000000000000"

/**
 * Helper for public procedure tests: asserts the call does NOT throw UNAUTHORIZED.
 * Other errors (NOT_FOUND, BAD_REQUEST, etc.) are acceptable since we use fake IDs.
 */
async function expectNotUnauthorized(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    if (err instanceof TRPCError && err.code === "UNAUTHORIZED") {
      throw new Error(`Expected public access but got UNAUTHORIZED: ${err.message}`)
    }
    // Any other error is fine — the procedure ran past the auth check
  }
}

describe("authorization", () => {
  describe("admin procedures reject unauthenticated access", () => {
    let caller: ReturnType<typeof createTestCaller>
    beforeEach(() => {
      caller = createTestCaller()
    })

    describe("season", () => {
      it("create requires auth", async () => {
        await expect(
          caller.season.create({ name: "Test", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }),
        ).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.season.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.season.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("scaffoldFromTemplate requires auth", async () => {
        await expect(caller.season.scaffoldFromTemplate({ seasonId: FAKE_ID, template: "standard" })).rejects.toThrow(
          "Not authenticated",
        )
      })
    })

    describe("division", () => {
      it("create requires auth", async () => {
        await expect(caller.division.create({ name: "Test", seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.division.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.division.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("round", () => {
      it("create requires auth", async () => {
        await expect(caller.round.create({ name: "Test", divisionId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.round.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.round.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("team", () => {
      it("create requires auth", async () => {
        await expect(caller.team.create({ name: "Test", shortName: "TST" })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.team.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.team.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("teamDivision", () => {
      it("assign requires auth", async () => {
        await expect(caller.teamDivision.assign({ teamId: FAKE_ID, divisionId: FAKE_ID })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("remove requires auth", async () => {
        await expect(caller.teamDivision.remove({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("player", () => {
      it("create requires auth", async () => {
        await expect(caller.player.create({ firstName: "Test", lastName: "Player" })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("update requires auth", async () => {
        await expect(caller.player.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.player.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("contract", () => {
      it("signPlayer requires auth", async () => {
        await expect(
          caller.contract.signPlayer({
            playerId: FAKE_ID,
            teamId: FAKE_ID,
            seasonId: FAKE_ID,
            position: "forward",
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("transferPlayer requires auth", async () => {
        await expect(
          caller.contract.transferPlayer({
            contractId: FAKE_ID,
            newTeamId: FAKE_ID,
            seasonId: FAKE_ID,
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("releasePlayer requires auth", async () => {
        await expect(caller.contract.releasePlayer({ contractId: FAKE_ID, seasonId: FAKE_ID })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("updateContract requires auth", async () => {
        await expect(caller.contract.updateContract({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("game", () => {
      it("create requires auth", async () => {
        await expect(
          caller.game.create({
            roundId: FAKE_ID,
            homeTeamId: FAKE_ID,
            awayTeamId: FAKE_ID,
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("complete requires auth", async () => {
        await expect(caller.game.complete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("cancel requires auth", async () => {
        await expect(caller.game.cancel({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("reopen requires auth", async () => {
        await expect(caller.game.reopen({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.game.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.game.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("generateDoubleRoundRobin requires auth", async () => {
        await expect(
          caller.game.generateDoubleRoundRobin({ seasonId: FAKE_ID, divisionId: FAKE_ID, roundId: FAKE_ID }),
        ).rejects.toThrow("Not authenticated")
      })

      it("deleteMany requires auth", async () => {
        await expect(caller.game.deleteMany({ ids: [FAKE_ID] })).rejects.toThrow("Not authenticated")
      })
    })

    describe("bonusPoints", () => {
      it("create requires auth", async () => {
        await expect(
          caller.bonusPoints.create({ teamId: FAKE_ID, roundId: FAKE_ID, points: 1 }),
        ).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.bonusPoints.update({ id: FAKE_ID, points: 2 })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.bonusPoints.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("standings", () => {
      it("recalculate requires auth", async () => {
        await expect(caller.standings.recalculate({ roundId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("recalculateAll requires auth", async () => {
        await expect(caller.standings.recalculateAll({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("stats", () => {
      it("recalculate requires auth", async () => {
        await expect(caller.stats.recalculate({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("trikot", () => {
      it("create requires auth", async () => {
        await expect(
          caller.trikot.create({
            name: "Test",
            templateId: FAKE_ID,
            primaryColor: "#000000",
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.trikot.update({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.trikot.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("teamTrikot", () => {
      it("assign requires auth", async () => {
        await expect(
          caller.teamTrikot.assign({
            teamId: FAKE_ID,
            trikotId: FAKE_ID,
            name: "Home",
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.teamTrikot.update({ id: FAKE_ID, name: "Away" })).rejects.toThrow("Not authenticated")
      })

      it("remove requires auth", async () => {
        await expect(caller.teamTrikot.remove({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("sponsor", () => {
      it("create requires auth", async () => {
        await expect(caller.sponsor.create({ name: "Test Sponsor" })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.sponsor.update({ id: FAKE_ID, name: "Updated" })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.sponsor.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("gameReport", () => {
      it("setLineup requires auth", async () => {
        await expect(caller.gameReport.setLineup({ gameId: FAKE_ID, players: [] })).rejects.toThrow("Not authenticated")
      })

      it("addEvent requires auth", async () => {
        await expect(
          caller.gameReport.addEvent({
            gameId: FAKE_ID,
            eventType: "goal",
            teamId: FAKE_ID,
            period: 1,
            timeMinutes: 5,
            timeSeconds: 0,
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("updateEvent requires auth", async () => {
        await expect(caller.gameReport.updateEvent({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("deleteEvent requires auth", async () => {
        await expect(caller.gameReport.deleteEvent({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("addSuspension requires auth", async () => {
        await expect(
          caller.gameReport.addSuspension({
            gameId: FAKE_ID,
            playerId: FAKE_ID,
            teamId: FAKE_ID,
            suspensionType: "match_penalty",
          }),
        ).rejects.toThrow("Not authenticated")
      })

      it("updateSuspension requires auth", async () => {
        await expect(caller.gameReport.updateSuspension({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("deleteSuspension requires auth", async () => {
        await expect(caller.gameReport.deleteSuspension({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("settings", () => {
      it("update requires auth", async () => {
        await expect(
          caller.settings.update({
            leagueName: "Test",
            leagueShortName: "T",
            locale: "de-DE",
            timezone: "Europe/Berlin",
            pointsWin: 2,
            pointsDraw: 1,
            pointsLoss: 0,
          }),
        ).rejects.toThrow("Not authenticated")
      })
    })

    describe("venue", () => {
      it("create requires auth", async () => {
        await expect(caller.venue.create({ name: "Test Arena" })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.venue.update({ id: FAKE_ID, name: "Updated" })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.venue.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("news", () => {
      it("create requires auth", async () => {
        await expect(caller.news.create({ title: "Test", content: "Body" })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.news.update({ id: FAKE_ID, title: "Updated" })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.news.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("page", () => {
      it("create requires auth", async () => {
        await expect(caller.page.create({ title: "Test Page" })).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.page.update({ id: FAKE_ID, title: "Updated" })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.page.delete({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("createAlias requires auth", async () => {
        await expect(caller.page.createAlias({ title: "Alias", targetPageId: FAKE_ID })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("deleteAlias requires auth", async () => {
        await expect(caller.page.deleteAlias({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("users", () => {
      it("list requires auth", async () => {
        await expect(caller.users.list()).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.users.getById({ id: "some-id" })).rejects.toThrow("Not authenticated")
      })

      it("create requires auth", async () => {
        await expect(
          caller.users.create({ name: "Test", email: "test@test.com", password: "password123" }),
        ).rejects.toThrow("Not authenticated")
      })

      it("update requires auth", async () => {
        await expect(caller.users.update({ id: "some-id", name: "New" })).rejects.toThrow("Not authenticated")
      })

      it("delete requires auth", async () => {
        await expect(caller.users.delete({ id: "some-id" })).rejects.toThrow("Not authenticated")
      })

      it("resetPassword requires auth", async () => {
        await expect(caller.users.resetPassword({ id: "some-id", password: "newpass123" })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("updateRole requires auth", async () => {
        await expect(caller.users.updateRole({ userId: "some-id", role: "admin" })).rejects.toThrow("Not authenticated")
      })
    })
  })

  describe("org-scoped read procedures reject unauthenticated access", () => {
    let caller: ReturnType<typeof createTestCaller>
    beforeEach(() => {
      caller = createTestCaller()
    })

    describe("season", () => {
      it("list requires auth", async () => {
        await expect(caller.season.list()).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.season.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("getCurrent requires auth", async () => {
        await expect(caller.season.getCurrent()).rejects.toThrow("Not authenticated")
      })

      it("structureCounts requires auth", async () => {
        await expect(caller.season.structureCounts()).rejects.toThrow("Not authenticated")
      })

      it("getFullStructure requires auth", async () => {
        await expect(caller.season.getFullStructure({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("division", () => {
      it("listBySeason requires auth", async () => {
        await expect(caller.division.listBySeason({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.division.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("round", () => {
      it("listByDivision requires auth", async () => {
        await expect(caller.round.listByDivision({ divisionId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.round.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("team", () => {
      it("list requires auth", async () => {
        await expect(caller.team.list()).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.team.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("teamDivision", () => {
      it("listByDivision requires auth", async () => {
        await expect(caller.teamDivision.listByDivision({ divisionId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("player", () => {
      it("list requires auth", async () => {
        await expect(caller.player.list()).rejects.toThrow("Not authenticated")
      })

      it("listWithCurrentTeam requires auth", async () => {
        await expect(caller.player.listWithCurrentTeam()).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.player.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("contract", () => {
      it("rosterForSeason requires auth", async () => {
        await expect(caller.contract.rosterForSeason({ teamId: FAKE_ID, seasonId: FAKE_ID })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("getByPlayer requires auth", async () => {
        await expect(caller.contract.getByPlayer({ playerId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("game", () => {
      it("listByRound requires auth", async () => {
        await expect(caller.game.listByRound({ roundId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.game.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("listForSeason requires auth", async () => {
        await expect(caller.game.listForSeason({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("standings", () => {
      it("getByRound requires auth", async () => {
        await expect(caller.standings.getByRound({ roundId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("stats", () => {
      it("playerStats requires auth", async () => {
        await expect(caller.stats.playerStats({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("goalieStats requires auth", async () => {
        await expect(caller.stats.goalieStats({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("penaltyStats requires auth", async () => {
        await expect(caller.stats.penaltyStats({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("teamPenaltyStats requires auth", async () => {
        await expect(caller.stats.teamPenaltyStats({ seasonId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("trikot", () => {
      it("list requires auth", async () => {
        await expect(caller.trikot.list()).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.trikot.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("teamTrikot", () => {
      it("listByTeam requires auth", async () => {
        await expect(caller.teamTrikot.listByTeam({ teamId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("listByTrikot requires auth", async () => {
        await expect(caller.teamTrikot.listByTrikot({ trikotId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("sponsor", () => {
      it("list requires auth", async () => {
        await expect(caller.sponsor.list()).rejects.toThrow("Not authenticated")
      })

      it("getById requires auth", async () => {
        await expect(caller.sponsor.getById({ id: FAKE_ID })).rejects.toThrow("Not authenticated")
      })
    })

    describe("gameReport", () => {
      it("getPenaltyTypes requires auth", async () => {
        await expect(caller.gameReport.getPenaltyTypes()).rejects.toThrow("Not authenticated")
      })

      it("getReport requires auth", async () => {
        await expect(caller.gameReport.getReport({ gameId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("getRosters requires auth", async () => {
        await expect(
          caller.gameReport.getRosters({ homeTeamId: FAKE_ID, awayTeamId: FAKE_ID, seasonId: FAKE_ID }),
        ).rejects.toThrow("Not authenticated")
      })
    })

    describe("settings", () => {
      it("get requires auth", async () => {
        await expect(caller.settings.get()).rejects.toThrow("Not authenticated")
      })
    })

    describe("page", () => {
      it("getBySlug requires auth", async () => {
        await expect(caller.page.getBySlug({ slug: "test" })).rejects.toThrow("Not authenticated")
      })

      it("listByMenuLocation requires auth", async () => {
        await expect(caller.page.listByMenuLocation({ location: "main_nav" })).rejects.toThrow("Not authenticated")
      })
    })

    describe("venue", () => {
      it("list requires auth", async () => {
        await expect(caller.venue.list()).rejects.toThrow("Not authenticated")
      })
    })
  })

  describe("public procedures remain accessible without auth", () => {
    let caller: ReturnType<typeof createTestCaller>
    beforeEach(() => {
      caller = createTestCaller()
    })

    describe("trikotTemplate", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.trikotTemplate.list())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.trikotTemplate.getById({ id: FAKE_ID }))
      })
    })
  })

  describe("org member/admin procedures reject non-members", () => {
    let caller: ReturnType<typeof createCrossOrgCaller>
    beforeEach(async () => {
      await seedSecondOrg()
      caller = createCrossOrgCaller()
    })

    it("organization.getActive rejects non-member", async () => {
      await expect(caller.organization.getActive()).rejects.toThrow("Kein Mitglied")
    })

    it("organization.listMembers rejects non-member", async () => {
      await expect(caller.organization.listMembers()).rejects.toThrow("Kein Mitglied")
    })

    it("season.create rejects non-member", async () => {
      await expect(
        caller.season.create({ name: "Test", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }),
      ).rejects.toThrow("Kein Mitglied")
    })

    it("team.create rejects non-member", async () => {
      await expect(caller.team.create({ name: "Test", shortName: "TST" })).rejects.toThrow("Kein Mitglied")
    })

    it("player.create rejects non-member", async () => {
      await expect(caller.player.create({ firstName: "Test", lastName: "Player" })).rejects.toThrow("Kein Mitglied")
    })

    it("settings.update rejects non-member", async () => {
      await expect(
        caller.settings.update({
          leagueName: "Test",
          leagueShortName: "T",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        }),
      ).rejects.toThrow("Kein Mitglied")
    })
  })

  describe("admin procedures reject org members (non-admin)", () => {
    let caller: ReturnType<typeof createTestCaller>
    beforeEach(() => {
      caller = createTestCaller({ asUser: true })
    })

    it("season.create rejects non-admin member", async () => {
      await expect(
        caller.season.create({ name: "Test", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("team.create rejects non-admin member", async () => {
      await expect(caller.team.create({ name: "Test", shortName: "TST" })).rejects.toThrow(
        "Keine Administratorrechte",
      )
    })

    it("player.create rejects non-admin member", async () => {
      await expect(caller.player.create({ firstName: "Test", lastName: "Player" })).rejects.toThrow(
        "Keine Administratorrechte",
      )
    })

    it("settings.update rejects non-admin member", async () => {
      await expect(
        caller.settings.update({
          leagueName: "Test",
          leagueShortName: "T",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("news.create rejects member without editor role", async () => {
      await expect(caller.news.create({ title: "Test", content: "Body" })).rejects.toThrow(
        "Unzureichende Berechtigungen",
      )
    })

    it("page.create rejects member without editor role", async () => {
      await expect(caller.page.create({ title: "Test Page" })).rejects.toThrow("Unzureichende Berechtigungen")
    })

    it("users.create rejects non-admin member", async () => {
      await expect(
        caller.users.create({ name: "Test", email: "test@test.com", password: "password123" }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("organization.update rejects non-admin member", async () => {
      await expect(caller.organization.update({ name: "Hacked" })).rejects.toThrow("Keine Administratorrechte")
    })

    it("organization.inviteMember rejects non-admin member", async () => {
      await expect(caller.organization.inviteMember({ email: "test@test.com" })).rejects.toThrow(
        "Keine Administratorrechte",
      )
    })

    it("organization.removeMember rejects non-admin member", async () => {
      await expect(caller.organization.removeMember({ memberId: "fake" })).rejects.toThrow(
        "Keine Administratorrechte",
      )
    })

    it("organization.updateMemberRole rejects non-admin member", async () => {
      await expect(caller.organization.updateMemberRole({ memberId: "fake", role: "admin" })).rejects.toThrow(
        "Keine Administratorrechte",
      )
    })

    it("game.create rejects member without game_manager role", async () => {
      await expect(
        caller.game.create({ roundId: FAKE_ID, homeTeamId: FAKE_ID, awayTeamId: FAKE_ID }),
      ).rejects.toThrow("Unzureichende Berechtigungen")
    })

    it("contract.signPlayer rejects member without team_manager role", async () => {
      await expect(
        caller.contract.signPlayer({ playerId: FAKE_ID, teamId: FAKE_ID, seasonId: FAKE_ID, position: "forward" }),
      ).rejects.toThrow("Unzureichende Berechtigungen")
    })
  })

  describe("platform admin procedures reject non-platform-admins", () => {
    let caller: ReturnType<typeof createTestCaller>
    beforeEach(() => {
      caller = createTestCaller({ asAdmin: true })
    })

    it("organization.listAll rejects non-platform-admin", async () => {
      await expect(caller.organization.listAll()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("organization.create rejects non-platform-admin", async () => {
      await expect(
        caller.organization.create({
          name: "New Org",
          ownerEmail: "owner@test.com",
          ownerName: "Owner",
          leagueSettings: {
            leagueName: "New League",
            leagueShortName: "NL",
            locale: "de-DE",
            timezone: "Europe/Berlin",
            pointsWin: 2,
            pointsDraw: 1,
            pointsLoss: 0,
          },
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("organization.delete rejects non-platform-admin", async () => {
      await expect(caller.organization.delete({ id: "fake" })).rejects.toThrow(
        "Keine Plattform-Administratorrechte",
      )
    })

    it("organization.setActiveForAdmin rejects non-platform-admin", async () => {
      await expect(caller.organization.setActiveForAdmin({ organizationId: "fake" })).rejects.toThrow(
        "Keine Plattform-Administratorrechte",
      )
    })
  })
})
