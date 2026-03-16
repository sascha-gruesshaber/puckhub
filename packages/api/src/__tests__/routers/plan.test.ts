import { describe, expect, it } from "vitest"
import { createTestCaller, createPlatformAdminCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

/** Create a test plan directly in the DB (plans are fixed, not created via API). */
async function seedTestPlan(overrides: Record<string, unknown> = {}) {
  const db = getTestDb()
  return db.plan.create({
    data: {
      id: crypto.randomUUID(),
      name: `Test Plan ${Date.now()}`,
      slug: `test-${Date.now()}`,
      ...overrides,
    },
  })
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
      await seedTestPlan({ name: "Pro", slug: "pro", sortOrder: 2 })
      await seedTestPlan({ name: "Starter", slug: "starter", sortOrder: 1 })
      await seedTestPlan({ name: "Free", slug: "free", sortOrder: 0 })

      const caller = createPlatformAdminCaller()
      const plans = await caller.plan.list()

      expect(plans).toHaveLength(3)
      expect(plans[0]?.name).toBe("Free")
      expect(plans[1]?.name).toBe("Starter")
      expect(plans[2]?.name).toBe("Pro")
    })

    it("includes subscription count", async () => {
      const plan = await seedTestPlan()

      const caller = createPlatformAdminCaller()
      const plans = await caller.plan.list()
      const found = plans.find((p) => p.id === plan.id)

      expect(found?._count.subscriptions).toBe(0)
    })
  })

  // ─── getById ───────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns a plan by id", async () => {
      const created = await seedTestPlan({ name: "Business", slug: "business" })

      const caller = createPlatformAdminCaller()
      const plan = await caller.plan.getById({ id: created.id })

      expect(plan.id).toBe(created.id)
      expect(plan.name).toBe("Business")
      expect(plan.slug).toBe("business")
      expect(plan._count.subscriptions).toBe(0)
    })

    it("throws PLAN_NOT_FOUND for non-existent id", async () => {
      const caller = createPlatformAdminCaller()

      await expect(caller.plan.getById({ id: "00000000-0000-0000-0000-000000000099" })).rejects.toThrow(
        "PLAN_NOT_FOUND",
      )
    })
  })

  // ─── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates numeric and boolean fields", async () => {
      const plan = await seedTestPlan()

      const caller = createPlatformAdminCaller()
      const updated = await caller.plan.update({
        id: plan.id,
        priceYearly: 19990,
        maxTeams: 25,
        featureCustomDomain: true,
        isActive: false,
      })

      expect(updated.priceYearly).toBe(19990)
      expect(updated.maxTeams).toBe(25)
      expect(updated.featureCustomDomain).toBe(true)
      expect(updated.isActive).toBe(false)
    })

    it("throws PLAN_NOT_FOUND for non-existent id", async () => {
      const caller = createPlatformAdminCaller()

      await expect(
        caller.plan.update({ id: "00000000-0000-0000-0000-000000000099", priceYearly: 100 }),
      ).rejects.toThrow("PLAN_NOT_FOUND")
    })
  })

  // ─── Authorization ─────────────────────────────────────────────────────────

  describe("authorization", () => {
    it("rejects org admin (non-platform-admin) on list", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.plan.list()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects regular user on update", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(user.plan.update({ id: "00000000-0000-0000-0000-000000000099" })).rejects.toThrow(
        "Keine Plattform-Administratorrechte",
      )
    })

    it("rejects unauthenticated caller on list", async () => {
      const caller = createTestCaller()
      await expect(caller.plan.list()).rejects.toThrow("Not authenticated")
    })

    it("rejects unauthenticated caller on getById", async () => {
      const caller = createTestCaller()
      await expect(caller.plan.getById({ id: "00000000-0000-0000-0000-000000000099" })).rejects.toThrow(
        "Not authenticated",
      )
    })

    it("rejects unauthenticated caller on update", async () => {
      const caller = createTestCaller()
      await expect(
        caller.plan.update({ id: "00000000-0000-0000-0000-000000000099", priceYearly: 100 }),
      ).rejects.toThrow("Not authenticated")
    })
  })
})
