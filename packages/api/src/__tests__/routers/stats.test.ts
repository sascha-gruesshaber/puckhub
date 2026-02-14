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
      expect(result).toEqual([])
    })
  })
})
