import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { getMonthlyTokenUsage } from "../../services/aiRecapService"
import { orgProcedure, platformAdminProcedure, router } from "../init"

export const subscriptionRouter = router({
  /** Platform admin: assign or change a plan for an organization */
  assignPlan: platformAdminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        planId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findUnique({ where: { id: input.planId } })
      if (!plan) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PLAN_NOT_FOUND)
      }

      const org = await ctx.db.organization.findUnique({ where: { id: input.organizationId } })
      if (!org) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.ORG_NOT_FOUND)
      }

      const now = new Date()
      const periodEnd = new Date(now)
      if (plan.priceYearly === 0) {
        // Free plan — set a far-future end date
        periodEnd.setFullYear(periodEnd.getFullYear() + 100)
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }

      return ctx.db.orgSubscription.upsert({
        where: { organizationId: input.organizationId },
        create: {
          organizationId: input.organizationId,
          planId: input.planId,
          interval: "yearly",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planId: input.planId,
          interval: "yearly",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
        include: { plan: true },
      })
    }),

  /** Platform admin: get subscription details for an org */
  getByOrg: platformAdminProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.orgSubscription.findUnique({
      where: { organizationId: input.organizationId },
      include: { plan: true },
    })
  }),

  /** Platform admin: list all subscriptions with org and plan info */
  listAll: platformAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.orgSubscription.findMany({
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, slug: true, priceYearly: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  /** Org member: view own subscription + plan details */
  getMine: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.orgSubscription.findUnique({
      where: { organizationId: ctx.organizationId },
      include: { plan: true },
    })
  }),

  /** Org member: get plan + current usage counts for the active org */
  getMyUsage: orgProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.db.orgSubscription.findUnique({
      where: { organizationId: ctx.organizationId },
      include: { plan: true },
    })

    const [teams, players, seasons, news, pages, sponsors, admins, backups] = await Promise.all([
      ctx.db.team.count({ where: { organizationId: ctx.organizationId } }),
      ctx.db.player.count({ where: { organizationId: ctx.organizationId } }),
      ctx.db.season.count({ where: { organizationId: ctx.organizationId } }),
      ctx.db.news.count({ where: { organizationId: ctx.organizationId } }),
      ctx.db.page.count({ where: { organizationId: ctx.organizationId, isSystemRoute: false } }),
      ctx.db.sponsor.count({ where: { organizationId: ctx.organizationId } }),
      ctx.db.member.count({
        where: {
          organizationId: ctx.organizationId,
          role: { in: ["owner", "admin"] },
        },
      }),
      ctx.db.backup.count({ where: { organizationId: ctx.organizationId } }),
    ])

    const aiTokensUsed = await getMonthlyTokenUsage(ctx.db, ctx.organizationId)

    return {
      subscription,
      plan: subscription?.plan ?? null,
      usage: { teams, players, seasons, news, pages, sponsors, admins, backups },
      aiUsage: {
        tokensUsed: aiTokensUsed,
        tokenLimit: (subscription?.plan as any)?.aiMonthlyTokenLimit ?? null,
      },
    }
  }),
})
