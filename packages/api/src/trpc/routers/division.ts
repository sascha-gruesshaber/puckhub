import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

export const divisionRouter = router({
  listBySeason: publicProcedure.input(z.object({ seasonId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.divisions.findMany({
      where: eq(schema.divisions.seasonId, input.seasonId),
      orderBy: (divisions, { asc }) => [asc(divisions.sortOrder)],
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.divisions.findFirst({
      where: eq(schema.divisions.id, input.id),
    })
  }),

  create: adminProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        name: z.string().min(1),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [division] = await ctx.db.insert(schema.divisions).values(input).returning()
      return division
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [division] = await ctx.db
        .update(schema.divisions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.divisions.id, id))
        .returning()
      return division
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.divisions).where(eq(schema.divisions.id, input.id))
  }),
})
