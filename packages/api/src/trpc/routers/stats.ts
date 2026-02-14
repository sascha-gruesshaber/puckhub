import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { publicProcedure, router } from "../init"

export const statsRouter = router({
  playerStats: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.playerSeasonStats.seasonId, input.seasonId)]
      if (input.teamId) {
        conditions.push(eq(schema.playerSeasonStats.teamId, input.teamId))
      }
      return ctx.db.query.playerSeasonStats.findMany({
        where: and(...conditions),
        orderBy: (stats, { desc }) => [desc(stats.totalPoints), desc(stats.goals)],
      })
    }),

  goalieStats: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.goalieSeasonStats.seasonId, input.seasonId)]
      if (input.teamId) {
        conditions.push(eq(schema.goalieSeasonStats.teamId, input.teamId))
      }
      return ctx.db.query.goalieSeasonStats.findMany({
        where: and(...conditions),
        orderBy: (stats, { asc }) => [asc(stats.gaa)],
      })
    }),
})
