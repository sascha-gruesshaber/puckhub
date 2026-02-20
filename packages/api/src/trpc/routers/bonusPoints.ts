import * as schema from "@puckhub/db/schema"
import { recalculateStandings } from "@puckhub/db/services"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const bonusPointsRouter = router({
  listByRound: orgProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.bonusPoints.findMany({
      where: and(
        eq(schema.bonusPoints.roundId, input.roundId),
        eq(schema.bonusPoints.organizationId, ctx.organizationId),
      ),
      with: { team: true },
      orderBy: (bp, { desc }) => [desc(bp.createdAt)],
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
      const [bp] = await ctx.db
        .insert(schema.bonusPoints)
        .values({ ...input, organizationId: ctx.organizationId })
        .returning()
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
      const [bp] = await ctx.db.update(schema.bonusPoints).set(data).where(eq(schema.bonusPoints.id, id)).returning()
      if (bp) {
        await recalculateStandings(ctx.db, bp.roundId)
      }
      return bp
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // Fetch before deleting to get roundId for recalculation
    const bp = await ctx.db.query.bonusPoints.findFirst({
      where: eq(schema.bonusPoints.id, input.id),
      columns: { roundId: true },
    })
    await ctx.db.delete(schema.bonusPoints).where(eq(schema.bonusPoints.id, input.id))
    if (bp) {
      await recalculateStandings(ctx.db, bp.roundId)
    }
  }),
})
