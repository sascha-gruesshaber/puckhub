import { TRPCError } from "@trpc/server"
import { beforeEach, describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

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

      it("assignRole requires auth", async () => {
        await expect(caller.users.assignRole({ userId: "some-id", role: "viewer" })).rejects.toThrow(
          "Not authenticated",
        )
      })

      it("removeRole requires auth", async () => {
        await expect(caller.users.removeRole({ roleId: FAKE_ID })).rejects.toThrow("Not authenticated")
      })

      it("listTeams requires auth", async () => {
        await expect(caller.users.listTeams()).rejects.toThrow("Not authenticated")
      })
    })
  })

  describe("public procedures remain accessible without auth", () => {
    let caller: ReturnType<typeof createTestCaller>
    beforeEach(() => {
      caller = createTestCaller()
    })

    describe("season", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.season.list())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.season.getById({ id: FAKE_ID }))
      })

      it("getCurrent is public", async () => {
        await expectNotUnauthorized(() => caller.season.getCurrent())
      })

      it("structureCounts is public", async () => {
        await expectNotUnauthorized(() => caller.season.structureCounts())
      })

      it("getFullStructure is public", async () => {
        await expectNotUnauthorized(() => caller.season.getFullStructure({ id: FAKE_ID }))
      })
    })

    describe("division", () => {
      it("listBySeason is public", async () => {
        await expectNotUnauthorized(() => caller.division.listBySeason({ seasonId: FAKE_ID }))
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.division.getById({ id: FAKE_ID }))
      })
    })

    describe("round", () => {
      it("listByDivision is public", async () => {
        await expectNotUnauthorized(() => caller.round.listByDivision({ divisionId: FAKE_ID }))
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.round.getById({ id: FAKE_ID }))
      })
    })

    describe("team", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.team.list())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.team.getById({ id: FAKE_ID }))
      })
    })

    describe("teamDivision", () => {
      it("listByDivision is public", async () => {
        await expectNotUnauthorized(() => caller.teamDivision.listByDivision({ divisionId: FAKE_ID }))
      })
    })

    describe("player", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.player.list())
      })

      it("listWithCurrentTeam is public", async () => {
        await expectNotUnauthorized(() => caller.player.listWithCurrentTeam())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.player.getById({ id: FAKE_ID }))
      })
    })

    describe("contract", () => {
      it("rosterForSeason is public", async () => {
        await expectNotUnauthorized(() => caller.contract.rosterForSeason({ teamId: FAKE_ID, seasonId: FAKE_ID }))
      })

      it("getByPlayer is public", async () => {
        await expectNotUnauthorized(() => caller.contract.getByPlayer({ playerId: FAKE_ID }))
      })
    })

    describe("game", () => {
      it("listByRound is public", async () => {
        await expectNotUnauthorized(() => caller.game.listByRound({ roundId: FAKE_ID }))
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.game.getById({ id: FAKE_ID }))
      })
    })

    describe("standings", () => {
      it("getByRound is public", async () => {
        await expectNotUnauthorized(() => caller.standings.getByRound({ roundId: FAKE_ID }))
      })
    })

    describe("stats", () => {
      it("playerStats is public", async () => {
        await expectNotUnauthorized(() => caller.stats.playerStats({ seasonId: FAKE_ID }))
      })

      it("goalieStats is public", async () => {
        await expectNotUnauthorized(() => caller.stats.goalieStats({ seasonId: FAKE_ID }))
      })
    })

    describe("trikotTemplate", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.trikotTemplate.list())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.trikotTemplate.getById({ id: FAKE_ID }))
      })
    })

    describe("trikot", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.trikot.list())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.trikot.getById({ id: FAKE_ID }))
      })
    })

    describe("teamTrikot", () => {
      it("listByTeam is public", async () => {
        await expectNotUnauthorized(() => caller.teamTrikot.listByTeam({ teamId: FAKE_ID }))
      })

      it("listByTrikot is public", async () => {
        await expectNotUnauthorized(() => caller.teamTrikot.listByTrikot({ trikotId: FAKE_ID }))
      })
    })

    describe("sponsor", () => {
      it("list is public", async () => {
        await expectNotUnauthorized(() => caller.sponsor.list())
      })

      it("getById is public", async () => {
        await expectNotUnauthorized(() => caller.sponsor.getById({ id: FAKE_ID }))
      })
    })
  })
})
