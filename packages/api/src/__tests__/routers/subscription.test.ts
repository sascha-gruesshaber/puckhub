import { describe, expect, it } from "vitest"
import {
  createTestCaller,
  createPlatformAdminCaller,
  getTestDb,
  TEST_ORG_ID,
} from "../testUtils"

async function createTestPlan(overrides: Record<string, unknown> = {}) {
  const db = getTestDb()
  return db.plan.create({
    data: {
      name: "Basic",
      slug: `basic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      priceMonthly: 999,
      priceYearly: 9990,
      maxTeams: 10,
      maxPlayers: 50,
      ...overrides,
    },
  })
}

async function createFreePlan() {
  const db = getTestDb()
  return db.plan.create({
    data: {
      name: "Free",
      slug: `free-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      priceMonthly: 0,
      priceYearly: 0,
      maxTeams: 2,
      maxPlayers: 10,
    },
  })
}

describe("subscription router", () => {
  // ─── assignPlan ───────────────────────────────────────────────────────────

  describe("assignPlan", () => {
    it("assigns a monthly plan to an org", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      const result = await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      expect(result.planId).toBe(plan.id)
      expect(result.organizationId).toBe(TEST_ORG_ID)
      expect(result.status).toBe("active")
      expect(result.interval).toBe("monthly")

      const start = new Date(result.currentPeriodStart)
      const end = new Date(result.currentPeriodEnd)
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThanOrEqual(28)
      expect(diffDays).toBeLessThanOrEqual(31)
    })

    it("assigns a yearly plan to an org", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      const result = await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "yearly",
      })

      expect(result.interval).toBe("yearly")

      const start = new Date(result.currentPeriodStart)
      const end = new Date(result.currentPeriodEnd)
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThanOrEqual(365)
      expect(diffDays).toBeLessThanOrEqual(366)
    })

    it("assigns a free plan with a far-future period", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createFreePlan()

      const result = await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      const start = new Date(result.currentPeriodStart)
      const end = new Date(result.currentPeriodEnd)
      const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)
      expect(diffYears).toBeGreaterThanOrEqual(99)
    })

    it("upserts when reassigning a plan to the same org", async () => {
      const caller = createPlatformAdminCaller()
      const db = getTestDb()
      const plan1 = await createTestPlan({ name: "Plan A" })
      const plan2 = await createTestPlan({ name: "Plan B" })

      await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan1.id,
        interval: "monthly",
      })

      const result = await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan2.id,
        interval: "yearly",
      })

      expect(result.planId).toBe(plan2.id)
      expect(result.interval).toBe("yearly")

      // Should still be a single subscription for the org
      const subs = await db.orgSubscription.findMany({
        where: { organizationId: TEST_ORG_ID },
      })
      expect(subs).toHaveLength(1)
    })

    it("includes plan data in response", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createTestPlan({ name: "Premium" })

      const result = await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      expect(result.plan).toBeDefined()
      expect(result.plan.name).toBe("Premium")
    })

    it("throws PLAN_NOT_FOUND when plan does not exist", async () => {
      const caller = createPlatformAdminCaller()

      await expect(
        caller.subscription.assignPlan({
          organizationId: TEST_ORG_ID,
          planId: "00000000-0000-0000-0000-000000000099",
          interval: "monthly",
        }),
      ).rejects.toThrow("PLAN_NOT_FOUND")
    })

    it("throws ORG_NOT_FOUND when org does not exist", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await expect(
        caller.subscription.assignPlan({
          organizationId: "non-existent-org-id",
          planId: plan.id,
          interval: "monthly",
        }),
      ).rejects.toThrow("ORG_NOT_FOUND")
    })

    it("rejects non-platform-admin", async () => {
      const caller = createTestCaller({ asAdmin: true })
      await expect(
        caller.subscription.assignPlan({
          organizationId: TEST_ORG_ID,
          planId: "00000000-0000-0000-0000-000000000099",
          interval: "monthly",
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated", async () => {
      const caller = createTestCaller()
      await expect(
        caller.subscription.assignPlan({
          organizationId: TEST_ORG_ID,
          planId: "00000000-0000-0000-0000-000000000099",
          interval: "monthly",
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── getByOrg ─────────────────────────────────────────────────────────────

  describe("getByOrg", () => {
    it("returns null when org has no subscription", async () => {
      const caller = createPlatformAdminCaller()
      const result = await caller.subscription.getByOrg({ organizationId: TEST_ORG_ID })
      expect(result).toBeNull()
    })

    it("returns subscription with plan when assigned", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      const result = await caller.subscription.getByOrg({ organizationId: TEST_ORG_ID })

      expect(result).not.toBeNull()
      expect(result!.planId).toBe(plan.id)
      expect(result!.plan).toBeDefined()
      expect(result!.plan.name).toBe("Basic")
    })

    it("rejects non-platform-admin", async () => {
      const caller = createTestCaller({ asAdmin: true })
      await expect(
        caller.subscription.getByOrg({ organizationId: TEST_ORG_ID }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated", async () => {
      const caller = createTestCaller()
      await expect(
        caller.subscription.getByOrg({ organizationId: TEST_ORG_ID }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── listAll ──────────────────────────────────────────────────────────────

  describe("listAll", () => {
    it("returns empty list when no subscriptions exist", async () => {
      const caller = createPlatformAdminCaller()
      const result = await caller.subscription.listAll()
      expect(result).toEqual([])
    })

    it("returns subscriptions with org and plan info", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await caller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      const result = await caller.subscription.listAll()

      expect(result.length).toBeGreaterThanOrEqual(1)
      const sub = result.find((s) => s.organizationId === TEST_ORG_ID)
      expect(sub).toBeDefined()
      expect(sub!.plan).toBeDefined()
      expect(sub!.organization).toBeDefined()
      expect(sub!.organization.name).toBe("Test League")
    })

    it("rejects non-platform-admin", async () => {
      const caller = createTestCaller({ asAdmin: true })
      await expect(caller.subscription.listAll()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated", async () => {
      const caller = createTestCaller()
      await expect(caller.subscription.listAll()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── getMine ──────────────────────────────────────────────────────────────

  describe("getMine", () => {
    it("returns null when org has no subscription", async () => {
      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.subscription.getMine()
      expect(result).toBeNull()
    })

    it("returns subscription with plan for admin", async () => {
      const platformCaller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await platformCaller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "yearly",
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.subscription.getMine()

      expect(result).not.toBeNull()
      expect(result!.planId).toBe(plan.id)
      expect(result!.plan).toBeDefined()
    })

    it("accessible by regular member", async () => {
      const platformCaller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await platformCaller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      const caller = createTestCaller({ asUser: true })
      const result = await caller.subscription.getMine()
      expect(result).not.toBeNull()
    })

    it("rejects unauthenticated", async () => {
      const caller = createTestCaller()
      await expect(caller.subscription.getMine()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── getMyUsage ───────────────────────────────────────────────────────────

  describe("getMyUsage", () => {
    it("returns usage counts and plan info", async () => {
      const platformCaller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await platformCaller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.subscription.getMyUsage()

      expect(result.subscription).toBeDefined()
      expect(result.plan).toBeDefined()
      expect(result.plan!.name).toBe("Basic")

      // Usage counts are under the usage key
      expect(result.usage).toBeDefined()
      expect(typeof result.usage.teams).toBe("number")
      expect(typeof result.usage.players).toBe("number")
      expect(typeof result.usage.seasons).toBe("number")
      expect(typeof result.usage.news).toBe("number")
      expect(typeof result.usage.pages).toBe("number")
      expect(typeof result.usage.sponsors).toBe("number")
      expect(typeof result.usage.admins).toBe("number")
    })

    it("includes AI usage info", async () => {
      const platformCaller = createPlatformAdminCaller()
      const plan = await createTestPlan()

      await platformCaller.subscription.assignPlan({
        organizationId: TEST_ORG_ID,
        planId: plan.id,
        interval: "monthly",
      })

      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.subscription.getMyUsage()

      expect(result.aiUsage).toBeDefined()
      expect(typeof result.aiUsage.tokensUsed).toBe("number")
    })

    it("returns null subscription/plan when no subscription exists", async () => {
      const caller = createTestCaller({ asAdmin: true })
      const result = await caller.subscription.getMyUsage()

      expect(result.subscription).toBeNull()
      expect(result.plan).toBeNull()
      // Usage counts should still work
      expect(typeof result.usage.teams).toBe("number")
    })

    it("rejects unauthenticated", async () => {
      const caller = createTestCaller()
      await expect(caller.subscription.getMyUsage()).rejects.toThrow("Not authenticated")
    })
  })
})
