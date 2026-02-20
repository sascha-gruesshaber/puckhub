import * as schema from "@puckhub/db/schema"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

describe("gameReport router", () => {
  /** Creates season → division → round → 2 teams → 2 players → game with lineups */
  async function createReportFixtures() {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({
      name: "2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!
    const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
    const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!
    const homeTeam = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const awayTeam = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!

    await admin.teamDivision.assign({ teamId: homeTeam.id, divisionId: division.id })
    await admin.teamDivision.assign({ teamId: awayTeam.id, divisionId: division.id })

    const homePlayer = (await admin.player.create({ firstName: "Home", lastName: "Player" }))!
    const awayPlayer = (await admin.player.create({ firstName: "Away", lastName: "Player" }))!
    await admin.contract.signPlayer({
      playerId: homePlayer.id,
      teamId: homeTeam.id,
      seasonId: season.id,
      position: "forward",
    })
    await admin.contract.signPlayer({
      playerId: awayPlayer.id,
      teamId: awayTeam.id,
      seasonId: season.id,
      position: "forward",
    })

    const game = (await admin.game.create({
      roundId: round.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      scheduledAt: "2025-10-15T19:30:00.000Z",
    }))!

    await admin.gameReport.setLineup({
      gameId: game.id,
      players: [
        { playerId: homePlayer.id, teamId: homeTeam.id, position: "forward" },
        { playerId: awayPlayer.id, teamId: awayTeam.id, position: "forward" },
      ],
    })

    return { admin, season, division, round, homeTeam, awayTeam, homePlayer, awayPlayer, game }
  }

  // ── getPenaltyTypes ─────────────────────────────────────────────────
  describe("getPenaltyTypes", () => {
    it("returns empty list when no penalty types are seeded", async () => {
      const caller = createTestCaller()
      const result = await caller.gameReport.getPenaltyTypes()
      expect(result).toEqual([])
    })

    it("returns penalty types ordered by code", async () => {
      const db = getTestDb()
      await db.insert(schema.penaltyTypes).values([
        { code: "MINOR", name: "Kleine Strafe", shortName: "2min", defaultMinutes: 2 },
        { code: "DOUBLE_MINOR", name: "Doppelte Kleine Strafe", shortName: "2+2min", defaultMinutes: 4 },
        { code: "MAJOR", name: "Große Strafe", shortName: "5min", defaultMinutes: 5 },
      ])

      const caller = createTestCaller()
      const result = await caller.gameReport.getPenaltyTypes()
      expect(result).toHaveLength(3)
      expect(result[0]?.code).toBe("DOUBLE_MINOR")
      expect(result[1]?.code).toBe("MAJOR")
      expect(result[2]?.code).toBe("MINOR")
    })
  })

  // ── getReport ───────────────────────────────────────────────────────
  describe("getReport", () => {
    it("returns full game report with events, lineups, suspensions", async () => {
      const { game } = await createReportFixtures()

      const caller = createTestCaller()
      const report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.id).toBe(game.id)
      expect(report.lineups).toHaveLength(2)
      expect(report.events).toHaveLength(0)
      expect(report.suspensions).toHaveLength(0)
      expect(report.activeSuspensions).toEqual([])
    })

    it("throws NOT_FOUND for non-existent game", async () => {
      const caller = createTestCaller()
      await expect(caller.gameReport.getReport({ gameId: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow(
        "nicht gefunden",
      )
    })

    it("includes events in the report", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 30,
        scorerId: homePlayer.id,
      })

      const caller = createTestCaller()
      const report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.events).toHaveLength(1)
      expect(report.events[0]?.eventType).toBe("goal")
    })
  })

  // ── getRosters ──────────────────────────────────────────────────────
  describe("getRosters", () => {
    it("returns home and away rosters for a season", async () => {
      const { season, homeTeam, awayTeam } = await createReportFixtures()

      const caller = createTestCaller()
      const rosters = await caller.gameReport.getRosters({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        seasonId: season.id,
      })

      expect(rosters.home.length).toBeGreaterThan(0)
      expect(rosters.away.length).toBeGreaterThan(0)
    })

    it("returns empty rosters for non-existent season", async () => {
      const { homeTeam, awayTeam } = await createReportFixtures()
      const caller = createTestCaller()
      const rosters = await caller.gameReport.getRosters({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        seasonId: "00000000-0000-0000-0000-000000000000",
      })
      expect(rosters).toEqual({ home: [], away: [] })
    })
  })

  // ── setLineup ───────────────────────────────────────────────────────
  describe("setLineup", () => {
    it("sets lineup for a game", async () => {
      const { admin, game, homeTeam, homePlayer, awayTeam, awayPlayer } = await createReportFixtures()

      const result = await admin.gameReport.setLineup({
        gameId: game.id,
        players: [
          { playerId: homePlayer.id, teamId: homeTeam.id, position: "forward", jerseyNumber: 99 },
          { playerId: awayPlayer.id, teamId: awayTeam.id, position: "defense" },
        ],
      })

      expect(result).toEqual({ success: true })
    })

    it("replaces existing lineup", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      // Replace with only one player
      await admin.gameReport.setLineup({
        gameId: game.id,
        players: [{ playerId: homePlayer.id, teamId: homeTeam.id, position: "goalie" }],
      })

      const caller = createTestCaller()
      const report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.lineups).toHaveLength(1)
      expect(report.lineups[0]?.position).toBe("goalie")
    })

    it("rejects editing a completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()
      await admin.game.complete({ id: game.id })

      await expect(
        admin.gameReport.setLineup({
          gameId: game.id,
          players: [{ playerId: homePlayer.id, teamId: homeTeam.id, position: "forward" }],
        }),
      ).rejects.toThrow("nicht bearbeitet")
    })

    it("rejects unauthenticated calls", async () => {
      const { game, homeTeam, homePlayer } = await createReportFixtures()
      const caller = createTestCaller()
      await expect(
        caller.gameReport.setLineup({
          gameId: game.id,
          players: [{ playerId: homePlayer.id, teamId: homeTeam.id, position: "forward" }],
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ── addEvent ────────────────────────────────────────────────────────
  describe("addEvent", () => {
    it("adds a goal event and recalculates score", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 10,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      expect(event?.eventType).toBe("goal")

      // Verify score was updated
      const caller = createTestCaller()
      const gameData = await caller.game.getById({ id: game.id })
      expect(gameData?.homeScore).toBe(1)
      expect(gameData?.awayScore).toBe(0)
    })

    it("adds multiple goals and scores correctly", async () => {
      const { admin, game, homeTeam, awayTeam, homePlayer, awayPlayer } = await createReportFixtures()

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: awayTeam.id,
        period: 1,
        timeMinutes: 10,
        timeSeconds: 0,
        scorerId: awayPlayer.id,
      })

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 2,
        timeMinutes: 3,
        timeSeconds: 15,
        scorerId: homePlayer.id,
      })

      const caller = createTestCaller()
      const gameData = await caller.game.getById({ id: game.id })
      expect(gameData?.homeScore).toBe(2)
      expect(gameData?.awayScore).toBe(1)
    })

    it("adds a penalty event without affecting score", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "penalty",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 8,
        timeSeconds: 0,
        penaltyPlayerId: homePlayer.id,
        penaltyMinutes: 2,
      })

      expect(event?.eventType).toBe("penalty")

      const caller = createTestCaller()
      const gameData = await caller.game.getById({ id: game.id })
      expect(gameData?.homeScore).toBeNull()
      expect(gameData?.awayScore).toBeNull()
    })

    it("adds a penalty with automatic suspension", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "penalty",
        teamId: homeTeam.id,
        period: 2,
        timeMinutes: 15,
        timeSeconds: 0,
        penaltyPlayerId: homePlayer.id,
        penaltyMinutes: 5,
        suspension: {
          suspensionType: "match_penalty",
          suspendedGames: 2,
          reason: "Schwere Regelwidrigkeit",
        },
      })

      const caller = createTestCaller()
      const report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.suspensions).toHaveLength(1)
      expect(report.suspensions[0]?.suspensionType).toBe("match_penalty")
      expect(report.suspensions[0]?.suspendedGames).toBe(2)
    })

    it("rejects adding event to a completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()
      await admin.game.complete({ id: game.id })

      await expect(
        admin.gameReport.addEvent({
          gameId: game.id,
          eventType: "goal",
          teamId: homeTeam.id,
          period: 1,
          timeMinutes: 1,
          timeSeconds: 0,
          scorerId: homePlayer.id,
        }),
      ).rejects.toThrow("nicht bearbeitet")
    })

    it("rejects unauthenticated calls", async () => {
      const { game, homeTeam, homePlayer } = await createReportFixtures()
      const caller = createTestCaller()
      await expect(
        caller.gameReport.addEvent({
          gameId: game.id,
          eventType: "goal",
          teamId: homeTeam.id,
          period: 1,
          timeMinutes: 1,
          timeSeconds: 0,
          scorerId: homePlayer.id,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ── updateEvent ─────────────────────────────────────────────────────
  describe("updateEvent", () => {
    it("updates event fields", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      const updated = await admin.gameReport.updateEvent({
        id: event!.id,
        period: 2,
        timeMinutes: 10,
        timeSeconds: 30,
      })

      expect(updated?.period).toBe(2)
      expect(updated?.timeMinutes).toBe(10)
      expect(updated?.timeSeconds).toBe(30)
    })

    it("recalculates score when goal team changes", async () => {
      const { admin, game, homeTeam, awayTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      // Change team to away
      await admin.gameReport.updateEvent({
        id: event!.id,
        teamId: awayTeam.id,
      })

      const caller = createTestCaller()
      const gameData = await caller.game.getById({ id: game.id })
      expect(gameData?.homeScore).toBe(0)
      expect(gameData?.awayScore).toBe(1)
    })

    it("throws NOT_FOUND for non-existent event", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.gameReport.updateEvent({
          id: "00000000-0000-0000-0000-000000000000",
          period: 2,
        }),
      ).rejects.toThrow("nicht gefunden")
    })

    it("rejects editing event of a completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      await admin.game.complete({ id: game.id })

      await expect(admin.gameReport.updateEvent({ id: event!.id, period: 3 })).rejects.toThrow("nicht bearbeitet")
    })
  })

  // ── deleteEvent ─────────────────────────────────────────────────────
  describe("deleteEvent", () => {
    it("deletes an event and recalculates score", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      const caller = createTestCaller()
      let gameData = await caller.game.getById({ id: game.id })
      expect(gameData?.homeScore).toBe(1)

      await admin.gameReport.deleteEvent({ id: event!.id })

      gameData = await caller.game.getById({ id: game.id })
      expect(gameData?.homeScore).toBe(0)
      expect(gameData?.awayScore).toBe(0)
    })

    it("cascades deletion of linked suspension", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "penalty",
        teamId: homeTeam.id,
        period: 2,
        timeMinutes: 10,
        timeSeconds: 0,
        penaltyPlayerId: homePlayer.id,
        penaltyMinutes: 5,
        suspension: {
          suspensionType: "game_misconduct",
          suspendedGames: 1,
        },
      })

      const caller = createTestCaller()
      let report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.suspensions).toHaveLength(1)
      expect(report.events).toHaveLength(1)

      // Delete the penalty event — should also delete the suspension
      await admin.gameReport.deleteEvent({ id: report.events[0]!.id })

      report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.events).toHaveLength(0)
      expect(report.suspensions).toHaveLength(0)
    })

    it("throws NOT_FOUND for non-existent event", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.gameReport.deleteEvent({ id: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow(
        "nicht gefunden",
      )
    })

    it("rejects deleting event of a completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const event = await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      await admin.game.complete({ id: game.id })

      await expect(admin.gameReport.deleteEvent({ id: event!.id })).rejects.toThrow("nicht bearbeitet")
    })
  })

  // ── addSuspension ───────────────────────────────────────────────────
  describe("addSuspension", () => {
    it("adds a standalone suspension", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const suspension = await admin.gameReport.addSuspension({
        gameId: game.id,
        playerId: homePlayer.id,
        teamId: homeTeam.id,
        suspensionType: "match_penalty",
        suspendedGames: 3,
        reason: "Grobes Foul",
      })

      expect(suspension?.suspensionType).toBe("match_penalty")
      expect(suspension?.suspendedGames).toBe(3)
      expect(suspension?.reason).toBe("Grobes Foul")
    })

    it("rejects adding suspension to completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()
      await admin.game.complete({ id: game.id })

      await expect(
        admin.gameReport.addSuspension({
          gameId: game.id,
          playerId: homePlayer.id,
          teamId: homeTeam.id,
          suspensionType: "game_misconduct",
          suspendedGames: 1,
        }),
      ).rejects.toThrow("nicht bearbeitet")
    })

    it("rejects unauthenticated calls", async () => {
      const { game, homeTeam, homePlayer } = await createReportFixtures()
      const caller = createTestCaller()
      await expect(
        caller.gameReport.addSuspension({
          gameId: game.id,
          playerId: homePlayer.id,
          teamId: homeTeam.id,
          suspensionType: "match_penalty",
          suspendedGames: 1,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ── updateSuspension ────────────────────────────────────────────────
  describe("updateSuspension", () => {
    it("updates suspension fields", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const suspension = await admin.gameReport.addSuspension({
        gameId: game.id,
        playerId: homePlayer.id,
        teamId: homeTeam.id,
        suspensionType: "match_penalty",
        suspendedGames: 1,
      })

      const updated = await admin.gameReport.updateSuspension({
        id: suspension!.id,
        suspendedGames: 5,
        reason: "Updated reason",
      })

      expect(updated?.suspendedGames).toBe(5)
      expect(updated?.reason).toBe("Updated reason")
    })

    it("throws NOT_FOUND for non-existent suspension", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.gameReport.updateSuspension({
          id: "00000000-0000-0000-0000-000000000000",
          suspendedGames: 2,
        }),
      ).rejects.toThrow("nicht gefunden")
    })

    it("rejects updating suspension of completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const suspension = await admin.gameReport.addSuspension({
        gameId: game.id,
        playerId: homePlayer.id,
        teamId: homeTeam.id,
        suspensionType: "match_penalty",
        suspendedGames: 1,
      })

      await admin.game.complete({ id: game.id })

      await expect(admin.gameReport.updateSuspension({ id: suspension!.id, suspendedGames: 3 })).rejects.toThrow(
        "nicht bearbeitet",
      )
    })
  })

  // ── deleteSuspension ────────────────────────────────────────────────
  describe("deleteSuspension", () => {
    it("deletes a suspension", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const suspension = await admin.gameReport.addSuspension({
        gameId: game.id,
        playerId: homePlayer.id,
        teamId: homeTeam.id,
        suspensionType: "match_penalty",
        suspendedGames: 1,
      })

      await admin.gameReport.deleteSuspension({ id: suspension!.id })

      const caller = createTestCaller()
      const report = await caller.gameReport.getReport({ gameId: game.id })
      expect(report.suspensions).toHaveLength(0)
    })

    it("rejects deleting suspension of completed game", async () => {
      const { admin, game, homeTeam, homePlayer } = await createReportFixtures()

      const suspension = await admin.gameReport.addSuspension({
        gameId: game.id,
        playerId: homePlayer.id,
        teamId: homeTeam.id,
        suspensionType: "match_penalty",
        suspendedGames: 1,
      })

      await admin.game.complete({ id: game.id })

      await expect(admin.gameReport.deleteSuspension({ id: suspension!.id })).rejects.toThrow("nicht bearbeitet")
    })
  })
})
