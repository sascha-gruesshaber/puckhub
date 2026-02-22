import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("dashboard router", () => {
  it("returns overview with zero counts for empty season", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({
      name: "2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!

    const result = await admin.dashboard.getOverview({ seasonId: season.id })

    expect(result.counts.teams).toBe(0)
    expect(result.counts.players).toBe(0)
    expect(result.counts.completed).toBe(0)
    expect(result.counts.remaining).toBe(0)
    expect(result.missingReports).toEqual([])
    expect(result.upcomingGames).toEqual([])
    expect(result.topScorers).toEqual([])
    expect(result.topPenalized).toEqual([])
    expect(result.recentResults).toEqual([])
  })

  it("counts teams assigned to season divisions", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({
      name: "2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!
    const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
    const teamA = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
    const teamB = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
    await admin.teamDivision.assign({ teamId: teamA.id, divisionId: division.id })
    await admin.teamDivision.assign({ teamId: teamB.id, divisionId: division.id })

    const result = await admin.dashboard.getOverview({ seasonId: season.id })

    expect(result.counts.teams).toBe(2)
  })

  it("counts completed and remaining games", async () => {
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

    // Create two games
    const game1 = (await admin.game.create({
      roundId: round.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    }))!
    const game2 = (await admin.game.create({
      roundId: round.id,
      homeTeamId: awayTeam.id,
      awayTeamId: homeTeam.id,
    }))!

    // Set lineup and complete game1
    await admin.gameReport.setLineup({
      gameId: game1.id,
      players: [
        { playerId: homePlayer.id, teamId: homeTeam.id, position: "forward" },
        { playerId: awayPlayer.id, teamId: awayTeam.id, position: "forward" },
      ],
    })
    await admin.game.complete({ id: game1.id })

    const result = await admin.dashboard.getOverview({ seasonId: season.id })

    expect(result.counts.completed).toBe(1)
    expect(result.counts.remaining).toBe(1)
  })

  it("rejects unauthenticated access", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({
      name: "2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!

    const publicCaller = createTestCaller()
    await expect(publicCaller.dashboard.getOverview({ seasonId: season.id })).rejects.toThrow(
      "Not authenticated",
    )
  })

  it("allows non-admin member access (dashboard visible to all org members)", async () => {
    const admin = createTestCaller({ asAdmin: true })
    const season = (await admin.season.create({
      name: "2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!

    const userCaller = createTestCaller({ asUser: true })
    const result = await userCaller.dashboard.getOverview({ seasonId: season.id })
    expect(result.counts).toBeDefined()
  })
})
