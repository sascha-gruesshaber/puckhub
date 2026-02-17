import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("settings router", () => {
  describe("get", () => {
    it("returns null when no settings exist", async () => {
      const caller = createTestCaller()
      const result = await caller.settings.get()
      expect(result).toBeNull()
    })

    it("returns settings after they are created", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.settings.update({
        leagueName: "Eishockey Liga",
        leagueShortName: "EHL",
        locale: "de-DE",
        timezone: "Europe/Berlin",
        pointsWin: 2,
        pointsDraw: 1,
        pointsLoss: 0,
      })

      const caller = createTestCaller()
      const result = await caller.settings.get()
      expect(result).not.toBeNull()
      expect(result?.leagueName).toBe("Eishockey Liga")
      expect(result?.leagueShortName).toBe("EHL")
    })
  })

  describe("update", () => {
    it("creates settings when none exist (upsert insert)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.settings.update({
        leagueName: "Test Liga",
        leagueShortName: "TL",
        locale: "de-DE",
        timezone: "Europe/Berlin",
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
      })

      expect(result).toEqual({ success: true })

      const caller = createTestCaller()
      const settings = await caller.settings.get()
      expect(settings?.leagueName).toBe("Test Liga")
      expect(settings?.pointsWin).toBe(3)
    })

    it("updates existing settings (upsert update)", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.settings.update({
        leagueName: "Original",
        leagueShortName: "OG",
        locale: "de-DE",
        timezone: "Europe/Berlin",
        pointsWin: 2,
        pointsDraw: 1,
        pointsLoss: 0,
      })

      await admin.settings.update({
        leagueName: "Updated Liga",
        leagueShortName: "UL",
        locale: "en-US",
        timezone: "America/New_York",
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
      })

      const caller = createTestCaller()
      const settings = await caller.settings.get()
      expect(settings?.leagueName).toBe("Updated Liga")
      expect(settings?.locale).toBe("en-US")
      expect(settings?.pointsWin).toBe(3)
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.settings.update({
          leagueName: "Hack",
          leagueShortName: "H",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })
})
