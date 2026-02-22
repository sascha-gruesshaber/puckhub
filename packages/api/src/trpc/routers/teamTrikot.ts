import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const teamTrikotRouter = router({
  listByTeam: orgProcedure.input(z.object({ teamId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.teamTrikot.findMany({
      where: {
        teamId: input.teamId,
        organizationId: ctx.organizationId,
      },
      include: { trikot: { include: { template: true } } },
      orderBy: { name: "asc" },
    })
  }),

  listByTrikot: orgProcedure.input(z.object({ trikotId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.teamTrikot.findMany({
      where: {
        trikotId: input.trikotId,
        organizationId: ctx.organizationId,
      },
      include: { team: true },
      orderBy: { name: "asc" },
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
      const assignment = await ctx.db.teamTrikot.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
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
      await ctx.db.teamTrikot.updateMany({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { name: input.name, updatedAt: new Date() },
      })
      const assignment = await ctx.db.teamTrikot.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      })
      return assignment
    }),

  remove: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.teamTrikot.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
