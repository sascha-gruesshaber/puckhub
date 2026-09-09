import { z } from "zod"
import { MAX_NAME_LENGTH } from "../../lib/validation"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const settingsRouter = router({
  get: orgProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.systemSettings.findFirst({
      where: { organizationId: ctx.organizationId },
    })
    return row ?? null
  }),

  update: orgAdminProcedure
    .input(
      z.object({
        leagueName: z.string().max(MAX_NAME_LENGTH).min(1, "Liga-Name ist erforderlich"),
        leagueShortName: z.string().max(MAX_NAME_LENGTH).min(1, "Kurzname ist erforderlich"),
        locale: z.string().max(MAX_NAME_LENGTH).min(1),
        timezone: z.string().max(MAX_NAME_LENGTH).min(1),
        pointsWin: z.number().int().min(0),
        pointsDraw: z.number().int().min(0),
        pointsLoss: z.number().int().min(0),
        publicReportsEnabled: z.boolean().optional(),
        publicReportsRequireEmail: z.boolean().optional(),
        publicReportsBotDetection: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.systemSettings.findFirst({
        where: { organizationId: ctx.organizationId },
        select: { id: true },
      })

      if (existing) {
        await ctx.db.systemSettings.update({
          where: { id: existing.id },
          data: { ...input, updatedAt: new Date() },
        })
      } else {
        await ctx.db.systemSettings.create({
          data: {
            organizationId: ctx.organizationId,
            ...input,
          },
        })
      }

      return { success: true }
    }),
})
