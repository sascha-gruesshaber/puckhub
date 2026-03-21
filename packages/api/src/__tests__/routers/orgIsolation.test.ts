import { beforeEach, describe, expect, it } from "vitest"
import {
  createOtherOrgAdminCaller,
  createTestCaller,
  getTestDb,
  OTHER_ORG_ID,
  seedSecondOrg,
  TEST_ORG_ID,
} from "../testUtils"

// =============================================================================
// Helpers: seed a full season structure for an org via its caller
// =============================================================================

async function seedFullSeason(caller: ReturnType<typeof createTestCaller>, orgId: string) {
  const db = getTestDb()

  const season = (await caller.season.create({
    name: `Season ${orgId}`,
    seasonStart: "2025-09-01",
    seasonEnd: "2026-04-30",
  }))!
  const division = (await caller.division.create({ seasonId: season.id, name: "Liga" }))!
  const round = (await caller.round.create({
    divisionId: division.id,
    name: "Hauptrunde",
    countsForPlayerStats: true,
    countsForGoalieStats: true,
  }))!

  const homeTeam = (await caller.team.create({ name: `Home ${orgId}`, shortName: "HOM" }))!
  const awayTeam = (await caller.team.create({ name: `Away ${orgId}`, shortName: "AWY" }))!
  await caller.teamDivision.assign({ teamId: homeTeam.id, divisionId: division.id })
  await caller.teamDivision.assign({ teamId: awayTeam.id, divisionId: division.id })

  const player1 = (await caller.player.create({ firstName: "Player1", lastName: orgId }))!
  const player2 = (await caller.player.create({ firstName: "Player2", lastName: orgId }))!
  await caller.contract.signPlayer({
    playerId: player1.id,
    teamId: homeTeam.id,
    seasonId: season.id,
    position: "forward",
  })
  await caller.contract.signPlayer({
    playerId: player2.id,
    teamId: awayTeam.id,
    seasonId: season.id,
    position: "forward",
  })

  // Create a future game (upcoming)
  const futureGame = (await caller.game.create({
    roundId: round.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: `Arena ${orgId}`,
  }))!

  // Create a game and complete it (recent result)
  const completedGame = (await caller.game.create({
    roundId: round.id,
    homeTeamId: awayTeam.id,
    awayTeamId: homeTeam.id,
  }))!
  await caller.gameReport.setLineup({
    gameId: completedGame.id,
    players: [
      { playerId: player1.id, teamId: homeTeam.id, position: "forward" },
      { playerId: player2.id, teamId: awayTeam.id, position: "forward" },
    ],
  })
  await caller.game.complete({ id: completedGame.id })

  // Create a past scheduled game (missing report)
  const pastGame = (await caller.game.create({
    roundId: round.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    scheduledAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    location: `Arena ${orgId}`,
  }))!

  // Create a public game report
  await db.publicGameReport.create({
    data: {
      organizationId: orgId,
      gameId: futureGame.id,
      homeScore: 3,
      awayScore: 1,
      submitterEmailHash: `hash-${orgId}`,
      submitterEmailMasked: `f***@${orgId}.local`,
    },
  })

  return { season, division, round, homeTeam, awayTeam, player1, player2, futureGame, completedGame, pastGame }
}

// =============================================================================
// Organization Data Isolation Tests
// =============================================================================

describe("organization data isolation", () => {
  let orgACaller: ReturnType<typeof createTestCaller>
  let orgBCaller: ReturnType<typeof createOtherOrgAdminCaller>
  let orgAData: Awaited<ReturnType<typeof seedFullSeason>>
  let orgBData: Awaited<ReturnType<typeof seedFullSeason>>

  beforeEach(async () => {
    await seedSecondOrg()
    orgACaller = createTestCaller({ asAdmin: true })
    orgBCaller = createOtherOrgAdminCaller()

    orgAData = await seedFullSeason(orgACaller, TEST_ORG_ID)
    orgBData = await seedFullSeason(orgBCaller, OTHER_ORG_ID)
  })

  // ── Dashboard ─────────────────────────────────────────────────────

  describe("dashboard.getOverview", () => {
    it("org A sees only its own team count", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgAData.season.id })
      expect(result.counts.teams).toBe(2)
      expect(result.counts.totalTeams).toBe(2)
    })

    it("org B sees only its own team count", async () => {
      const result = await orgBCaller.dashboard.getOverview({ seasonId: orgBData.season.id })
      expect(result.counts.teams).toBe(2)
      expect(result.counts.totalTeams).toBe(2)
    })

    it("org A sees only its own player count", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgAData.season.id })
      expect(result.counts.players).toBe(2)
      expect(result.counts.totalPlayers).toBe(2)
    })

    it("org B sees only its own player count", async () => {
      const result = await orgBCaller.dashboard.getOverview({ seasonId: orgBData.season.id })
      expect(result.counts.players).toBe(2)
      expect(result.counts.totalPlayers).toBe(2)
    })

    it("org A sees only its own game counts", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgAData.season.id })
      expect(result.counts.completed).toBe(1)
      // remaining = 1 future game (past scheduled game is "report_pending", not "remaining")
      expect(result.counts.remaining).toBe(1)
    })

    it("org B sees only its own game counts", async () => {
      const result = await orgBCaller.dashboard.getOverview({ seasonId: orgBData.season.id })
      expect(result.counts.completed).toBe(1)
      expect(result.counts.remaining).toBe(1)
    })

    it("org A upcoming games only contains its own games", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgAData.season.id })
      expect(result.upcomingGames).toHaveLength(1)
      expect(result.upcomingGames[0]!.id).toBe(orgAData.futureGame.id)
    })

    it("org B upcoming games only contains its own games", async () => {
      const result = await orgBCaller.dashboard.getOverview({ seasonId: orgBData.season.id })
      expect(result.upcomingGames).toHaveLength(1)
      expect(result.upcomingGames[0]!.id).toBe(orgBData.futureGame.id)
    })

    it("org A recent results only contains its own games", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgAData.season.id })
      expect(result.recentResults).toHaveLength(1)
      expect(result.recentResults[0]!.id).toBe(orgAData.completedGame.id)
    })

    it("org A missing reports only contains its own games", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgAData.season.id })
      expect(result.missingReports).toHaveLength(1)
      expect(result.missingReports[0]!.id).toBe(orgAData.pastGame.id)
    })

    it("org B missing reports only contains its own games", async () => {
      const result = await orgBCaller.dashboard.getOverview({ seasonId: orgBData.season.id })
      expect(result.missingReports).toHaveLength(1)
      expect(result.missingReports[0]!.id).toBe(orgBData.pastGame.id)
    })

    it("using org B season ID with org A caller returns no season-specific data", async () => {
      const result = await orgACaller.dashboard.getOverview({ seasonId: orgBData.season.id })
      // Teams are strictly season-scoped (via divisions) — must be 0
      expect(result.counts.teams).toBe(0)
      // Players use contract date-range overlap and are org-scoped, so org A's
      // own players with overlapping contracts may appear (not a cross-org leak)
      expect(result.counts.completed).toBe(0)
      expect(result.counts.remaining).toBe(0)
      expect(result.upcomingGames).toEqual([])
      expect(result.recentResults).toEqual([])
      expect(result.missingReports).toEqual([])
    })
  })

  // ── Public Game Reports ───────────────────────────────────────────

  describe("publicGameReport.count", () => {
    it("org A count only includes its own reports", async () => {
      const result = await orgACaller.publicGameReport.count({})
      expect(result.count).toBe(1)
    })

    it("org B count only includes its own reports", async () => {
      const result = await orgBCaller.publicGameReport.count({})
      expect(result.count).toBe(1)
    })

    it("org A count with seasonId filters to its own season", async () => {
      const result = await orgACaller.publicGameReport.count({ seasonId: orgAData.season.id })
      expect(result.count).toBe(1)
    })

    it("org A count with org B seasonId returns 0", async () => {
      const result = await orgACaller.publicGameReport.count({ seasonId: orgBData.season.id })
      expect(result.count).toBe(0)
    })
  })

  describe("publicGameReport.list", () => {
    it("org A list only includes its own reports", async () => {
      const result = await orgACaller.publicGameReport.list({})
      expect(result.items).toHaveLength(1)
      expect(result.items[0]!.game.id).toBe(orgAData.futureGame.id)
    })

    it("org B list only includes its own reports", async () => {
      const result = await orgBCaller.publicGameReport.list({})
      expect(result.items).toHaveLength(1)
      expect(result.items[0]!.game.id).toBe(orgBData.futureGame.id)
    })

    it("org A list with org B seasonId returns empty", async () => {
      const result = await orgACaller.publicGameReport.list({ seasonId: orgBData.season.id })
      expect(result.items).toEqual([])
    })
  })

  // ── Basic CRUD isolation ──────────────────────────────────────────

  describe("CRUD list endpoints", () => {
    it("org A team.list only returns its own teams", async () => {
      const teams = await orgACaller.team.list()
      expect(teams).toHaveLength(2)
      expect(teams.every((t: any) => t.organizationId === TEST_ORG_ID)).toBe(true)
    })

    it("org B team.list only returns its own teams", async () => {
      const teams = await orgBCaller.team.list()
      expect(teams).toHaveLength(2)
      expect(teams.every((t: any) => t.organizationId === OTHER_ORG_ID)).toBe(true)
    })

    it("org A player.list only returns its own players", async () => {
      const players = await orgACaller.player.list()
      expect(players).toHaveLength(2)
      expect(players.every((p: any) => p.organizationId === TEST_ORG_ID)).toBe(true)
    })

    it("org B player.list only returns its own players", async () => {
      const players = await orgBCaller.player.list()
      expect(players).toHaveLength(2)
      expect(players.every((p: any) => p.organizationId === OTHER_ORG_ID)).toBe(true)
    })

    it("org A season.list only returns its own seasons", async () => {
      const seasons = await orgACaller.season.list()
      expect(seasons).toHaveLength(1)
      expect(seasons[0]!.organizationId).toBe(TEST_ORG_ID)
    })

    it("org B season.list only returns its own seasons", async () => {
      const seasons = await orgBCaller.season.list()
      expect(seasons).toHaveLength(1)
      expect(seasons[0]!.organizationId).toBe(OTHER_ORG_ID)
    })
  })

  // ── Stats isolation ───────────────────────────────────────────────

  describe("stats endpoints", () => {
    it("org A penaltyStats only returns its own data", async () => {
      const result = await orgACaller.stats.penaltyStats({
        seasonId: orgAData.season.id,
      })
      // No penalties were created, so empty — but crucially no error and no cross-org data
      expect(result).toEqual([])
    })

    it("org A teamPenaltyStats only returns its own data", async () => {
      const result = await orgACaller.stats.teamPenaltyStats({
        seasonId: orgAData.season.id,
      })
      expect(result).toEqual([])
    })

    it("org B stats with own seasonId does not leak org A data", async () => {
      const result = await orgBCaller.stats.penaltyStats({
        seasonId: orgBData.season.id,
      })
      expect(result).toEqual([])
    })
  })
})
