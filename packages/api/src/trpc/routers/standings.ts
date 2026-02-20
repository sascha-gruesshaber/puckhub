import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { recalculateStandings } from "../../services/standingsService"
import { adminProcedure, publicProcedure, router } from "../init"

export const standingsRouter = router({
  getByRound: publicProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.standings.findMany({
      where: eq(schema.standings.roundId, input.roundId),
      orderBy: (standings, { asc, desc }) => [
        desc(standings.totalPoints),
        asc(standings.gamesPlayed),
        desc(standings.goalDifference),
        desc(standings.goalsFor),
      ],
    })
  }),

  recalculate: adminProcedure.input(z.object({ roundId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await recalculateStandings(ctx.db, input.roundId)
    return { success: true }
  }),

  recalculateAll: adminProcedure.input(z.object({ divisionId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const rounds = await ctx.db.query.rounds.findMany({
      where: eq(schema.rounds.divisionId, input.divisionId),
      columns: { id: true },
      orderBy: (rounds, { asc }) => [asc(rounds.sortOrder)],
    })
    for (const round of rounds) {
      await recalculateStandings(ctx.db, round.id)
    }
    return { roundsRecalculated: rounds.length }
  }),

  teamForm: publicProcedure
    .input(
      z.object({
        roundId: z.string().uuid(),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const completedGames = await ctx.db.query.games.findMany({
        where: and(eq(schema.games.roundId, input.roundId), eq(schema.games.status, "completed")),
        columns: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          finalizedAt: true,
        },
        orderBy: (games, { desc }) => [desc(games.finalizedAt)],
      })

      type FormEntry = { result: "W" | "D" | "L"; opponentId: string; goalsFor: number; goalsAgainst: number }
      const teamResults = new Map<string, FormEntry[]>()

      for (const game of completedGames) {
        const hs = game.homeScore ?? 0
        const as_ = game.awayScore ?? 0

        // Home team result
        if (!teamResults.has(game.homeTeamId)) teamResults.set(game.homeTeamId, [])
        const homeForm = teamResults.get(game.homeTeamId)!
        if (homeForm.length < input.limit) {
          homeForm.push({
            result: hs > as_ ? "W" : hs < as_ ? "L" : "D",
            opponentId: game.awayTeamId,
            goalsFor: hs,
            goalsAgainst: as_,
          })
        }

        // Away team result
        if (!teamResults.has(game.awayTeamId)) teamResults.set(game.awayTeamId, [])
        const awayForm = teamResults.get(game.awayTeamId)!
        if (awayForm.length < input.limit) {
          awayForm.push({
            result: as_ > hs ? "W" : as_ < hs ? "L" : "D",
            opponentId: game.homeTeamId,
            goalsFor: as_,
            goalsAgainst: hs,
          })
        }
      }

      return Array.from(teamResults.entries()).map(([teamId, form]) => ({
        teamId,
        form,
      }))
    }),
})
