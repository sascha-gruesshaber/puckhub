import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const settingsRouter = router({
  get: orgProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.organizationId, ctx.organizationId))
    return row ?? null
  }),

  update: orgAdminProcedure
    .input(
      z.object({
        leagueName: z.string().min(1, "Liga-Name ist erforderlich"),
        leagueShortName: z.string().min(1, "Kurzname ist erforderlich"),
        locale: z.string().min(1),
        timezone: z.string().min(1),
        pointsWin: z.number().int().min(0),
        pointsDraw: z.number().int().min(0),
        pointsLoss: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: schema.systemSettings.id })
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.organizationId, ctx.organizationId))

      if (existing) {
        await ctx.db
          .update(schema.systemSettings)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(schema.systemSettings.organizationId, ctx.organizationId))
      } else {
        await ctx.db.insert(schema.systemSettings).values({
          organizationId: ctx.organizationId,
          ...input,
        })
      }

      return { success: true }
    }),
})
