import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

async function setupWithGame() {
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

  const playerA = (await admin.player.create({ firstName: "A", lastName: "One" }))!
  const playerB = (await admin.player.create({ firstName: "B", lastName: "One" }))!
  await admin.contract.signPlayer({ playerId: playerA.id, teamId: teamA.id, seasonId: season.id, position: "forward" })
  await admin.contract.signPlayer({ playerId: playerB.id, teamId: teamB.id, seasonId: season.id, position: "forward" })

  return { admin, season, division, round, teamA, teamB, playerA, playerB }
}

async function createAndCompleteGame(
  admin: ReturnType<typeof createTestCaller>,
  opts: {
    roundId: string
    teamAId: string
    teamBId: string
    playerAId: string
    playerBId: string
    goals?: Array<{ teamId: string; scorerId: string }>
  },
) {
  const game = (await admin.game.create({
    roundId: opts.roundId,
    homeTeamId: opts.teamAId,
    awayTeamId: opts.teamBId,
  }))!
  await admin.gameReport.setLineup({
    gameId: game.id,
    players: [
      { playerId: opts.playerAId, teamId: opts.teamAId, position: "forward" },
      { playerId: opts.playerBId, teamId: opts.teamBId, position: "forward" },
    ],
  })
  for (let i = 0; i < (opts.goals?.length ?? 0); i++) {
    const goal = opts.goals![i]!
    await admin.gameReport.addEvent({
      gameId: game.id,
      eventType: "goal",
      teamId: goal.teamId,
      period: 1,
      timeMinutes: i + 1,
      timeSeconds: 0,
      scorerId: goal.scorerId,
    })
  }
  await admin.game.complete({ id: game.id })
  return game
}

describe("standings router — extended", () => {
  describe("recalculate", () => {
    it("recalculates standings for a single round", async () => {
      const { admin, round, teamA, teamB, playerA, playerB } = await setupWithGame()
      const db = getTestDb()

      // Create and complete a game (A wins 1-0)
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        playerAId: playerA.id,
        playerBId: playerB.id,
        goals: [{ teamId: teamA.id, scorerId: playerA.id }],
      })

      // Verify standings exist
      const before = await db.query.standings.findMany({
        where: eq(schema.standings.roundId, round.id),
      })
      expect(before).toHaveLength(2)

      // Recalculate
      const result = await admin.standings.recalculate({ roundId: round.id })
      expect(result.success).toBe(true)

      // Verify standings still correct after recalculation
      const after = await db.query.standings.findMany({
        where: eq(schema.standings.roundId, round.id),
        orderBy: (s, { desc }) => [desc(s.totalPoints)],
      })
      expect(after).toHaveLength(2)
      expect(after[0]!.teamId).toBe(teamA.id)
      expect(after[0]!.wins).toBe(1)
      expect(after[0]!.totalPoints).toBe(2) // Default 2 points for win
    })

    it("tracks previousRank after recalculation", async () => {
      const { admin, round, teamA, teamB, playerA, playerB } = await setupWithGame()
      const db = getTestDb()

      // Create game (A wins) → first standings have no previousRank
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        playerAId: playerA.id,
        playerBId: playerB.id,
        goals: [{ teamId: teamA.id, scorerId: playerA.id }],
      })

      // Recalculate → now previousRank should be set from the first calculation
      await admin.standings.recalculate({ roundId: round.id })

      const standings = await db.query.standings.findMany({
        where: eq(schema.standings.roundId, round.id),
        orderBy: (s, { asc }) => [asc(s.rank)],
      })

      // After first game + recalc, previousRank should reflect the earlier rank
      const teamAStanding = standings.find((s) => s.teamId === teamA.id)!
      expect(teamAStanding.rank).toBe(1)
      expect(teamAStanding.previousRank).toBe(1) // Was rank 1 before recalc too
    })
  })

  describe("recalculateAll", () => {
    it("recalculates all rounds in a division", async () => {
      const { admin, division, round, teamA, teamB, playerA, playerB } = await setupWithGame()

      // Create a second round
      const round2 = (await admin.round.create({
        divisionId: division.id,
        name: "Rückrunde",
        sortOrder: 1,
      }))!

      // Complete a game in each round
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        playerAId: playerA.id,
        playerBId: playerB.id,
        goals: [{ teamId: teamA.id, scorerId: playerA.id }],
      })
      await createAndCompleteGame(admin, {
        roundId: round2.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        playerAId: playerA.id,
        playerBId: playerB.id,
        goals: [{ teamId: teamB.id, scorerId: playerB.id }],
      })

      const result = await admin.standings.recalculateAll({ divisionId: division.id })
      expect(result.roundsRecalculated).toBe(2)
    })
  })

  describe("teamForm", () => {
    it("returns W/D/L form for teams", async () => {
      const { admin, round, teamA, teamB, playerA, playerB } = await setupWithGame()

      // Game 1: A wins 1-0
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        playerAId: playerA.id,
        playerBId: playerB.id,
        goals: [{ teamId: teamA.id, scorerId: playerA.id }],
      })

      // Game 2: Draw 0-0
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        playerAId: playerA.id,
        playerBId: playerB.id,
      })

      const caller = createTestCaller()
      const form = await caller.standings.teamForm({ roundId: round.id })

      expect(form).toHaveLength(2)

      const teamAForm = form.find((f) => f.teamId === teamA.id)!
      // Most recent first: D, W (draw from game 2, then win from game 1)
      const teamAResults = teamAForm.form.map((e) => e.result)
      expect(teamAResults).toContain("W")
      expect(teamAResults).toContain("D")
      expect(teamAForm.form).toHaveLength(2)
      // Each entry has opponent + score info
      expect(teamAForm.form[0]).toHaveProperty("opponentId")
      expect(teamAForm.form[0]).toHaveProperty("goalsFor")
      expect(teamAForm.form[0]).toHaveProperty("goalsAgainst")

      const teamBForm = form.find((f) => f.teamId === teamB.id)!
      const teamBResults = teamBForm.form.map((e) => e.result)
      expect(teamBResults).toContain("L")
      expect(teamBResults).toContain("D")
      expect(teamBForm.form).toHaveLength(2)
    })

    it("respects the limit parameter", async () => {
      const { admin, round, teamA, teamB, playerA, playerB } = await setupWithGame()

      // Create 3 games
      for (let i = 0; i < 3; i++) {
        await createAndCompleteGame(admin, {
          roundId: round.id,
          teamAId: teamA.id,
          teamBId: teamB.id,
          playerAId: playerA.id,
          playerBId: playerB.id,
        })
      }

      const caller = createTestCaller()
      const form = await caller.standings.teamForm({ roundId: round.id, limit: 2 })

      const teamAForm = form.find((f) => f.teamId === teamA.id)!
      expect(teamAForm.form).toHaveLength(2)
    })

    it("returns empty array for round with no completed games", async () => {
      const { round } = await setupWithGame()

      const caller = createTestCaller()
      const form = await caller.standings.teamForm({ roundId: round.id })

      expect(form).toHaveLength(0)
    })
  })

  describe("authorization", () => {
    it("rejects recalculate from non-admin", async () => {
      const { round } = await setupWithGame()
      const user = createTestCaller({ asUser: true })

      await expect(user.standings.recalculate({ roundId: round.id })).rejects.toThrow()
    })

    it("allows public access to teamForm", async () => {
      const { round } = await setupWithGame()
      const publicCaller = createTestCaller()

      const form = await publicCaller.standings.teamForm({ roundId: round.id })
      expect(form).toBeDefined()
    })
  })
})
