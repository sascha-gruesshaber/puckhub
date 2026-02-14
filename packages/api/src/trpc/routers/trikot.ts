import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

export const trikotRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.trikots.findMany({
      with: { template: true },
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.trikots.findFirst({
      where: eq(schema.trikots.id, input.id),
      with: {
        template: true,
        teamTrikots: { with: { team: true } },
      },
    })
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        templateId: z.string().uuid(),
        primaryColor: z.string().min(1),
        secondaryColor: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [trikot] = await ctx.db
        .insert(schema.trikots)
        .values({
          name: input.name,
          templateId: input.templateId,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor ?? null,
        })
        .returning()
      return trikot
    }),

  update: adminProcedure
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
      const [trikot] = await ctx.db
        .update(schema.trikots)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.trikots.id, id))
        .returning()
      return trikot
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.trikots).where(eq(schema.trikots.id, input.id))
  }),
})
