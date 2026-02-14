import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

export const teamDivisionRouter = router({
  listByDivision: publicProcedure.input(z.object({ divisionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({
        id: schema.teamDivisions.id,
        teamId: schema.teamDivisions.teamId,
        divisionId: schema.teamDivisions.divisionId,
        createdAt: schema.teamDivisions.createdAt,
        team: {
          id: schema.teams.id,
          name: schema.teams.name,
          shortName: schema.teams.shortName,
          logoUrl: schema.teams.logoUrl,
        },
      })
      .from(schema.teamDivisions)
      .innerJoin(schema.teams, eq(schema.teamDivisions.teamId, schema.teams.id))
      .where(eq(schema.teamDivisions.divisionId, input.divisionId))
    return rows
  }),

  assign: adminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        divisionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.teamDivisions)
        .where(
          and(eq(schema.teamDivisions.teamId, input.teamId), eq(schema.teamDivisions.divisionId, input.divisionId)),
        )
        .limit(1)
      if (existing) return existing

      const [row] = await ctx.db.insert(schema.teamDivisions).values(input).returning()
      return row
    }),

  remove: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.teamDivisions).where(eq(schema.teamDivisions.id, input.id))
  }),
})
