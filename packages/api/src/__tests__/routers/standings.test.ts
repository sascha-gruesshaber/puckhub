import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

describe("standings router", () => {
  describe("getByRound", () => {
    it("returns empty list when no standings exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
      const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!

      const caller = createTestCaller()
      const result = await caller.standings.getByRound({ roundId: round.id })
      expect(result).toEqual([])
    })

    it("returns standings sorted by totalPoints DESC, gamesPlayed ASC", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
      const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!
      const teamA = (await admin.team.create({ name: "Team A", shortName: "TA" }))!
      const teamB = (await admin.team.create({ name: "Team B", shortName: "TB" }))!

      // Insert standings directly since there's no tRPC mutation for it
      const db = getTestDb()
      await db.insert(schema.standings).values([
        {
          organizationId: TEST_ORG_ID,
          teamId: teamA.id,
          roundId: round.id,
          gamesPlayed: 5,
          wins: 3,
          draws: 1,
          losses: 1,
          goalsFor: 15,
          goalsAgainst: 8,
          goalDifference: 7,
          points: 7,
          bonusPoints: 0,
          totalPoints: 7,
          rank: 1,
        },
        {
          organizationId: TEST_ORG_ID,
          teamId: teamB.id,
          roundId: round.id,
          gamesPlayed: 5,
          wins: 1,
          draws: 1,
          losses: 3,
          goalsFor: 8,
          goalsAgainst: 15,
          goalDifference: -7,
          points: 3,
          bonusPoints: 0,
          totalPoints: 3,
          rank: 2,
        },
      ])

      const caller = createTestCaller()
      const result = await caller.standings.getByRound({ roundId: round.id })
      expect(result).toHaveLength(2)
      expect(result[0]?.totalPoints).toBe(7)
      expect(result[1]?.totalPoints).toBe(3)
    })

    it("recalculates standings after game.complete", async () => {
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
      }))!

      await admin.gameReport.setLineup({
        gameId: game.id,
        players: [
          { playerId: homePlayer.id, teamId: homeTeam.id, position: "forward" },
          { playerId: awayPlayer.id, teamId: awayTeam.id, position: "forward" },
        ],
      })

      // Add a goal for home team
      await admin.gameReport.addEvent({
        gameId: game.id,
        eventType: "goal",
        teamId: homeTeam.id,
        period: 1,
        timeMinutes: 10,
        timeSeconds: 0,
        scorerId: homePlayer.id,
      })

      // Complete the game — should trigger standings recalculation
      await admin.game.complete({ id: game.id })

      // Fetch system settings to know win points (default: 2)
      const db = getTestDb()
      const [settings] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.organizationId, TEST_ORG_ID))
      const pointsWin = settings?.pointsWin ?? 2

      const caller = createTestCaller()
      const standings = await caller.standings.getByRound({ roundId: round.id })
      expect(standings).toHaveLength(2)

      // Home team won 1-0
      const homeStanding = standings.find((s) => s.teamId === homeTeam.id)
      const awayStanding = standings.find((s) => s.teamId === awayTeam.id)
      expect(homeStanding?.wins).toBe(1)
      expect(homeStanding?.goalsFor).toBe(1)
      expect(homeStanding?.goalsAgainst).toBe(0)
      expect(homeStanding?.totalPoints).toBe(pointsWin)
      expect(awayStanding?.losses).toBe(1)
      expect(awayStanding?.goalsFor).toBe(0)
      expect(awayStanding?.goalsAgainst).toBe(1)
    })
  })
})
