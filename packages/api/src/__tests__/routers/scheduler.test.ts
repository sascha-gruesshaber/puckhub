import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getSchedulerInstance, Scheduler, setSchedulerInstance } from "../../lib/scheduler"
import { createPlatformAdminCaller, createTestCaller } from "../testUtils"

describe("scheduler router", () => {
  let originalInstance: ReturnType<typeof getSchedulerInstance>

  beforeEach(() => {
    // Save original to restore after each test
    originalInstance = getSchedulerInstance()
  })

  afterEach(() => {
    // Restore original scheduler state
    if (originalInstance) {
      setSchedulerInstance(originalInstance)
    } else {
      // Reset to null by setting a dummy and clearing
      setSchedulerInstance(null as any)
    }
  })

  // ─── list ─────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns empty array when no scheduler instance", async () => {
      setSchedulerInstance(null as any)
      const platformAdmin = createPlatformAdminCaller()
      const result = await platformAdmin.scheduler.list()

      expect(result).toEqual([])
    })

    it("returns job statuses from scheduler", async () => {
      const scheduler = new Scheduler()
      scheduler.register({
        name: "test-job",
        cronExpression: "0 * * * *",
        enabled: true,
        handler: async () => {},
      })
      setSchedulerInstance(scheduler)

      const platformAdmin = createPlatformAdminCaller()
      const result = await platformAdmin.scheduler.list()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe("test-job")
      expect(result[0]?.cronExpression).toBe("0 * * * *")
      expect(result[0]?.running).toBe(false)
      expect(result[0]?.lastRunAt).toBeNull()
      expect(result[0]?.lastRunDurationMs).toBeNull()
      expect(result[0]?.lastRunError).toBeNull()
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.scheduler.list()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.scheduler.list()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── trigger ──────────────────────────────────────────────────────────────

  describe("trigger", () => {
    it("triggers a registered job", async () => {
      let executed = false
      const scheduler = new Scheduler()
      scheduler.register({
        name: "trigger-test",
        cronExpression: "0 * * * *",
        enabled: true,
        handler: async () => {
          executed = true
        },
      })
      setSchedulerInstance(scheduler)

      const platformAdmin = createPlatformAdminCaller()
      const result = await platformAdmin.scheduler.trigger({ jobName: "trigger-test" })

      expect(result).toEqual({ success: true })
      expect(executed).toBe(true)
    })

    it("throws when scheduler is not initialized", async () => {
      setSchedulerInstance(null as any)
      const platformAdmin = createPlatformAdminCaller()

      await expect(platformAdmin.scheduler.trigger({ jobName: "non-existent" })).rejects.toThrow(
        "Scheduler not initialized",
      )
    })

    it("throws for non-existent job", async () => {
      const scheduler = new Scheduler()
      setSchedulerInstance(scheduler)

      const platformAdmin = createPlatformAdminCaller()
      await expect(platformAdmin.scheduler.trigger({ jobName: "non-existent" })).rejects.toThrow()
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.scheduler.trigger({ jobName: "any" })).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.scheduler.trigger({ jobName: "any" })).rejects.toThrow("Not authenticated")
    })
  })
})
