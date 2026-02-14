import { describe, expect, it } from "vitest"
import { generateRoundRobin } from "../../services/schedulerService"

describe("scheduler service", () => {
  describe("generateRoundRobin", () => {
    it("generates all home/away matchups for 4 teams", () => {
      const teams = ["a", "b", "c", "d"]
      const games = generateRoundRobin(teams)

      // 4 teams: 4*3 = 12 games (each pair plays twice, home and away)
      expect(games).toHaveLength(12)

      // Every team should play 6 games (3 home, 3 away)
      for (const team of teams) {
        const teamGames = games.filter((g) => g.homeTeamId === team || g.awayTeamId === team)
        expect(teamGames).toHaveLength(6)
      }
    })

    it("generates home and away for each pair", () => {
      const teams = ["a", "b", "c"]
      const games = generateRoundRobin(teams)

      // a vs b should exist in both directions
      expect(games).toContainEqual({ homeTeamId: "a", awayTeamId: "b" })
      expect(games).toContainEqual({ homeTeamId: "b", awayTeamId: "a" })
    })

    it("returns empty for less than 2 teams", () => {
      expect(generateRoundRobin([])).toEqual([])
      expect(generateRoundRobin(["a"])).toEqual([])
    })

    it("generates 2 games for 2 teams", () => {
      const games = generateRoundRobin(["a", "b"])
      expect(games).toHaveLength(2)
    })
  })
})
