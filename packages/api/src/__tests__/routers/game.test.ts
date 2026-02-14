import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("game router", () => {
  async function createGameFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({ name: "2025/26", seasonStart: "2025-09-01", seasonEnd: "2026-04-30" }))!
    const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
    const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!
    const homeTeam = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const awayTeam = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!

    await admin.teamDivision.assign({ teamId: homeTeam.id, divisionId: division.id })
    await admin.teamDivision.assign({ teamId: awayTeam.id, divisionId: division.id })

    return { season, division, round, homeTeam, awayTeam }
  }

  describe("listByRound", () => {
    it("returns empty list when no games exist", async () => {
      const { round } = await createGameFixtures()
      const caller = createTestCaller()
      const result = await caller.game.listByRound({ roundId: round.id })
      expect(result).toEqual([])
    })

    it("returns games for a round", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        gameNumber: 1,
      })
      await admin.game.create({
        roundId: round.id,
        homeTeamId: awayTeam.id,
        awayTeamId: homeTeam.id,
        gameNumber: 2,
      })

      const caller = createTestCaller()
      const result = await caller.game.listByRound({ roundId: round.id })
      expect(result).toHaveLength(2)
    })
  })

  describe("listForSeason", () => {
    it("returns games scoped to a season", async () => {
      const { season, round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      const result = await admin.game.listForSeason({ seasonId: season.id })
      expect(result).toHaveLength(1)
      expect(result[0]?.round.division.seasonId).toBe(season.id)
    })

    it("supports team and status filters", async () => {
      const { season, round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const g1 = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })
      await admin.game.create({
        roundId: round.id,
        homeTeamId: awayTeam.id,
        awayTeamId: homeTeam.id,
      })

      await admin.game.update({
        id: g1?.id,
        homeScore: 2,
        awayScore: 1,
        status: "completed",
      })

      const filtered = await admin.game.listForSeason({
        seasonId: season.id,
        teamId: homeTeam.id,
        status: "completed",
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0]?.status).toBe("completed")
    })
  })

  describe("create", () => {
    it("creates a game with teams", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        gameNumber: 1,
      })

      expect(game?.roundId).toBe(round.id)
      expect(game?.homeTeamId).toBe(homeTeam.id)
      expect(game?.awayTeamId).toBe(awayTeam.id)
      expect(game?.status).toBe("scheduled")
      expect(game?.homeScore).toBeNull()
      expect(game?.awayScore).toBeNull()
    })

    it("rejects identical teams", async () => {
      const { round, homeTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await expect(
        admin.game.create({
          roundId: round.id,
          homeTeamId: homeTeam.id,
          awayTeamId: homeTeam.id,
        }),
      ).rejects.toThrow("different")
    })

    it("creates a game with scheduled date", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        scheduledAt: "2025-10-15T19:30:00.000Z",
      })

      expect(game?.scheduledAt).toBeDefined()
    })

    it("uses default home venue when venue is omitted", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })
      const venue = await admin.venue.create({ name: "Home Arena", defaultTeamId: homeTeam.id })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      expect(game?.venueId).toBe(venue?.id)
    })

    it("rejects unauthenticated calls", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const caller = createTestCaller()
      await expect(
        caller.game.create({
          roundId: round.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  describe("update", () => {
    it("updates game metadata", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      const updated = await admin.game.update({
        id: game?.id,
        notes: "Topspiel",
        gameNumber: 8,
      })

      expect(updated?.notes).toBe("Topspiel")
      expect(updated?.gameNumber).toBe(8)
    })

    it("requires scores when status is completed", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      await expect(
        admin.game.update({
          id: game?.id,
          status: "completed",
        }),
      ).rejects.toThrow("Both scores are required")
    })
  })

  describe("generateDoubleRoundRobin", () => {
    it("creates home and away fixtures for each pair", async () => {
      const { season, division, round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const result = await admin.game.generateDoubleRoundRobin({
        seasonId: season.id,
        divisionId: division.id,
        roundId: round.id,
      })

      expect(result.totalFixtures).toBe(2)
      expect(result.createdCount).toBe(2)
      const pairs = new Set(result.created.map((g) => `${g.homeTeamId}:${g.awayTeamId}`))
      expect(pairs.has(`${homeTeam.id}:${awayTeam.id}`)).toBe(true)
      expect(pairs.has(`${awayTeam.id}:${homeTeam.id}`)).toBe(true)
    })

    it("skips existing fixtures", async () => {
      const { season, division, round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      const result = await admin.game.generateDoubleRoundRobin({
        seasonId: season.id,
        divisionId: division.id,
        roundId: round.id,
      })

      expect(result.totalFixtures).toBe(2)
      expect(result.createdCount).toBe(1)
      expect(result.skippedExisting).toBe(1)
    })
  })

  describe("updateScore", () => {
    it("updates game score", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      const updated = await admin.game.updateScore({
        id: game?.id,
        homeScore: 4,
        awayScore: 2,
        status: "completed",
      })

      expect(updated?.homeScore).toBe(4)
      expect(updated?.awayScore).toBe(2)
      expect(updated?.status).toBe("completed")
      expect(updated?.finalizedAt).toBeDefined()
    })
  })

  describe("delete", () => {
    it("deletes a game", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const game = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })

      await admin.game.delete({ id: game?.id })

      const caller = createTestCaller()
      const result = await caller.game.getById({ id: game?.id })
      expect(result).toBeUndefined()
    })

    it("deletes multiple games", async () => {
      const { round, homeTeam, awayTeam } = await createGameFixtures()
      const admin = createTestCaller({ asAdmin: true })

      const g1 = await admin.game.create({
        roundId: round.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      })
      const g2 = await admin.game.create({
        roundId: round.id,
        homeTeamId: awayTeam.id,
        awayTeamId: homeTeam.id,
      })

      await admin.game.deleteMany({ ids: [g1?.id, g2?.id] })

      const left = await admin.game.listByRound({ roundId: round.id })
      expect(left).toHaveLength(0)
    })
  })
})
