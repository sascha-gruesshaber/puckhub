import { recalculateGoalieStats, recalculatePlayerStats } from '@puckhub/db/services'
import { z } from 'zod'
import { orgAdminProcedure, orgProcedure, router } from '../init'

const roundTypeValues = [
  'regular',
  'preround',
  'playoffs',
  'playdowns',
  'playups',
  'relegation',
  'placement',
  'final',
] as const

export const roundRouter = router({
  listByDivision: orgProcedure.input(z.object({ divisionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.round.findMany({
      where: {
        divisionId: input.divisionId,
        organizationId: ctx.organizationId,
      },
      orderBy: { sortOrder: 'asc' },
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.round.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        divisionId: z.string().uuid(),
        name: z.string().min(1),
        roundType: z.enum(roundTypeValues).default('regular'),
        sortOrder: z.number().int().default(0),
        pointsWin: z.number().int().default(2),
        pointsDraw: z.number().int().default(1),
        pointsLoss: z.number().int().default(0),
        countsForPlayerStats: z.boolean().default(true),
        countsForGoalieStats: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.round.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      return round
    }),

  update: orgAdminProcedure
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

      const updateResult = await ctx.db.round.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, updatedAt: new Date() },
      })

      if (updateResult.count === 0) return undefined

      const round = await ctx.db.round.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })

      // Recalculate stats when counting flags change
      if (statsToggleChanged && round) {
        const division = await ctx.db.division.findFirst({
          where: { id: round.divisionId },
          select: { seasonId: true },
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

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.round.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
