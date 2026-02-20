import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

async function setupRound() {
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
  return { admin, season, division, round, teamA, teamB }
}

describe("bonusPoints router", () => {
  describe("CRUD operations", () => {
    it("creates bonus points and recalculates standings", async () => {
      const { admin, round, teamA, teamB } = await setupRound()
      const db = getTestDb()

      // Create a game with lineups and complete it to have standings
      const playerA = (await admin.player.create({ firstName: "A", lastName: "One" }))!
      const playerB = (await admin.player.create({ firstName: "B", lastName: "One" }))!
      await admin.contract.signPlayer({
        playerId: playerA.id,
        teamId: teamA.id,
        seasonId: (await db.query.seasons.findFirst())!.id,
        position: "forward",
      })
      await admin.contract.signPlayer({
        playerId: playerB.id,
        teamId: teamB.id,
        seasonId: (await db.query.seasons.findFirst())!.id,
        position: "forward",
      })

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
      await admin.game.complete({ id: game.id })

      // Standings should exist now (0-0 draw)
      const standingsBefore = await db.query.standings.findMany({
        where: eq(schema.standings.roundId, round.id),
      })
      expect(standingsBefore).toHaveLength(2)
      // Both teams should have 1 point each (draw)
      expect(standingsBefore.every((s) => s.totalPoints === 1)).toBe(true)

      // Add bonus points
      const bp = await admin.bonusPoints.create({
        teamId: teamA.id,
        roundId: round.id,
        points: 3,
        reason: "Test bonus",
      })
      expect(bp).toBeDefined()
      expect(bp!.points).toBe(3)

      // Standings should be recalculated
      const standingsAfter = await db.query.standings.findMany({
        where: eq(schema.standings.roundId, round.id),
        orderBy: (s, { desc }) => [desc(s.totalPoints)],
      })
      const teamAStanding = standingsAfter.find((s) => s.teamId === teamA.id)
      expect(teamAStanding!.bonusPoints).toBe(3)
      expect(teamAStanding!.totalPoints).toBe(4) // 1 point + 3 bonus
    })

    it("lists bonus points by round with team relation", async () => {
      const { admin, round, teamA } = await setupRound()

      await admin.bonusPoints.create({
        teamId: teamA.id,
        roundId: round.id,
        points: 2,
        reason: "Reason A",
      })

      const caller = createTestCaller()
      const list = await caller.bonusPoints.listByRound({ roundId: round.id })
      expect(list).toHaveLength(1)
      expect(list[0]!.team).toBeDefined()
      expect(list[0]!.team.name).toBe("Eagles")
      expect(list[0]!.reason).toBe("Reason A")
    })

    it("updates bonus points", async () => {
      const { admin, round, teamA } = await setupRound()

      const bp = (await admin.bonusPoints.create({
        teamId: teamA.id,
        roundId: round.id,
        points: 2,
      }))!

      const updated = await admin.bonusPoints.update({
        id: bp.id,
        points: -1,
        reason: "Updated reason",
      })
      expect(updated!.points).toBe(-1)
      expect(updated!.reason).toBe("Updated reason")
    })

    it("deletes bonus points and recalculates", async () => {
      const { admin, round, teamA } = await setupRound()

      const bp = (await admin.bonusPoints.create({
        teamId: teamA.id,
        roundId: round.id,
        points: 5,
      }))!

      await admin.bonusPoints.delete({ id: bp.id })

      const caller = createTestCaller()
      const list = await caller.bonusPoints.listByRound({ roundId: round.id })
      expect(list).toHaveLength(0)
    })
  })

  describe("authorization", () => {
    it("rejects create from non-admin", async () => {
      const { round, teamA } = await setupRound()
      const user = createTestCaller({ asUser: true })

      await expect(user.bonusPoints.create({ teamId: teamA.id, roundId: round.id, points: 1 })).rejects.toThrow()
    })

    it("allows public read", async () => {
      const { admin, round, teamA } = await setupRound()
      await admin.bonusPoints.create({ teamId: teamA.id, roundId: round.id, points: 1 })

      const publicCaller = createTestCaller()
      const list = await publicCaller.bonusPoints.listByRound({ roundId: round.id })
      expect(list).toHaveLength(1)
    })
  })
})
