import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const trikotRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.trikot.findMany({
      where: { organizationId: ctx.organizationId },
      include: { template: true },
      orderBy: { name: "asc" },
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.trikot.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: {
        template: true,
        teamTrikots: { include: { team: true } },
      },
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        templateId: z.string().uuid(),
        primaryColor: z.string().min(1),
        secondaryColor: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const trikot = await ctx.db.trikot.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          templateId: input.templateId,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor ?? null,
        },
      })
      return trikot
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        templateId: z.string().uuid().optional(),
        primaryColor: z.string().min(1).optional(),
        secondaryColor: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await ctx.db.trikot.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, updatedAt: new Date() },
      })
      const trikot = await ctx.db.trikot.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      return trikot
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.trikot.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
