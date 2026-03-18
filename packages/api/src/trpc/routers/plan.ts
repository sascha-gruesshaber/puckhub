import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { platformAdminProcedure, router } from "../init"

const planUpdateSchema = z.object({
  id: z.string().uuid(),

  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),

  priceYearly: z.number().int().min(0).optional(),
  currency: z.string().optional(),

  maxTeams: z.number().int().min(0).nullable().optional(),
  maxPlayers: z.number().int().min(0).nullable().optional(),
  maxDivisionsPerSeason: z.number().int().min(0).nullable().optional(),
  maxSeasons: z.number().int().min(0).nullable().optional(),
  maxAdmins: z.number().int().min(0).nullable().optional(),
  maxNewsArticles: z.number().int().min(0).nullable().optional(),
  maxPages: z.number().int().min(0).nullable().optional(),
  maxSponsors: z.number().int().min(0).nullable().optional(),
  maxDocuments: z.number().int().min(0).nullable().optional(),
  storageQuotaMb: z.number().int().min(0).nullable().optional(),

  featureCustomDomain: z.boolean().optional(),
  featureWebsiteBuilder: z.boolean().optional(),
  featureSponsorMgmt: z.boolean().optional(),
  featureTrikotDesigner: z.boolean().optional(),
  featureGameReports: z.boolean().optional(),
  featurePlayerStats: z.boolean().optional(),
  featureScheduler: z.boolean().optional(),
  featureScheduledNews: z.boolean().optional(),
  featureAdvancedRoles: z.boolean().optional(),
  featureAdvancedStats: z.boolean().optional(),
  featureAiRecaps: z.boolean().optional(),
  featurePublicReports: z.boolean().optional(),
  aiMonthlyTokenLimit: z.number().int().min(0).nullable().optional(),
})

export const planRouter = router({
  list: platformAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { subscriptions: true } },
      },
    })
  }),

  getById: platformAdminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const plan = await ctx.db.plan.findUnique({
      where: { id: input.id },
      include: {
        _count: { select: { subscriptions: true } },
      },
    })
    if (!plan) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.PLAN_NOT_FOUND)
    }
    return plan
  }),

  update: platformAdminProcedure.input(planUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input

    const plan = await ctx.db.plan.findUnique({ where: { id } })
    if (!plan) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.PLAN_NOT_FOUND)
    }

    return ctx.db.plan.update({ where: { id }, data })
  }),
})
