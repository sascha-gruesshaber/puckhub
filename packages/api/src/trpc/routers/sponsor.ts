import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const sponsorRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.query.sponsors.findMany({
      with: { team: true },
      where: eq(schema.sponsors.organizationId, ctx.organizationId),
      orderBy: (sponsors, { asc }) => [asc(sponsors.sortOrder), asc(sponsors.name)],
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.sponsors.findFirst({
      where: and(eq(schema.sponsors.id, input.id), eq(schema.sponsors.organizationId, ctx.organizationId)),
      with: { team: true },
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
      const [sponsor] = await ctx.db
        .insert(schema.sponsors)
        .values({ ...input, organizationId: ctx.organizationId })
        .returning()
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
      const [sponsor] = await ctx.db
        .update(schema.sponsors)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(schema.sponsors.id, id), eq(schema.sponsors.organizationId, ctx.organizationId)))
        .returning()
      return sponsor
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(schema.sponsors)
      .where(and(eq(schema.sponsors.id, input.id), eq(schema.sponsors.organizationId, ctx.organizationId)))
  }),
})
