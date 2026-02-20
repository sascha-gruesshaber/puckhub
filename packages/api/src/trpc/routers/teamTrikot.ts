import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const teamTrikotRouter = router({
  listByTeam: orgProcedure.input(z.object({ teamId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.teamTrikots.findMany({
      where: and(
        eq(schema.teamTrikots.teamId, input.teamId),
        eq(schema.teamTrikots.organizationId, ctx.organizationId),
      ),
      with: { trikot: { with: { template: true } } },
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }),

  listByTrikot: orgProcedure.input(z.object({ trikotId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.teamTrikots.findMany({
      where: and(
        eq(schema.teamTrikots.trikotId, input.trikotId),
        eq(schema.teamTrikots.organizationId, ctx.organizationId),
      ),
      with: { team: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }),

  assign: orgAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        trikotId: z.string().uuid(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [assignment] = await ctx.db
        .insert(schema.teamTrikots)
        .values({ ...input, organizationId: ctx.organizationId })
        .returning()
      return assignment
    }),

  update: orgAdminProcedure
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
        .where(and(eq(schema.teamTrikots.id, input.id), eq(schema.teamTrikots.organizationId, ctx.organizationId)))
        .returning()
      return assignment
    }),

  remove: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(schema.teamTrikots)
      .where(and(eq(schema.teamTrikots.id, input.id), eq(schema.teamTrikots.organizationId, ctx.organizationId)))
  }),
})
