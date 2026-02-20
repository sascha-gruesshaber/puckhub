import * as schema from "@puckhub/db/schema"
import { recalculateGoalieStats, recalculatePlayerStats } from "@puckhub/db/services"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

const roundTypeValues = [
  "regular",
  "preround",
  "playoffs",
  "playdowns",
  "playups",
  "relegation",
  "placement",
  "final",
] as const

export const roundRouter = router({
  listByDivision: publicProcedure.input(z.object({ divisionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.rounds.findMany({
      where: eq(schema.rounds.divisionId, input.divisionId),
      orderBy: (rounds, { asc }) => [asc(rounds.sortOrder)],
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.rounds.findFirst({
      where: eq(schema.rounds.id, input.id),
    })
  }),

  create: adminProcedure
    .input(
      z.object({
        divisionId: z.string().uuid(),
        name: z.string().min(1),
        roundType: z.enum(roundTypeValues).default("regular"),
        sortOrder: z.number().int().default(0),
        pointsWin: z.number().int().default(2),
        pointsDraw: z.number().int().default(1),
        pointsLoss: z.number().int().default(0),
        countsForPlayerStats: z.boolean().default(true),
        countsForGoalieStats: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [round] = await ctx.db.insert(schema.rounds).values(input).returning()
      return round
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        roundType: z.enum(roundTypeValues).optional(),
        sortOrder: z.number().int().optional(),
        pointsWin: z.number().int().optional(),
        pointsDraw: z.number().int().optional(),
        pointsLoss: z.number().int().optional(),
        countsForPlayerStats: z.boolean().optional(),
        countsForGoalieStats: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Check if counting flags are being changed — need old values to compare
      const statsToggleChanged = input.countsForPlayerStats !== undefined || input.countsForGoalieStats !== undefined

      const [round] = await ctx.db
        .update(schema.rounds)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.rounds.id, id))
        .returning()

      // Recalculate stats when counting flags change
      if (statsToggleChanged && round) {
        const division = await ctx.db.query.divisions.findFirst({
          where: eq(schema.divisions.id, round.divisionId),
          columns: { seasonId: true },
        })
        if (division) {
          if (input.countsForPlayerStats !== undefined) {
            await recalculatePlayerStats(ctx.db, division.seasonId)
          }
          if (input.countsForGoalieStats !== undefined) {
            await recalculateGoalieStats(ctx.db, division.seasonId)
          }
        }
      }

      return round
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.rounds).where(eq(schema.rounds.id, input.id))
  }),
})
