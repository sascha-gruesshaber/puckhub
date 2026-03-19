import { trpc } from "@/trpc"

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
  | "featureGameReports"
  | "featurePlayerStats"
  | "featureScheduler"
  | "featureScheduledNews"
  | "featureAdvancedRoles"
  | "featureAdvancedStats"
  | "featureAi"
  | "featurePublicReports"

/** Map from LimitKey → usage field name */
const LIMIT_USAGE_MAP: Record<string, keyof Usage> = {
  maxTeams: "teams",
  maxPlayers: "players",
  maxSeasons: "seasons",
  maxAdmins: "admins",
  maxNewsArticles: "news",
  maxPages: "pages",
  maxSponsors: "sponsors",
}

interface Usage {
  teams: number
  players: number
  seasons: number
  news: number
  pages: number
  sponsors: number
  admins: number
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePlanLimits() {
  const { data, isLoading } = trpc.subscription.getMyUsage.useQuery()

  const plan = data?.plan ?? null
  const usage = data?.usage ?? null

  /**
   * Check whether the org has reached (or exceeded) the limit for a given key.
   * Returns false if data is still loading or no plan is set (no restrictions).
   */
  function isAtLimit(key: LimitKey): boolean {
    if (!plan || !usage) return false
    const limit = (plan as Record<string, unknown>)[key] as number | null
    if (limit === null || limit === undefined) return false // unlimited
    const usageKey = LIMIT_USAGE_MAP[key]
    if (!usageKey) return false
    return usage[usageKey] >= limit
  }

  /**
   * Returns a "current / max" string for display.
   * e.g. "4/4" or "3/∞"
   */
  function usageText(key: LimitKey): string {
    if (!plan || !usage) return ""
    const limit = (plan as Record<string, unknown>)[key] as number | null
    const usageKey = LIMIT_USAGE_MAP[key]
    if (!usageKey) return ""
    const current = usage[usageKey]
    return `${current}/${limit === null || limit === undefined ? "∞" : limit}`
  }

  /**
   * Returns the raw current count for a given limit key.
   */
  function getUsage(key: LimitKey): number {
    if (!usage) return 0
    const usageKey = LIMIT_USAGE_MAP[key]
    if (!usageKey) return 0
    return usage[usageKey]
  }

  /**
   * Returns the plan's limit value for a given key. null = unlimited.
   */
  function getLimit(key: LimitKey): number | null {
    if (!plan) return null
    return (plan as Record<string, unknown>)[key] as number | null
  }

  /**
   * Check whether a feature is enabled on the current plan.
   * Returns true if data is still loading or no plan is set (no restrictions).
   */
  function canUseFeature(key: FeatureKey): boolean {
    if (!plan) return true // no plan → no restrictions
    return !!(plan as Record<string, unknown>)[key]
  }

  return {
    plan,
    usage,
    isLoading,
    isAtLimit,
    usageText,
    getUsage,
    getLimit,
    canUseFeature,
  }
}

export type { FeatureKey, LimitKey }
