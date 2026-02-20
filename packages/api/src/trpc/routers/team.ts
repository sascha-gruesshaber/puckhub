import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const teamRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.query.teams.findMany({
      where: eq(schema.teams.organizationId, ctx.organizationId),
      with: {
        teamTrikots: {
          with: { trikot: { with: { template: true } } },
          limit: 1,
        },
      },
      orderBy: (teams, { asc }) => [asc(teams.name)],
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.teams.findFirst({
      where: and(eq(schema.teams.id, input.id), eq(schema.teams.organizationId, ctx.organizationId)),
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
      const [team] = await ctx.db
        .insert(schema.teams)
        .values({ ...input, organizationId: ctx.organizationId })
        .returning()
      return team
    }),

  update: orgAdminProcedure
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
      const [team] = await ctx.db
        .update(schema.teams)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(schema.teams.id, id), eq(schema.teams.organizationId, ctx.organizationId)))
        .returning()
      return team
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(schema.teams)
      .where(and(eq(schema.teams.id, input.id), eq(schema.teams.organizationId, ctx.organizationId)))
  }),
})
