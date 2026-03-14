import type { PrismaClient } from "@puckhub/db"
import { createAppError } from "../errors/appError"
import { APP_ERROR_CODES } from "../errors/codes"

// ─── Types ───────────────────────────────────────────────────────────────────

type LimitKey =
  | "maxTeams"
  | "maxPlayers"
  | "maxSeasons"
  | "maxDivisionsPerSeason"
  | "maxAdmins"
  | "maxNewsArticles"
  | "maxPages"
  | "maxSponsors"
  | "maxDocuments"
  | "storageQuotaMb"

type FeatureKey =
  | "featureCustomDomain"
  | "featureWebsiteBuilder"
  | "featureSponsorMgmt"
  | "featureTrikotDesigner"
  | "featureExportImport"
  | "featureGameReports"
  | "featurePlayerStats"
  | "featureScheduler"
  | "featureScheduledNews"
  | "featureAdvancedRoles"
  | "featureAiRecaps"

interface Plan {
  [key: string]: unknown
  maxTeams: number | null
  maxPlayers: number | null
  maxSeasons: number | null
  maxDivisionsPerSeason: number | null
  maxAdmins: number | null
  maxNewsArticles: number | null
  maxPages: number | null
  maxSponsors: number | null
  maxDocuments: number | null
  storageQuotaMb: number | null
  featureCustomDomain: boolean
  featureWebsiteBuilder: boolean
  featureSponsorMgmt: boolean
  featureTrikotDesigner: boolean
  featureExportImport: boolean
  featureGameReports: boolean
  featurePlayerStats: boolean
  featureScheduler: boolean
  featureScheduledNews: boolean
  featureAdvancedRoles: boolean
  featureAiRecaps: boolean
  aiMonthlyTokenLimit: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetch the active plan for an organization.
 * Returns null if no subscription or plan exists (treat as no restrictions
 * to avoid blocking orgs during migration).
 */
export async function getOrgPlan(db: PrismaClient, organizationId: string): Promise<Plan | null> {
  const sub = await db.orgSubscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  })
  return (sub?.plan as Plan) ?? null
}

/**
 * Throws PLAN_LIMIT_EXCEEDED if the current count has reached (or exceeded)
 * the plan's limit for the given key.
 *
 * If the plan is null (no subscription) or the limit value is null (unlimited),
 * the check passes silently.
 */
export function checkLimit(plan: Plan | null, key: LimitKey, currentCount: number): void {
  if (!plan) return // no plan → no restrictions
  const limit = plan[key] as number | null
  if (limit === null || limit === undefined) return // unlimited
  if (currentCount >= limit) {
    throw createAppError(
      "FORBIDDEN",
      APP_ERROR_CODES.PLAN_LIMIT_EXCEEDED,
      `Plan limit reached for ${key}: ${currentCount}/${limit}`,
    )
  }
}

/**
 * Throws PLAN_FEATURE_UNAVAILABLE if the plan does not include the
 * given feature flag.
 *
 * If the plan is null (no subscription), the check passes silently.
 */
export function checkFeature(plan: Plan | null, key: FeatureKey): void {
  if (!plan) return // no plan → no restrictions
  if (!plan[key]) {
    throw createAppError(
      "FORBIDDEN",
      APP_ERROR_CODES.PLAN_FEATURE_UNAVAILABLE,
      `Feature "${key}" is not available on your current plan`,
    )
  }
}

export type { LimitKey, FeatureKey, Plan as PlanLimits }
