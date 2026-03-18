import { describe, expect, it } from "vitest"
import { checkFeature, checkLimit, getOrgPlan, type PlanLimits } from "../../services/planLimits"
import { getTestDb, TEST_ORG_ID } from "../testUtils"

type Plan = PlanLimits

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    maxTeams: null,
    maxPlayers: null,
    maxSeasons: null,
    maxDivisionsPerSeason: null,
    maxAdmins: null,
    maxNewsArticles: null,
    maxPages: null,
    maxSponsors: null,
    maxDocuments: null,
    storageQuotaMb: null,
    featureCustomDomain: false,
    featureWebsiteBuilder: false,
    featureSponsorMgmt: false,
    featureTrikotDesigner: false,
    featureGameReports: true,
    featurePlayerStats: true,
    featureScheduler: false,
    featureScheduledNews: false,
    featureAdvancedRoles: false,
    featureAiRecaps: false,
    aiMonthlyTokenLimit: null,
    ...overrides,
  }
}

describe("planLimits service", () => {
  describe("checkLimit", () => {
    it("passes when plan is null (no restrictions)", () => {
      expect(() => checkLimit(null, "maxTeams", 100)).not.toThrow()
    })

    it("passes when limit is null (unlimited)", () => {
      const plan = makePlan({ maxTeams: null })
      expect(() => checkLimit(plan, "maxTeams", 999)).not.toThrow()
    })

    it("passes when current count is below limit", () => {
      const plan = makePlan({ maxTeams: 10 })
      expect(() => checkLimit(plan, "maxTeams", 5)).not.toThrow()
    })

    it("throws PLAN_LIMIT_EXCEEDED when count equals limit", () => {
      const plan = makePlan({ maxTeams: 10 })
      expect(() => checkLimit(plan, "maxTeams", 10)).toThrow("Plan limit reached")
    })

    it("throws PLAN_LIMIT_EXCEEDED when count exceeds limit", () => {
      const plan = makePlan({ maxTeams: 10 })
      expect(() => checkLimit(plan, "maxTeams", 15)).toThrow("Plan limit reached")
    })

    it("includes the key and counts in error message", () => {
      const plan = makePlan({ maxPlayers: 25 })
      expect(() => checkLimit(plan, "maxPlayers", 25)).toThrow("maxPlayers: 25/25")
    })

    it("works with different limit keys", () => {
      const plan = makePlan({ maxSeasons: 3, maxAdmins: 2, storageQuotaMb: 100 })
      expect(() => checkLimit(plan, "maxSeasons", 2)).not.toThrow()
      expect(() => checkLimit(plan, "maxSeasons", 3)).toThrow("Plan limit reached")
      expect(() => checkLimit(plan, "maxAdmins", 2)).toThrow("Plan limit reached")
      expect(() => checkLimit(plan, "storageQuotaMb", 50)).not.toThrow()
    })

    it("allows count of 0 even with limit of 1", () => {
      const plan = makePlan({ maxTeams: 1 })
      expect(() => checkLimit(plan, "maxTeams", 0)).not.toThrow()
    })
  })

  describe("checkFeature", () => {
    it("passes when plan is null (no restrictions)", () => {
      expect(() => checkFeature(null, "featureCustomDomain")).not.toThrow()
    })

    it("passes when feature is enabled", () => {
      const plan = makePlan({ featureGameReports: true })
      expect(() => checkFeature(plan, "featureGameReports")).not.toThrow()
    })

    it("throws PLAN_FEATURE_UNAVAILABLE when feature is disabled", () => {
      const plan = makePlan({ featureCustomDomain: false })
      expect(() => checkFeature(plan, "featureCustomDomain")).toThrow("is not available on your current plan")
    })

    it("includes the feature key in error message", () => {
      const plan = makePlan({ featureSponsorMgmt: false })
      expect(() => checkFeature(plan, "featureSponsorMgmt")).toThrow("featureSponsorMgmt")
    })

    it("works with all feature keys", () => {
      const allEnabled = makePlan({
        featureCustomDomain: true,
        featureWebsiteBuilder: true,
        featureSponsorMgmt: true,
        featureTrikotDesigner: true,
        featureGameReports: true,
        featurePlayerStats: true,
        featureScheduler: true,
        featureScheduledNews: true,
        featureAdvancedRoles: true,
        featureAiRecaps: true,
      })
      expect(() => checkFeature(allEnabled, "featureCustomDomain")).not.toThrow()
      expect(() => checkFeature(allEnabled, "featureScheduler")).not.toThrow()
      expect(() => checkFeature(allEnabled, "featureAiRecaps")).not.toThrow()
    })
  })

  describe("getOrgPlan", () => {
    it("returns null when org has no subscription", async () => {
      const db = getTestDb()
      const result = await getOrgPlan(db, TEST_ORG_ID)
      expect(result).toBeNull()
    })

    it("returns the plan when org has an active subscription", async () => {
      const db = getTestDb()

      // Create a plan
      const plan = await db.plan.create({
        data: {
          id: crypto.randomUUID(),
          name: "Pro Plan",
          slug: "pro",
          maxTeams: 20,
          maxPlayers: 100,
          featureCustomDomain: true,
          featureGameReports: true,
          featurePlayerStats: true,
        },
      })

      // Create a subscription linking org to plan
      await db.orgSubscription.create({
        data: {
          organizationId: TEST_ORG_ID,
          planId: plan.id,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        },
      })

      const result = await getOrgPlan(db, TEST_ORG_ID)
      expect(result).not.toBeNull()
      expect(result!.maxTeams).toBe(20)
      expect(result!.maxPlayers).toBe(100)
      expect(result!.featureCustomDomain).toBe(true)
      expect(result!.featureGameReports).toBe(true)
    })

    it("returns null for a non-existent org", async () => {
      const db = getTestDb()
      const result = await getOrgPlan(db, "non-existent-org-id")
      expect(result).toBeNull()
    })
  })
})
