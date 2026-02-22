import { recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const standingsRouter = router({
  getByRound: orgProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.standing.findMany({
      where: {
        roundId: input.roundId,
        organizationId: ctx.organizationId,
      },
      orderBy: [
        { totalPoints: "desc" },
        { gamesPlayed: "asc" },
        { goalDifference: "desc" },
        { goalsFor: "desc" },
      ],
    })
  }),

  recalculate: orgAdminProcedure.input(z.object({ roundId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await recalculateStandings(ctx.db, input.roundId)
    return { success: true }
  }),

  recalculateAll: orgAdminProcedure
    .input(z.object({ divisionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const rounds = await ctx.db.round.findMany({
        where: { divisionId: input.divisionId },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      })
      for (const round of rounds) {
        await recalculateStandings(ctx.db, round.id)
      }
      return { roundsRecalculated: rounds.length }
    }),

  teamForm: orgProcedure
    .input(
      z.object({
        roundId: z.string().uuid(),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const completedGames = await ctx.db.game.findMany({
        where: {
          roundId: input.roundId,
          organizationId: ctx.organizationId,
          status: "completed",
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          finalizedAt: true,
        },
        orderBy: { finalizedAt: "desc" },
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
