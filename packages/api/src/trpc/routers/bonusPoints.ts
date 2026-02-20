import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { recalculateStandings } from "../../services/standingsService"
import { adminProcedure, publicProcedure, router } from "../init"

export const bonusPointsRouter = router({
  listByRound: publicProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.bonusPoints.findMany({
      where: eq(schema.bonusPoints.roundId, input.roundId),
      with: { team: true },
      orderBy: (bp, { desc }) => [desc(bp.createdAt)],
    })
  }),

  create: adminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        roundId: z.string().uuid(),
        points: z.number().int(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [bp] = await ctx.db.insert(schema.bonusPoints).values(input).returning()
      await recalculateStandings(ctx.db, input.roundId)
      return bp
    }),

  update: adminProcedure
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

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
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
