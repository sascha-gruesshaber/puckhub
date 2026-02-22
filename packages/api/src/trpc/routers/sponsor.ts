import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const sponsorRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.sponsor.findMany({
      where: { organizationId: ctx.organizationId },
      include: { team: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.sponsor.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { team: true },
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        logoUrl: z.string().optional(),
        websiteUrl: z.string().url().optional(),
        hoverText: z.string().optional(),
        teamId: z.string().uuid().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sponsor = await ctx.db.sponsor.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      return sponsor
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        logoUrl: z.string().nullish(),
        websiteUrl: z.string().url().nullish(),
        hoverText: z.string().nullish(),
        teamId: z.string().uuid().nullish(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await ctx.db.sponsor.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, updatedAt: new Date() },
      })
      const sponsor = await ctx.db.sponsor.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      return sponsor
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.sponsor.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
