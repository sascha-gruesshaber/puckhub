import { recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const bonusPointsRouter = router({
  listByRound: orgProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.bonusPoint.findMany({
      where: {
        roundId: input.roundId,
        organizationId: ctx.organizationId,
      },
      include: { team: true },
      orderBy: { createdAt: "desc" },
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        roundId: z.string().uuid(),
        points: z.number().int(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bp = await ctx.db.bonusPoint.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      await recalculateStandings(ctx.db, input.roundId)
      return bp
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        points: z.number().int().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      // Verify record belongs to caller's organization
      const existing = await ctx.db.bonusPoint.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.BONUS_POINT_NOT_FOUND)
      }
      const bp = await ctx.db.bonusPoint.update({
        where: { id },
        data,
      })
      if (bp) {
        await recalculateStandings(ctx.db, bp.roundId)
      }
      return bp
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // Fetch before deleting to get roundId for recalculation (scoped by org)
    const bp = await ctx.db.bonusPoint.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      select: { roundId: true },
    })
    if (!bp) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.BONUS_POINT_NOT_FOUND)
    }
    await ctx.db.bonusPoint.delete({
      where: { id: input.id },
    })
    if (bp) {
      await recalculateStandings(ctx.db, bp.roundId)
    }
  }),
})
