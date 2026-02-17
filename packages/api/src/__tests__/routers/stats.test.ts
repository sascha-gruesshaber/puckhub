import * as schema from "@puckhub/db/schema"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

describe("stats router", () => {
  describe("playerStats", () => {
    it("returns empty list when no stats exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller()
      const result = await caller.stats.playerStats({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("returns player stats for a season sorted by points", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const player1 = (await admin.player.create({ firstName: "Top", lastName: "Scorer" }))!
      const player2 = (await admin.player.create({ firstName: "Other", lastName: "Player" }))!

      const db = getTestDb()
      await db.insert(schema.playerSeasonStats).values([
        {
          playerId: player1.id,
          seasonId: season.id,
          teamId: team.id,
          gamesPlayed: 10,
          goals: 15,
          assists: 20,
          totalPoints: 35,
          penaltyMinutes: 4,
        },
        {
          playerId: player2.id,
          seasonId: season.id,
          teamId: team.id,
          gamesPlayed: 10,
          goals: 5,
          assists: 8,
          totalPoints: 13,
          penaltyMinutes: 10,
        },
      ])

      const caller = createTestCaller()
      const result = await caller.stats.playerStats({ seasonId: season.id })
      expect(result).toHaveLength(2)
      expect(result[0]?.totalPoints).toBe(35)
      expect(result[1]?.totalPoints).toBe(13)
    })

    it("filters by teamId when provided", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
      const player1 = (await admin.player.create({ firstName: "Player", lastName: "A" }))!
      const player2 = (await admin.player.create({ firstName: "Player", lastName: "B" }))!

      const db = getTestDb()
      await db.insert(schema.playerSeasonStats).values([
        {
          playerId: player1.id,
          seasonId: season.id,
          teamId: teamA.id,
          gamesPlayed: 10,
          goals: 10,
          assists: 10,
          totalPoints: 20,
          penaltyMinutes: 0,
        },
        {
          playerId: player2.id,
          seasonId: season.id,
          teamId: teamB.id,
          gamesPlayed: 10,
          goals: 5,
          assists: 5,
          totalPoints: 10,
          penaltyMinutes: 0,
        },
      ])

      const caller = createTestCaller()
      const result = await caller.stats.playerStats({ seasonId: season.id, teamId: teamA.id })
      expect(result).toHaveLength(1)
      expect(result[0]?.playerId).toBe(player1.id)
    })
  })

  describe("goalieStats", () => {
    it("returns empty list when no stats exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller()
      const result = await caller.stats.goalieStats({ seasonId: season.id })
      expect(result.qualified).toEqual([])
      expect(result.belowThreshold).toEqual([])
    })
  })

  describe("penaltyStats", () => {
    it("returns empty list when no completed games exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller()
      const result = await caller.stats.penaltyStats({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("aggregates penalty minutes per player from completed games", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
      const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!
      const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
      await admin.teamDivision.assign({ teamId: teamA.id, divisionId: division.id })
      await admin.teamDivision.assign({ teamId: teamB.id, divisionId: division.id })

      const player = (await admin.player.create({ firstName: "Tough", lastName: "Guy" }))!
      const playerB = (await admin.player.create({ firstName: "Other", lastName: "Guy" }))!
      await admin.contract.signPlayer({ playerId: player.id, teamId: teamA.id, seasonId: season.id, position: "forward" })
      await admin.contract.signPlayer({ playerId: playerB.id, teamId: teamB.id, seasonId: season.id, position: "forward" })

      const game = (await admin.game.create({
        roundId: round.id,
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
      }))!

      await admin.gameReport.setLineup({
        gameId: game.id,
        players: [
          { playerId: player.id, teamId: teamA.id, position: "forward" },
          { playerId: playerB.id, teamId: teamB.id, position: "forward" },
        ],
      })

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "penalty",
        teamId: teamA.id,
        period: 1,
        timeMinutes: 5,
        timeSeconds: 0,
        penaltyPlayerId: player.id,
        penaltyMinutes: 2,
      })

      await admin.game.complete({ id: game.id })

      const caller = createTestCaller()
      const result = await caller.stats.penaltyStats({ seasonId: season.id })
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]?.totalMinutes).toBe(2)
      expect(result[0]?.totalCount).toBe(1)
    })
  })

  describe("teamPenaltyStats", () => {
    it("returns empty list when no completed games exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller()
      const result = await caller.stats.teamPenaltyStats({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("aggregates penalty minutes per team from completed games", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
      const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!
      const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
      await admin.teamDivision.assign({ teamId: teamA.id, divisionId: division.id })
      await admin.teamDivision.assign({ teamId: teamB.id, divisionId: division.id })

      const playerA = (await admin.player.create({ firstName: "Player", lastName: "A" }))!
      const playerB = (await admin.player.create({ firstName: "Player", lastName: "B" }))!
      await admin.contract.signPlayer({ playerId: playerA.id, teamId: teamA.id, seasonId: season.id, position: "forward" })
      await admin.contract.signPlayer({ playerId: playerB.id, teamId: teamB.id, seasonId: season.id, position: "forward" })

      const game = (await admin.game.create({
        roundId: round.id,
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
      }))!

      await admin.gameReport.setLineup({
        gameId: game.id,
        players: [
          { playerId: playerA.id, teamId: teamA.id, position: "forward" },
          { playerId: playerB.id, teamId: teamB.id, position: "forward" },
        ],
      })

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "penalty",
        teamId: teamA.id,
        period: 1,
        timeMinutes: 3,
        timeSeconds: 0,
        penaltyPlayerId: playerA.id,
        penaltyMinutes: 2,
      })

      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "penalty",
        teamId: teamA.id,
        period: 2,
        timeMinutes: 10,
        timeSeconds: 0,
        penaltyPlayerId: playerA.id,
        penaltyMinutes: 5,
      })

      await admin.game.complete({ id: game.id })

      const caller = createTestCaller()
      const result = await caller.stats.teamPenaltyStats({ seasonId: season.id })
      expect(result.length).toBeGreaterThan(0)

      const teamAStats = result.find((r) => r.team?.id === teamA.id)
      expect(teamAStats?.totalMinutes).toBe(7)
      expect(teamAStats?.totalCount).toBe(2)
    })
  })
})
