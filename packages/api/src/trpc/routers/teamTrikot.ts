import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

export const teamTrikotRouter = router({
  listByTeam: publicProcedure.input(z.object({ teamId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.teamTrikots.findMany({
      where: eq(schema.teamTrikots.teamId, input.teamId),
      with: { trikot: { with: { template: true } } },
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }),

  listByTrikot: publicProcedure.input(z.object({ trikotId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.teamTrikots.findMany({
      where: eq(schema.teamTrikots.trikotId, input.trikotId),
      with: { team: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }),

  assign: adminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        trikotId: z.string().uuid(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [assignment] = await ctx.db.insert(schema.teamTrikots).values(input).returning()
      return assignment
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [assignment] = await ctx.db
        .update(schema.teamTrikots)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(schema.teamTrikots.id, input.id))
        .returning()
      return assignment
    }),

  remove: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.teamTrikots).where(eq(schema.teamTrikots.id, input.id))
  }),
})
