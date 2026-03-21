import { z } from "zod"
import { checkAiEligibility } from "../../services/aiRecapService"
import { generateSeasonSeo } from "../../services/aiSeasonDescriptionService"
import { checkLimit, getOrgPlan } from "../../services/planLimits"
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

export const divisionRouter = router({
  listBySeason: orgProcedure.input(z.object({ seasonId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.division.findMany({
      where: {
        seasonId: input.seasonId,
        organizationId: ctx.organizationId,
      },
      orderBy: { sortOrder: "asc" },
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.division.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
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
      const plan = await getOrgPlan(ctx.db, ctx.organizationId)
      const count = await ctx.db.division.count({
        where: { seasonId: input.seasonId, organizationId: ctx.organizationId },
      })
      checkLimit(plan, "maxDivisionsPerSeason", count)

      const division = await ctx.db.division.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      triggerSeasonSeo(ctx.db, input.seasonId, ctx.organizationId)
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
      await ctx.db.division.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, updatedAt: new Date() },
      })
      const division = await ctx.db.division.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      if (division) {
        triggerSeasonSeo(ctx.db, division.seasonId, ctx.organizationId)
      }
      return division
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const division = await ctx.db.division.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      select: { seasonId: true },
    })
    await ctx.db.division.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
    if (division) {
      triggerSeasonSeo(ctx.db, division.seasonId, ctx.organizationId)
    }
  }),
})
