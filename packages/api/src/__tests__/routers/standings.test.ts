import * as schema from "@puckhub/db/schema"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

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
  })
})
