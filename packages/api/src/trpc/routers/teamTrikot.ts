import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

const assignmentTypeValues = ["home", "away", "alternate", "custom"] as const

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
        name: z.string().optional(),
        assignmentType: z.enum(assignmentTypeValues).default("custom"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const name = input.assignmentType !== "custom" ? input.assignmentType : input.name?.trim() || "custom"
      const assignment = await ctx.db.teamTrikot.create({
        data: {
          teamId: input.teamId,
          trikotId: input.trikotId,
          name,
          assignmentType: input.assignmentType,
          organizationId: ctx.organizationId,
        },
      })
      return assignment
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        assignmentType: z.enum(assignmentTypeValues).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assignmentType = input.assignmentType
      const name = assignmentType && assignmentType !== "custom" ? assignmentType : input.name?.trim() || undefined
      const data: any = { updatedAt: new Date() }
      if (name !== undefined) data.name = name
      if (assignmentType !== undefined) data.assignmentType = assignmentType
      await ctx.db.teamTrikot.updateMany({
        where: { id: input.id, organizationId: ctx.organizationId },
        data,
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
