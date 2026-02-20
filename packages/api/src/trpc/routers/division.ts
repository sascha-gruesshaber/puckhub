import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const divisionRouter = router({
  listBySeason: orgProcedure.input(z.object({ seasonId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.divisions.findMany({
      where: and(
        eq(schema.divisions.seasonId, input.seasonId),
        eq(schema.divisions.organizationId, ctx.organizationId),
      ),
      orderBy: (divisions, { asc }) => [asc(divisions.sortOrder)],
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.divisions.findFirst({
      where: and(eq(schema.divisions.id, input.id), eq(schema.divisions.organizationId, ctx.organizationId)),
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        name: z.string().min(1),
        sortOrder: z.number().int().default(0),
        goalieMinGames: z.number().int().min(0).default(7),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [division] = await ctx.db
        .insert(schema.divisions)
        .values({ ...input, organizationId: ctx.organizationId })
        .returning()
      return division
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
        goalieMinGames: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [division] = await ctx.db
        .update(schema.divisions)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(schema.divisions.id, id), eq(schema.divisions.organizationId, ctx.organizationId)))
        .returning()
      return division
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(schema.divisions)
      .where(and(eq(schema.divisions.id, input.id), eq(schema.divisions.organizationId, ctx.organizationId)))
  }),
})
