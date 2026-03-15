import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgProcedure, requireRole, router } from "../init"
import { getOrgPlan } from "../../services/planLimits"
import {
  checkRecapEligibility,
  checkTokenBudget,
  generateAndPersistRecap,
  getMonthlyTokenUsage,
} from "../../services/aiRecapService"

export const aiRecapRouter = router({
  getUsage: orgProcedure.query(async ({ ctx }) => {
    const plan = await getOrgPlan(ctx.db, ctx.organizationId)
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { aiEnabled: true },
    })

    const featureAvailable = plan ? !!plan.featureAiRecaps : true
    const tokenLimit = (plan?.aiMonthlyTokenLimit as number | null) ?? null
    const used = await getMonthlyTokenUsage(ctx.db, ctx.organizationId)

    return {
      used,
      limit: tokenLimit,
      aiEnabled: org?.aiEnabled ?? false,
      featureAvailable,
    }
  }),

  regenerate: orgProcedure.input(z.object({ gameId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // Require admin or game_manager role
    const game = await ctx.db.game.findFirst({
      where: { id: input.gameId, organizationId: ctx.organizationId },
      select: { status: true, homeTeamId: true, awayTeamId: true },
    })
    if (!game) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
    }

    if (!ctx.hasRole("game_manager", game.homeTeamId) && !ctx.hasRole("game_manager", game.awayTeamId)) {
      requireRole(ctx, "game_manager")
    }

    if (game.status !== "completed") {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_NOT_COMPLETED)
    }

    // Check eligibility
    const eligibility = await checkRecapEligibility(ctx.db, ctx.organizationId)
    if (!eligibility.eligible) {
      throw createAppError("FORBIDDEN", APP_ERROR_CODES.AI_RECAP_UNAVAILABLE, eligibility.reason)
    }

    // Clear existing recap and regenerate
    await ctx.db.game.update({
      where: { id: input.gameId },
      data: {
        recapTitle: null,
        recapContent: null,
        recapGeneratedAt: null,
        recapGenerating: false,
      },
    })

    // Fire-and-forget
    generateAndPersistRecap(ctx.db, input.gameId, ctx.organizationId).catch((err) =>
      console.error("[ai-recap] Regeneration failed:", err),
    )

    return { success: true }
  }),
})
