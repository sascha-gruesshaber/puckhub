import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const teamDivisionRouter = router({
  listByDivision: orgProcedure.input(z.object({ divisionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db.teamDivision.findMany({
      where: {
        divisionId: input.divisionId,
        organizationId: ctx.organizationId,
      },
      select: {
        id: true,
        teamId: true,
        divisionId: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true,
          },
        },
      },
    })
    return rows
  }),

  assign: orgAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        divisionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.teamDivision.findFirst({
        where: {
          teamId: input.teamId,
          divisionId: input.divisionId,
          organizationId: ctx.organizationId,
        },
      })
      if (existing) return existing

      const row = await ctx.db.teamDivision.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      return row
    }),

  remove: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.teamDivision.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
