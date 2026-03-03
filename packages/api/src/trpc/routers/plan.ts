import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { platformAdminProcedure, router } from "../init"

const planInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),

  priceMonthly: z.number().int().min(0).default(0),
  priceYearly: z.number().int().min(0).default(0),
  currency: z.string().default("EUR"),

  maxTeams: z.number().int().min(0).nullable().default(null),
  maxPlayers: z.number().int().min(0).nullable().default(null),
  maxDivisionsPerSeason: z.number().int().min(0).nullable().default(null),
  maxSeasons: z.number().int().min(0).nullable().default(null),
  maxAdmins: z.number().int().min(0).nullable().default(null),
  maxNewsArticles: z.number().int().min(0).nullable().default(null),
  maxPages: z.number().int().min(0).nullable().default(null),
  maxSponsors: z.number().int().min(0).nullable().default(null),
  maxDocuments: z.number().int().min(0).nullable().default(null),
  storageQuotaMb: z.number().int().min(0).nullable().default(null),

  featureCustomDomain: z.boolean().default(false),
  featureWebsiteBuilder: z.boolean().default(false),
  featureSponsorMgmt: z.boolean().default(false),
  featureTrikotDesigner: z.boolean().default(false),
  featureExportImport: z.boolean().default(false),
  featureGameReports: z.boolean().default(true),
  featurePlayerStats: z.boolean().default(true),
  featureScheduler: z.boolean().default(false),
  featureScheduledNews: z.boolean().default(false),
  featureAdvancedRoles: z.boolean().default(false),
  featureAdvancedStats: z.boolean().default(false),
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

  getById: platformAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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

  create: platformAdminProcedure
    .input(planInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.plan.findUnique({ where: { slug: input.slug } })
      if (existing) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.PLAN_SLUG_CONFLICT, "A plan with this slug already exists")
      }

      return ctx.db.plan.create({ data: input })
    }),

  update: platformAdminProcedure
    .input(z.object({ id: z.string().uuid() }).merge(planInputSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const plan = await ctx.db.plan.findUnique({ where: { id } })
      if (!plan) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PLAN_NOT_FOUND)
      }

      if (data.slug && data.slug !== plan.slug) {
        const slugConflict = await ctx.db.plan.findUnique({ where: { slug: data.slug } })
        if (slugConflict) {
          throw createAppError("CONFLICT", APP_ERROR_CODES.PLAN_SLUG_CONFLICT, "A plan with this slug already exists")
        }
      }

      return ctx.db.plan.update({ where: { id }, data })
    }),

  delete: platformAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findUnique({
        where: { id: input.id },
        include: { _count: { select: { subscriptions: true } } },
      })
      if (!plan) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PLAN_NOT_FOUND)
      }
      if (plan._count.subscriptions > 0) {
        throw createAppError(
          "BAD_REQUEST",
          APP_ERROR_CODES.PLAN_HAS_SUBSCRIPTIONS,
          `Cannot delete plan with ${plan._count.subscriptions} active subscription(s)`,
        )
      }

      await ctx.db.plan.delete({ where: { id: input.id } })
      return { id: input.id }
    }),
})
