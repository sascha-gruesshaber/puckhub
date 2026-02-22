import { z } from "zod"
import { orgAdminProcedure, orgProcedure, requireRole, router } from "../init"

export const teamRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        teamTrikots: {
          include: { trikot: { include: { template: true } } },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.team.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        shortName: z.string().min(1),
        city: z.string().optional(),
        logoUrl: z.string().optional(),
        teamPhotoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        website: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      return team
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        city: z.string().nullish(),
        logoUrl: z.string().nullish(),
        teamPhotoUrl: z.string().nullish(),
        primaryColor: z.string().nullish(),
        contactName: z.string().nullish(),
        contactEmail: z.string().email().nullish(),
        contactPhone: z.string().nullish(),
        website: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // team_manager can update their own team
      requireRole(ctx, "team_manager", id)

      const updateResult = await ctx.db.team.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, updatedAt: new Date() },
      })

      if (updateResult.count === 0) return undefined
      return ctx.db.team.findFirst({ where: { id, organizationId: ctx.organizationId } })
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.team.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
