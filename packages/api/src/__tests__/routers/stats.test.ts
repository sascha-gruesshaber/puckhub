import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

/**
 * Helper: sets up a season with a division, round, two teams, and players.
 * Returns all created entities for use in tests.
 */
async function setupSeasonWithGame(opts?: {
  countsForPlayerStats?: boolean
  countsForGoalieStats?: boolean
  goalieMinGames?: number
}) {
  const admin = createTestCaller({ asAdmin: true })
  const season = (await admin.season.create({
    name: "2025/26",
    seasonStart: "2025-09-01",
    seasonEnd: "2026-04-30",
  }))!
  const division = (await admin.division.create({
    seasonId: season.id,
    name: "Liga",
    ...(opts?.goalieMinGames !== undefined ? { goalieMinGames: opts.goalieMinGames } : {}),
  }))!
  const round = (await admin.round.create({
    divisionId: division.id,
    name: "Hauptrunde",
    countsForPlayerStats: opts?.countsForPlayerStats ?? true,
    countsForGoalieStats: opts?.countsForGoalieStats ?? true,
  }))!
  const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
  const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
  await admin.teamDivision.assign({ teamId: teamA.id, divisionId: division.id })
  await admin.teamDivision.assign({ teamId: teamB.id, divisionId: division.id })

  const playerA1 = (await admin.player.create({ firstName: "Alpha", lastName: "One" }))!
  const playerA2 = (await admin.player.create({ firstName: "Alpha", lastName: "Two" }))!
  const playerB1 = (await admin.player.create({ firstName: "Beta", lastName: "One" }))!
  const goalieA = (await admin.player.create({ firstName: "Goalie", lastName: "A" }))!
  const goalieB = (await admin.player.create({ firstName: "Goalie", lastName: "B" }))!

  await admin.contract.signPlayer({ playerId: playerA1.id, teamId: teamA.id, seasonId: season.id, position: "forward" })
  await admin.contract.signPlayer({ playerId: playerA2.id, teamId: teamA.id, seasonId: season.id, position: "defense" })
  await admin.contract.signPlayer({ playerId: playerB1.id, teamId: teamB.id, seasonId: season.id, position: "forward" })
  await admin.contract.signPlayer({ playerId: goalieA.id, teamId: teamA.id, seasonId: season.id, position: "goalie" })
  await admin.contract.signPlayer({ playerId: goalieB.id, teamId: teamB.id, seasonId: season.id, position: "goalie" })

  return { admin, season, division, round, teamA, teamB, playerA1, playerA2, playerB1, goalieA, goalieB }
}

/**
 * Helper: creates a game, sets lineups, adds events, and completes it.
 */
async function createAndCompleteGame(
  admin: ReturnType<typeof createTestCaller>,
  opts: {
    roundId: string
    teamA: { id: string }
    teamB: { id: string }
    playersA: Array<{ id: string; position: string }>
    playersB: Array<{ id: string; position: string }>
    goals?: Array<{
      teamId: string
      scorerId: string
      assist1Id?: string
      assist2Id?: string
    }>
    penalties?: Array<{
      teamId: string
      playerId: string
      minutes: number
    }>
    goalieStats?: Array<{
      playerId: string
      teamId: string
      goalsAgainst: number
    }>
  },
) {
  const game = (await admin.game.create({
    roundId: opts.roundId,
    homeTeamId: opts.teamA.id,
    awayTeamId: opts.teamB.id,
  }))!

  await admin.gameReport.setLineup({
    gameId: game.id,
    players: [
      ...opts.playersA.map((p) => ({ playerId: p.id, teamId: opts.teamA.id, position: p.position as any })),
      ...opts.playersB.map((p) => ({ playerId: p.id, teamId: opts.teamB.id, position: p.position as any })),
    ],
  })

  // Add goal events
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
      assist1Id: goal.assist1Id,
      assist2Id: goal.assist2Id,
    })
  }

  // Add penalty events
  for (let i = 0; i < (opts.penalties?.length ?? 0); i++) {
    const pen = opts.penalties![i]!
    await admin.gameReport.addEvent({
      gameId: game.id,
      eventType: "penalty",
      teamId: pen.teamId,
      period: 1,
      timeMinutes: i + 10,
      timeSeconds: 0,
      penaltyPlayerId: pen.playerId,
      penaltyMinutes: pen.minutes,
    })
  }

  // Insert goalie game stats directly (no tRPC endpoint for this)
  if (opts.goalieStats?.length) {
    const db = getTestDb()
    await db.goalieGameStat.createMany({
      data: opts.goalieStats.map((gs) => ({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        playerId: gs.playerId,
        teamId: gs.teamId,
        goalsAgainst: gs.goalsAgainst,
      })),
    })
  }

  await admin.game.complete({ id: game.id })
  return game
}

describe("stats router", () => {
  // ── seasonRoundInfo ──────────────────────────────────────────────────

  describe("seasonRoundInfo", () => {
    it("returns divisions with rounds for a season", async () => {
      const { season, division, round } = await setupSeasonWithGame()

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.seasonRoundInfo({ seasonId: season.id })

      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe(division.id)
      expect(result[0]!.name).toBe("Liga")
      expect(result[0]!.rounds).toHaveLength(1)
      expect(result[0]!.rounds[0]!.name).toBe("Hauptrunde")
      expect(result[0]!.rounds[0]!.countsForPlayerStats).toBe(true)
      expect(result[0]!.rounds[0]!.countsForGoalieStats).toBe(true)
    })

    it("returns empty array for a season with no divisions", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "Empty",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.seasonRoundInfo({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("reflects countsForPlayerStats / countsForGoalieStats flags", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
      await admin.round.create({
        divisionId: division.id,
        name: "Preseason",
        countsForPlayerStats: false,
        countsForGoalieStats: false,
      })
      await admin.round.create({
        divisionId: division.id,
        name: "Regular Season",
        countsForPlayerStats: true,
        countsForGoalieStats: true,
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.seasonRoundInfo({ seasonId: season.id })
      const rounds = result[0]!.rounds
      expect(rounds).toHaveLength(2)

      const preseason = rounds.find((r) => r.name === "Preseason")!
      expect(preseason.countsForPlayerStats).toBe(false)
      expect(preseason.countsForGoalieStats).toBe(false)

      const regular = rounds.find((r) => r.name === "Regular Season")!
      expect(regular.countsForPlayerStats).toBe(true)
      expect(regular.countsForGoalieStats).toBe(true)
    })
  })

  // ── playerStats ──────────────────────────────────────────────────────

  describe("playerStats", () => {
    it("returns empty list when no stats exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller({ asAdmin: true })
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
      await db.playerSeasonStat.createMany({
        data: [
          {
            organizationId: TEST_ORG_ID,
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
            organizationId: TEST_ORG_ID,
            playerId: player2.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 10,
            goals: 5,
            assists: 8,
            totalPoints: 13,
            penaltyMinutes: 10,
          },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
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
      await db.playerSeasonStat.createMany({
        data: [
          {
            organizationId: TEST_ORG_ID,
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
            organizationId: TEST_ORG_ID,
            playerId: player2.id,
            seasonId: season.id,
            teamId: teamB.id,
            gamesPlayed: 10,
            goals: 5,
            assists: 5,
            totalPoints: 10,
            penaltyMinutes: 0,
          },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.playerStats({ seasonId: season.id, teamId: teamA.id })
      expect(result).toHaveLength(1)
      expect(result[0]?.playerId).toBe(player1.id)
    })

    it("filters by position when provided", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const forward = (await admin.player.create({ firstName: "Fast", lastName: "Forward" }))!
      const defender = (await admin.player.create({ firstName: "Strong", lastName: "Defender" }))!

      await admin.contract.signPlayer({
        playerId: forward.id,
        teamId: team.id,
        seasonId: season.id,
        position: "forward",
      })
      await admin.contract.signPlayer({
        playerId: defender.id,
        teamId: team.id,
        seasonId: season.id,
        position: "defense",
      })

      const db = getTestDb()
      await db.playerSeasonStat.createMany({
        data: [
          {
            organizationId: TEST_ORG_ID,
            playerId: forward.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 10,
            goals: 15,
            assists: 10,
            totalPoints: 25,
            penaltyMinutes: 2,
          },
          {
            organizationId: TEST_ORG_ID,
            playerId: defender.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 10,
            goals: 3,
            assists: 12,
            totalPoints: 15,
            penaltyMinutes: 6,
          },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })

      const forwards = await caller.stats.playerStats({ seasonId: season.id, position: "forward" })
      expect(forwards).toHaveLength(1)
      expect(forwards[0]?.playerId).toBe(forward.id)

      const defenders = await caller.stats.playerStats({ seasonId: season.id, position: "defense" })
      expect(defenders).toHaveLength(1)
      expect(defenders[0]?.playerId).toBe(defender.id)
    })

    it("includes player and team details in result", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const player = (await admin.player.create({ firstName: "Top", lastName: "Scorer" }))!

      const db = getTestDb()
      await db.playerSeasonStat.create({
        data: {
          organizationId: TEST_ORG_ID,
          playerId: player.id,
          seasonId: season.id,
          teamId: team.id,
          gamesPlayed: 5,
          goals: 3,
          assists: 2,
          totalPoints: 5,
          penaltyMinutes: 0,
        },
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.playerStats({ seasonId: season.id })
      expect(result).toHaveLength(1)
      expect(result[0]?.player?.firstName).toBe("Top")
      expect(result[0]?.player?.lastName).toBe("Scorer")
      expect(result[0]?.team?.shortName).toBe("EAG")
    })
  })

  // ── goalieStats ──────────────────────────────────────────────────────

  describe("goalieStats", () => {
    it("returns empty list when no stats exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.goalieStats({ seasonId: season.id })
      expect(result.qualified).toEqual([])
      expect(result.belowThreshold).toEqual([])
    })

    it("separates goalies into qualified and belowThreshold", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      // Division with goalieMinGames = 3
      const division = (await admin.division.create({
        seasonId: season.id,
        name: "Liga",
        goalieMinGames: 3,
      }))!
      // Need at least one round for the division to exist properly
      await admin.round.create({ divisionId: division.id, name: "R1" })

      const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const qualifiedGoalie = (await admin.player.create({ firstName: "Qualified", lastName: "Goalie" }))!
      const belowGoalie = (await admin.player.create({ firstName: "Below", lastName: "Goalie" }))!

      const db = getTestDb()
      await db.goalieSeasonStat.createMany({
        data: [
          {
            organizationId: TEST_ORG_ID,
            playerId: qualifiedGoalie.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 5,
            goalsAgainst: 10,
            gaa: "2.00",
          },
          {
            organizationId: TEST_ORG_ID,
            playerId: belowGoalie.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 1,
            goalsAgainst: 4,
            gaa: "4.00",
          },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.goalieStats({ seasonId: season.id })

      expect(result.minGames).toBe(3)
      expect(result.qualified).toHaveLength(1)
      expect(result.qualified[0]?.player?.lastName).toBe("Goalie")
      expect(result.qualified[0]?.player?.firstName).toBe("Qualified")
      expect(result.qualified[0]?.gamesPlayed).toBe(5)

      expect(result.belowThreshold).toHaveLength(1)
      expect(result.belowThreshold[0]?.player?.firstName).toBe("Below")
      expect(result.belowThreshold[0]?.gamesPlayed).toBe(1)
    })

    it("sorts qualified goalies by GAA ascending (best first)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({
        seasonId: season.id,
        name: "Liga",
        goalieMinGames: 2,
      }))!
      await admin.round.create({ divisionId: division.id, name: "R1" })

      const team = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const bestGoalie = (await admin.player.create({ firstName: "Best", lastName: "Goalie" }))!
      const worstGoalie = (await admin.player.create({ firstName: "Worst", lastName: "Goalie" }))!

      const db = getTestDb()
      await db.goalieSeasonStat.createMany({
        data: [
          {
            organizationId: TEST_ORG_ID,
            playerId: worstGoalie.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 5,
            goalsAgainst: 25,
            gaa: "5.00",
          },
          {
            organizationId: TEST_ORG_ID,
            playerId: bestGoalie.id,
            seasonId: season.id,
            teamId: team.id,
            gamesPlayed: 5,
            goalsAgainst: 5,
            gaa: "1.00",
          },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.goalieStats({ seasonId: season.id })

      expect(result.qualified).toHaveLength(2)
      // Best GAA first
      expect(result.qualified[0]?.player?.firstName).toBe("Best")
      expect(result.qualified[1]?.player?.firstName).toBe("Worst")
    })

    it("filters by teamId when provided", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({
        seasonId: season.id,
        name: "Liga",
        goalieMinGames: 1,
      }))!
      await admin.round.create({ divisionId: division.id, name: "R1" })

      const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
      const goalieA = (await admin.player.create({ firstName: "Goalie", lastName: "A" }))!
      const goalieB = (await admin.player.create({ firstName: "Goalie", lastName: "B" }))!

      const db = getTestDb()
      await db.goalieSeasonStat.createMany({
        data: [
          {
            organizationId: TEST_ORG_ID,
            playerId: goalieA.id,
            seasonId: season.id,
            teamId: teamA.id,
            gamesPlayed: 5,
            goalsAgainst: 10,
            gaa: "2.00",
          },
          {
            organizationId: TEST_ORG_ID,
            playerId: goalieB.id,
            seasonId: season.id,
            teamId: teamB.id,
            gamesPlayed: 5,
            goalsAgainst: 15,
            gaa: "3.00",
          },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.goalieStats({ seasonId: season.id, teamId: teamA.id })
      expect(result.qualified).toHaveLength(1)
      expect(result.qualified[0]?.player?.firstName).toBe("Goalie")
      expect(result.qualified[0]?.team?.shortName).toBe("EAG")
    })
  })

  // ── penaltyStats ─────────────────────────────────────────────────────

  describe("penaltyStats", () => {
    it("returns empty list when no completed games exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.penaltyStats({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("aggregates penalty minutes per player from completed games", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerB1 } = await setupSeasonWithGame()

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [{ id: playerA1.id, position: "forward" }],
        playersB: [{ id: playerB1.id, position: "forward" }],
        penalties: [
          { teamId: teamA.id, playerId: playerA1.id, minutes: 2 },
          { teamId: teamA.id, playerId: playerA1.id, minutes: 5 },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.penaltyStats({ seasonId: season.id })
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]?.totalMinutes).toBe(7)
      expect(result[0]?.totalCount).toBe(2)
    })

    it("filters by teamId when provided", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerB1 } = await setupSeasonWithGame()

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [{ id: playerA1.id, position: "forward" }],
        playersB: [{ id: playerB1.id, position: "forward" }],
        penalties: [
          { teamId: teamA.id, playerId: playerA1.id, minutes: 2 },
          { teamId: teamB.id, playerId: playerB1.id, minutes: 4 },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.penaltyStats({ seasonId: season.id, teamId: teamB.id })
      expect(result).toHaveLength(1)
      expect(result[0]?.totalMinutes).toBe(4)
    })

    it("ignores games from rounds where countsForPlayerStats is false", async () => {
      const { admin, season, teamA, teamB, playerA1, playerB1 } = await setupSeasonWithGame({
        countsForPlayerStats: false,
      })
      const { round } = await (async () => {
        // The round from setupSeasonWithGame has countsForPlayerStats=false
        // We need to get it
        const caller = createTestCaller({ asAdmin: true })
        const info = await caller.stats.seasonRoundInfo({ seasonId: season.id })
        const round = info[0]!.rounds[0]!
        return { round }
      })()

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [{ id: playerA1.id, position: "forward" }],
        playersB: [{ id: playerB1.id, position: "forward" }],
        penalties: [{ teamId: teamA.id, playerId: playerA1.id, minutes: 10 }],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.penaltyStats({ seasonId: season.id })
      // Round doesn't count for stats, so penalties should be empty
      expect(result).toEqual([])
    })
  })

  // ── teamPenaltyStats ─────────────────────────────────────────────────

  describe("teamPenaltyStats", () => {
    it("returns empty list when no completed games exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.teamPenaltyStats({ seasonId: season.id })
      expect(result).toEqual([])
    })

    it("aggregates penalty minutes per team from completed games", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerB1 } = await setupSeasonWithGame()

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [{ id: playerA1.id, position: "forward" }],
        playersB: [{ id: playerB1.id, position: "forward" }],
        penalties: [
          { teamId: teamA.id, playerId: playerA1.id, minutes: 2 },
          { teamId: teamA.id, playerId: playerA1.id, minutes: 5 },
          { teamId: teamB.id, playerId: playerB1.id, minutes: 10 },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.stats.teamPenaltyStats({ seasonId: season.id })

      // Sorted by totalMinutes desc, so teamB (10) first, then teamA (7)
      expect(result).toHaveLength(2)
      const teamBStats = result.find((r) => r.team?.id === teamB.id)
      expect(teamBStats?.totalMinutes).toBe(10)
      expect(teamBStats?.totalCount).toBe(1)

      const teamAStats = result.find((r) => r.team?.id === teamA.id)
      expect(teamAStats?.totalMinutes).toBe(7)
      expect(teamAStats?.totalCount).toBe(2)
    })
  })

  // ── Integration: game.complete triggers stats recalculation ──────────

  describe("integration: game.complete triggers stats recalculation", () => {
    it("populates playerSeasonStats when a game is completed", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerA2, playerB1 } = await setupSeasonWithGame()

      // Before completing any game, stats should be empty
      const caller = createTestCaller({ asAdmin: true })
      const before = await caller.stats.playerStats({ seasonId: season.id })
      expect(before).toEqual([])

      // Complete a game with goals and assists
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [
          { id: playerA1.id, position: "forward" },
          { id: playerA2.id, position: "defense" },
        ],
        playersB: [{ id: playerB1.id, position: "forward" }],
        goals: [
          { teamId: teamA.id, scorerId: playerA1.id, assist1Id: playerA2.id },
          { teamId: teamA.id, scorerId: playerA1.id },
          { teamId: teamB.id, scorerId: playerB1.id },
        ],
        penalties: [{ teamId: teamA.id, playerId: playerA2.id, minutes: 2 }],
      })

      // After completing, stats should be populated
      const after = await caller.stats.playerStats({ seasonId: season.id })
      expect(after.length).toBeGreaterThan(0)

      // playerA1: 2 goals, 0 assists = 2 points
      const a1Stats = after.find((s) => s.playerId === playerA1.id)
      expect(a1Stats).toBeDefined()
      expect(a1Stats?.goals).toBe(2)
      expect(a1Stats?.assists).toBe(0)
      expect(a1Stats?.totalPoints).toBe(2)
      expect(a1Stats?.gamesPlayed).toBe(1)

      // playerA2: 0 goals, 1 assist = 1 point, 2 PIM
      const a2Stats = after.find((s) => s.playerId === playerA2.id)
      expect(a2Stats).toBeDefined()
      expect(a2Stats?.goals).toBe(0)
      expect(a2Stats?.assists).toBe(1)
      expect(a2Stats?.totalPoints).toBe(1)
      expect(a2Stats?.penaltyMinutes).toBe(2)

      // playerB1: 1 goal, 0 assists = 1 point
      const b1Stats = after.find((s) => s.playerId === playerB1.id)
      expect(b1Stats).toBeDefined()
      expect(b1Stats?.goals).toBe(1)
      expect(b1Stats?.totalPoints).toBe(1)
    })

    it("populates goalieSeasonStats when a game with goalie data is completed", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerB1, goalieA, goalieB } = await setupSeasonWithGame({
        goalieMinGames: 1,
      })

      const caller = createTestCaller({ asAdmin: true })
      const before = await caller.stats.goalieStats({ seasonId: season.id })
      expect(before.qualified).toEqual([])

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [
          { id: playerA1.id, position: "forward" },
          { id: goalieA.id, position: "goalie" },
        ],
        playersB: [
          { id: playerB1.id, position: "forward" },
          { id: goalieB.id, position: "goalie" },
        ],
        goals: [
          { teamId: teamA.id, scorerId: playerA1.id },
          { teamId: teamA.id, scorerId: playerA1.id },
        ],
        goalieStats: [
          { playerId: goalieA.id, teamId: teamA.id, goalsAgainst: 0 },
          { playerId: goalieB.id, teamId: teamB.id, goalsAgainst: 2 },
        ],
      })

      const after = await caller.stats.goalieStats({ seasonId: season.id })
      expect(after.qualified.length).toBeGreaterThanOrEqual(2)

      const goalieAStats = after.qualified.find((s) => s.playerId === goalieA.id)
      expect(goalieAStats).toBeDefined()
      expect(goalieAStats?.gamesPlayed).toBe(1)
      expect(goalieAStats?.goalsAgainst).toBe(0)
      expect(Number(goalieAStats?.gaa)).toBe(0)

      const goalieBStats = after.qualified.find((s) => s.playerId === goalieB.id)
      expect(goalieBStats).toBeDefined()
      expect(goalieBStats?.goalsAgainst).toBe(2)
      expect(Number(goalieBStats?.gaa)).toBe(2)
    })

    it("does not count games from rounds with countsForPlayerStats=false", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!
      const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!

      // Create two rounds: one counts, one doesn't
      const countingRound = (await admin.round.create({
        divisionId: division.id,
        name: "Regular",
        countsForPlayerStats: true,
      }))!
      const nonCountingRound = (await admin.round.create({
        divisionId: division.id,
        name: "Exhibition",
        countsForPlayerStats: false,
      }))!

      const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
      const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
      await admin.teamDivision.assign({ teamId: teamA.id, divisionId: division.id })
      await admin.teamDivision.assign({ teamId: teamB.id, divisionId: division.id })

      const playerA = (await admin.player.create({ firstName: "Player", lastName: "A" }))!
      const playerB = (await admin.player.create({ firstName: "Player", lastName: "B" }))!
      await admin.contract.signPlayer({
        playerId: playerA.id,
        teamId: teamA.id,
        seasonId: season.id,
        position: "forward",
      })
      await admin.contract.signPlayer({
        playerId: playerB.id,
        teamId: teamB.id,
        seasonId: season.id,
        position: "forward",
      })

      // Complete a game in the non-counting round with 5 goals
      await createAndCompleteGame(admin, {
        roundId: nonCountingRound.id,
        teamA,
        teamB,
        playersA: [{ id: playerA.id, position: "forward" }],
        playersB: [{ id: playerB.id, position: "forward" }],
        goals: Array.from({ length: 5 }, () => ({ teamId: teamA.id, scorerId: playerA.id })),
      })

      // Complete a game in the counting round with 1 goal
      await createAndCompleteGame(admin, {
        roundId: countingRound.id,
        teamA,
        teamB,
        playersA: [{ id: playerA.id, position: "forward" }],
        playersB: [{ id: playerB.id, position: "forward" }],
        goals: [{ teamId: teamA.id, scorerId: playerA.id }],
      })

      const caller = createTestCaller({ asAdmin: true })
      const stats = await caller.stats.playerStats({ seasonId: season.id })

      // Only the counting round's goal should be counted
      const playerAStats = stats.find((s) => s.playerId === playerA.id)
      expect(playerAStats).toBeDefined()
      expect(playerAStats?.goals).toBe(1)
      expect(playerAStats?.gamesPlayed).toBe(1)
    })

    it("handles assist1 and assist2 correctly", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerA2, playerB1 } = await setupSeasonWithGame()

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [
          { id: playerA1.id, position: "forward" },
          { id: playerA2.id, position: "defense" },
        ],
        playersB: [{ id: playerB1.id, position: "forward" }],
        goals: [
          // playerA1 scores, assisted by playerA2 (assist1) and playerB1 won't assist here
          { teamId: teamA.id, scorerId: playerA1.id, assist1Id: playerA2.id },
          // playerA2 scores, assisted by playerA1 (assist1) and playerA2 can't self-assist
          { teamId: teamA.id, scorerId: playerA2.id, assist1Id: playerA1.id },
        ],
      })

      const caller = createTestCaller({ asAdmin: true })
      const stats = await caller.stats.playerStats({ seasonId: season.id })

      // playerA1: 1 goal + 1 assist = 2 points
      const a1 = stats.find((s) => s.playerId === playerA1.id)
      expect(a1?.goals).toBe(1)
      expect(a1?.assists).toBe(1)
      expect(a1?.totalPoints).toBe(2)

      // playerA2: 1 goal + 1 assist = 2 points
      const a2 = stats.find((s) => s.playerId === playerA2.id)
      expect(a2?.goals).toBe(1)
      expect(a2?.assists).toBe(1)
      expect(a2?.totalPoints).toBe(2)
    })
  })

  // ── recalculate endpoint ─────────────────────────────────────────────

  describe("recalculate", () => {
    it("requires authentication", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const season = (await admin.season.create({
        name: "2025/26",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      }))!

      const caller = createTestCaller()
      await expect(caller.stats.recalculate({ seasonId: season.id })).rejects.toThrow()
    })

    it("recalculates player and goalie stats on demand", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerB1, goalieA, goalieB } = await setupSeasonWithGame({
        goalieMinGames: 1,
      })

      // Create and complete a game
      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [
          { id: playerA1.id, position: "forward" },
          { id: goalieA.id, position: "goalie" },
        ],
        playersB: [
          { id: playerB1.id, position: "forward" },
          { id: goalieB.id, position: "goalie" },
        ],
        goals: [{ teamId: teamA.id, scorerId: playerA1.id }],
        goalieStats: [
          { playerId: goalieA.id, teamId: teamA.id, goalsAgainst: 0 },
          { playerId: goalieB.id, teamId: teamB.id, goalsAgainst: 1 },
        ],
      })

      // Verify stats exist after game.complete
      const caller = createTestCaller({ asAdmin: true })
      let playerStats = await caller.stats.playerStats({ seasonId: season.id })
      expect(playerStats.length).toBeGreaterThan(0)

      // Delete all stats manually to simulate stale state
      const db = getTestDb()
      await db.playerSeasonStat.deleteMany()
      await db.goalieSeasonStat.deleteMany()

      // Verify stats are gone
      playerStats = await caller.stats.playerStats({ seasonId: season.id })
      expect(playerStats).toEqual([])

      // Recalculate via admin endpoint
      const result = await admin.stats.recalculate({ seasonId: season.id })
      expect(result.success).toBe(true)

      // Stats should be back
      playerStats = await caller.stats.playerStats({ seasonId: season.id })
      expect(playerStats.length).toBeGreaterThan(0)

      const goalieStats = await caller.stats.goalieStats({ seasonId: season.id })
      expect(goalieStats.qualified.length + goalieStats.belowThreshold.length).toBeGreaterThan(0)
    })
  })

  // ── round.update triggers recalculation ──────────────────────────────

  describe("round.update recalculates stats when counting flags change", () => {
    it("removes player stats when countsForPlayerStats is toggled off", async () => {
      const { admin, season, round, teamA, teamB, playerA1, playerB1 } = await setupSeasonWithGame()

      await createAndCompleteGame(admin, {
        roundId: round.id,
        teamA,
        teamB,
        playersA: [{ id: playerA1.id, position: "forward" }],
        playersB: [{ id: playerB1.id, position: "forward" }],
        goals: [{ teamId: teamA.id, scorerId: playerA1.id }],
      })

      const caller = createTestCaller({ asAdmin: true })

      // Stats should exist
      let stats = await caller.stats.playerStats({ seasonId: season.id })
      expect(stats.length).toBeGreaterThan(0)

      // Toggle off countsForPlayerStats
      await admin.round.update({ id: round.id, countsForPlayerStats: false })

      // Stats should now be empty (no eligible rounds)
      stats = await caller.stats.playerStats({ seasonId: season.id })
      expect(stats).toEqual([])
    })
  })
})
