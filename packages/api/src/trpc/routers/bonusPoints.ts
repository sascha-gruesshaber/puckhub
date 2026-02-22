import { recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
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
    // Fetch before deleting to get roundId for recalculation
    const bp = await ctx.db.bonusPoint.findUnique({
      where: { id: input.id },
      select: { roundId: true },
    })
    await ctx.db.bonusPoint.delete({
      where: { id: input.id },
    })
    if (bp) {
      await recalculateStandings(ctx.db, bp.roundId)
    }
  }),
})
