import { z } from "zod"
import { checkAiEligibility } from "../../services/aiRecapService"
import { generateSeasonSeo } from "../../services/aiSeasonDescriptionService"
import { orgAdminProcedure, orgProcedure, router } from "../init"

function triggerSeasonSeo(db: any, seasonId: string, organizationId: string) {
  checkAiEligibility(db, organizationId).then((e: any) => {
    if (e.eligible) {
      generateSeasonSeo(db, seasonId, organizationId).catch((err: any) =>
        console.error("[ai-seo] Season SEO generation failed:", err),
      )
    }
  }).catch((err: any) => console.error("[ai-seo] Eligibility check failed:", err))
}

export const teamDivisionRouter = router({
  listByDivision: orgProcedure.input(z.object({ divisionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db.teamDivision.findMany({
      where: {
        divisionId: input.divisionId,
        organizationId: ctx.organizationId,
      },
      select: {
        id: true,
        teamId: true,
        divisionId: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true,
          },
        },
      },
    })
    return rows
  }),

  assign: orgAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        divisionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.teamDivision.findFirst({
        where: {
          teamId: input.teamId,
          divisionId: input.divisionId,
          organizationId: ctx.organizationId,
        },
      })
      if (existing) return existing

      const row = await ctx.db.teamDivision.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      const division = await ctx.db.division.findFirst({
        where: { id: input.divisionId },
        select: { seasonId: true },
      })
      if (division) {
        triggerSeasonSeo(ctx.db, division.seasonId, ctx.organizationId)
      }
      return row
    }),

  remove: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const td = await ctx.db.teamDivision.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      select: { division: { select: { seasonId: true } } },
    })
    await ctx.db.teamDivision.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
    if (td?.division) {
      triggerSeasonSeo(ctx.db, td.division.seasonId, ctx.organizationId)
    }
  }),
})
