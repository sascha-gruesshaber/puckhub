import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("userPreferences router", () => {
  describe("getMyLocale", () => {
    it("returns null locale for new user", async () => {
      const caller = createTestCaller({ asUser: true })
      const result = await caller.userPreferences.getMyLocale()
      expect(result.locale).toBeNull()
    })

    it("returns locale after it has been set", async () => {
      const caller = createTestCaller({ asUser: true })
      await caller.userPreferences.setMyLocale({ locale: "en-US" })

      const result = await caller.userPreferences.getMyLocale()
      expect(result.locale).toBe("en-US")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.userPreferences.getMyLocale()).rejects.toThrow("Not authenticated")
    })
  })

  describe("setMyLocale", () => {
    it("sets locale to de-DE", async () => {
      const caller = createTestCaller({ asUser: true })
      const result = await caller.userPreferences.setMyLocale({ locale: "de-DE" })
      expect(result).toEqual({ success: true })

      const check = await caller.userPreferences.getMyLocale()
      expect(check.locale).toBe("de-DE")
    })

    it("clears locale by setting null", async () => {
      const caller = createTestCaller({ asUser: true })
      await caller.userPreferences.setMyLocale({ locale: "en-US" })
      await caller.userPreferences.setMyLocale({ locale: null })

      const result = await caller.userPreferences.getMyLocale()
      expect(result.locale).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.userPreferences.setMyLocale({ locale: "de-DE" })).rejects.toThrow("Not authenticated")
    })
  })
})
