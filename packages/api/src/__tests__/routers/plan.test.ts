import { describe, expect, it } from "vitest"
import { createTestCaller, createPlatformAdminCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

/** Minimal valid plan input for creating a plan. */
function makePlanInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Starter Plan",
    slug: "starter",
    ...overrides,
  }
}

describe("plan router", () => {
  // ─── list ──────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns empty array when no plans exist", async () => {
      const caller = createPlatformAdminCaller()
      const plans = await caller.plan.list()

      expect(plans).toEqual([])
    })

    it("returns plans ordered by sortOrder", async () => {
      const caller = createPlatformAdminCaller()

      await caller.plan.create(makePlanInput({ name: "Pro", slug: "pro", sortOrder: 2 }))
      await caller.plan.create(makePlanInput({ name: "Starter", slug: "starter", sortOrder: 1 }))
      await caller.plan.create(makePlanInput({ name: "Free", slug: "free", sortOrder: 0 }))

      const plans = await caller.plan.list()

      expect(plans).toHaveLength(3)
      expect(plans[0]?.name).toBe("Free")
      expect(plans[1]?.name).toBe("Starter")
      expect(plans[2]?.name).toBe("Pro")
    })

    it("includes subscription count", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create(makePlanInput())

      const plans = await caller.plan.list()
      const found = plans.find((p) => p.id === plan.id)

      expect(found?._count.subscriptions).toBe(0)
    })
  })

  // ─── getById ───────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns a plan by id", async () => {
      const caller = createPlatformAdminCaller()
      const created = await caller.plan.create(makePlanInput({ name: "Business", slug: "business" }))

      const plan = await caller.plan.getById({ id: created.id })

      expect(plan.id).toBe(created.id)
      expect(plan.name).toBe("Business")
      expect(plan.slug).toBe("business")
      expect(plan._count.subscriptions).toBe(0)
    })

    it("throws PLAN_NOT_FOUND for non-existent id", async () => {
      const caller = createPlatformAdminCaller()

      await expect(
        caller.plan.getById({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toThrow("PLAN_NOT_FOUND")
    })
  })

  // ─── create ────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a plan with required fields", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create(makePlanInput())

      expect(plan.id).toBeDefined()
      expect(plan.name).toBe("Starter Plan")
      expect(plan.slug).toBe("starter")
      expect(plan.isActive).toBe(true)
      expect(plan.priceMonthly).toBe(0)
      expect(plan.priceYearly).toBe(0)
      expect(plan.currency).toBe("EUR")
      expect(plan.maxTeams).toBeNull()
      expect(plan.featureGameReports).toBe(true)
      expect(plan.featurePlayerStats).toBe(true)
      expect(plan.featureCustomDomain).toBe(false)
    })

    it("creates a plan with all fields specified", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create({
        name: "Enterprise",
        slug: "enterprise",
        description: "Full featured plan",
        sortOrder: 10,
        isActive: true,
        priceMonthly: 4999,
        priceYearly: 49990,
        currency: "USD",
        maxTeams: 50,
        maxPlayers: 500,
        maxDivisionsPerSeason: 10,
        maxSeasons: null,
        maxAdmins: 20,
        maxNewsArticles: null,
        maxPages: 100,
        maxSponsors: 50,
        maxDocuments: 200,
        storageQuotaMb: 10240,
        featureCustomDomain: true,
        featureWebsiteBuilder: true,
        featureSponsorMgmt: true,
        featureTrikotDesigner: true,
        featureExportImport: true,
        featureGameReports: true,
        featurePlayerStats: true,
        featureScheduler: true,
        featureScheduledNews: true,
        featureAdvancedRoles: true,
        featureAdvancedStats: true,
        featureAiRecaps: true,
        aiMonthlyTokenLimit: 1000000,
      })

      expect(plan.name).toBe("Enterprise")
      expect(plan.priceMonthly).toBe(4999)
      expect(plan.priceYearly).toBe(49990)
      expect(plan.currency).toBe("USD")
      expect(plan.maxTeams).toBe(50)
      expect(plan.storageQuotaMb).toBe(10240)
      expect(plan.featureCustomDomain).toBe(true)
      expect(plan.featureAiRecaps).toBe(true)
      expect(plan.aiMonthlyTokenLimit).toBe(1000000)
    })

    it("throws PLAN_SLUG_CONFLICT when slug already exists", async () => {
      const caller = createPlatformAdminCaller()
      await caller.plan.create(makePlanInput({ slug: "duplicate" }))

      await expect(
        caller.plan.create(makePlanInput({ name: "Another Plan", slug: "duplicate" })),
      ).rejects.toThrow("plan with this slug already exists")
    })
  })

  // ─── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates a plan's name", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create(makePlanInput())

      const updated = await caller.plan.update({ id: plan.id, name: "Updated Name" })

      expect(updated.name).toBe("Updated Name")
      expect(updated.slug).toBe("starter") // unchanged
    })

    it("updates a plan's slug", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create(makePlanInput())

      const updated = await caller.plan.update({ id: plan.id, slug: "new-slug" })

      expect(updated.slug).toBe("new-slug")
    })

    it("allows updating slug to the same value", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create(makePlanInput({ slug: "same-slug" }))

      // Updating with the same slug should not conflict
      const updated = await caller.plan.update({ id: plan.id, slug: "same-slug", name: "Renamed" })

      expect(updated.slug).toBe("same-slug")
      expect(updated.name).toBe("Renamed")
    })

    it("updates numeric and boolean fields", async () => {
      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.create(makePlanInput())

      const updated = await caller.plan.update({
        id: plan.id,
        priceMonthly: 1999,
        maxTeams: 25,
        featureCustomDomain: true,
        isActive: false,
      })

      expect(updated.priceMonthly).toBe(1999)
      expect(updated.maxTeams).toBe(25)
      expect(updated.featureCustomDomain).toBe(true)
      expect(updated.isActive).toBe(false)
    })

    it("throws PLAN_NOT_FOUND for non-existent id", async () => {
      const caller = createPlatformAdminCaller()

      await expect(
        caller.plan.update({ id: "00000000-0000-0000-0000-000000000099", name: "Ghost" }),
      ).rejects.toThrow("PLAN_NOT_FOUND")
    })

    it("throws PLAN_SLUG_CONFLICT when slug collides with another plan", async () => {
      const caller = createPlatformAdminCaller()
      await caller.plan.create(makePlanInput({ name: "Plan A", slug: "plan-a" }))
      const planB = await caller.plan.create(makePlanInput({ name: "Plan B", slug: "plan-b" }))

      await expect(
        caller.plan.update({ id: planB.id, slug: "plan-a" }),
      ).rejects.toThrow("plan with this slug already exists")
    })
  })

  // ─── delete ────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes a plan without subscriptions", async () => {
      const caller = createPlatformAdminCaller()
      const db = getTestDb()
      const plan = await caller.plan.create(makePlanInput())

      const result = await caller.plan.delete({ id: plan.id })

      expect(result).toEqual({ id: plan.id })

      // Verify it's gone from the database
      const found = await db.plan.findUnique({ where: { id: plan.id } })
      expect(found).toBeNull()
    })

    it("throws PLAN_NOT_FOUND for non-existent id", async () => {
      const caller = createPlatformAdminCaller()

      await expect(
        caller.plan.delete({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toThrow("PLAN_NOT_FOUND")
    })

    it("throws PLAN_HAS_SUBSCRIPTIONS when plan has active subscriptions", async () => {
      const caller = createPlatformAdminCaller()
      const db = getTestDb()
      const plan = await caller.plan.create(makePlanInput({ slug: "sub-plan" }))

      // Create an org subscription pointing to the plan
      await db.orgSubscription.create({
        data: {
          organizationId: TEST_ORG_ID,
          planId: plan.id,
          interval: "monthly",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
        },
      })

      await expect(caller.plan.delete({ id: plan.id })).rejects.toThrow("Cannot delete plan")

      // Verify the plan still exists
      const found = await db.plan.findUnique({ where: { id: plan.id } })
      expect(found).not.toBeNull()
    })
  })

  // ─── Authorization ─────────────────────────────────────────────────────────

  describe("authorization", () => {
    it("rejects org admin (non-platform-admin) on list", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.plan.list()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects regular user on create", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(user.plan.create(makePlanInput())).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated caller on list", async () => {
      const caller = createTestCaller()
      await expect(caller.plan.list()).rejects.toThrow("Not authenticated")
    })

    it("rejects unauthenticated caller on getById", async () => {
      const caller = createTestCaller()
      await expect(
        caller.plan.getById({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toThrow("Not authenticated")
    })

    it("rejects unauthenticated caller on create", async () => {
      const caller = createTestCaller()
      await expect(caller.plan.create(makePlanInput())).rejects.toThrow("Not authenticated")
    })

    it("rejects unauthenticated caller on update", async () => {
      const caller = createTestCaller()
      await expect(
        caller.plan.update({ id: "00000000-0000-0000-0000-000000000099", name: "Hacked" }),
      ).rejects.toThrow("Not authenticated")
    })

    it("rejects unauthenticated caller on delete", async () => {
      const caller = createTestCaller()
      await expect(
        caller.plan.delete({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toThrow("Not authenticated")
    })
  })
})
