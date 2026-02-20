import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

const defaultLeagueSettings = {
  leagueName: "Test Liga",
  leagueShortName: "TL",
  locale: "de-DE",
  timezone: "Europe/Berlin",
  pointsWin: 2,
  pointsDraw: 1,
  pointsLoss: 0,
}

/** Remove all users, org data and settings to simulate a fresh install. */
async function clearSetupData() {
  const db = getTestDb()
  await db.delete(schema.member)
  await db.delete(schema.organization)
  await db.delete(schema.session)
  await db.delete(schema.account)
  await db.delete(schema.user)
  await db.delete(schema.systemSettings)
}

describe("setup router", () => {
  describe("status", () => {
    it("returns needsSetup: false when users exist", async () => {
      const caller = createTestCaller()
      const result = await caller.setup.status()
      expect(result.needsSetup).toBe(false)
    })

    it("returns needsSetup: true when no users exist", async () => {
      await clearSetupData()
      const caller = createTestCaller()
      const result = await caller.setup.status()
      expect(result.needsSetup).toBe(true)
    })
  })

  describe("initialize", () => {
    it("creates admin user with platform admin role and organization", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      const result = await caller.setup.initialize({
        admin: {
          name: "Liga Admin",
          email: "admin@liga.de",
          password: "secure123",
        },
        leagueSettings: defaultLeagueSettings,
      })

      expect(result.success).toBe(true)
      expect(result.organizationId).toBeDefined()

      // Verify user
      const db = getTestDb()
      const [user] = await db.select().from(schema.user).where(eq(schema.user.email, "admin@liga.de"))
      expect(user).toBeDefined()
      expect(user?.name).toBe("Liga Admin")
      expect(user?.emailVerified).toBe(true)
      expect(user?.role).toBe("admin")

      // Verify account with hashed password
      const [acc] = await db.select().from(schema.account).where(eq(schema.account.userId, user?.id))
      expect(acc).toBeDefined()
      expect(acc?.providerId).toBe("credential")
      expect(acc?.password).toBeTruthy()
      expect(acc?.password).not.toBe("secure123") // should be hashed

      // Verify organization was created
      const [org] = await db.select().from(schema.organization).where(eq(schema.organization.id, result.organizationId))
      expect(org).toBeDefined()
      expect(org?.name).toBe("Test Liga")

      // Verify admin is org owner
      const [memberRecord] = await db
        .select()
        .from(schema.member)
        .where(eq(schema.member.userId, user?.id))
      expect(memberRecord).toBeDefined()
      expect(memberRecord?.role).toBe("owner")
      expect(memberRecord?.organizationId).toBe(result.organizationId)

      // Verify system settings
      const [settings] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.organizationId, result.organizationId))
      expect(settings).toBeDefined()
      expect(settings?.leagueName).toBe("Test Liga")
      expect(settings?.leagueShortName).toBe("TL")
    })

    it("creates first season when provided", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      const result = await caller.setup.initialize({
        admin: {
          name: "Admin",
          email: "admin@test.de",
          password: "password123",
        },
        leagueSettings: defaultLeagueSettings,
        season: {
          name: "Saison 2025/2026",
          seasonStart: "2025-09-01",
          seasonEnd: "2026-04-30",
        },
      })

      const db = getTestDb()
      const [season] = await db
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.organizationId, result.organizationId))
      expect(season).toBeDefined()
      expect(season?.name).toBe("Saison 2025/2026")
      expect(new Date(season?.seasonStart).toISOString().slice(0, 10)).toBe("2025-09-01")
      expect(new Date(season?.seasonEnd).toISOString().slice(0, 10)).toBe("2026-04-30")
    })

    it("works without season", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      await caller.setup.initialize({
        admin: {
          name: "Admin",
          email: "admin@test.de",
          password: "password123",
        },
        leagueSettings: defaultLeagueSettings,
      })

      const db = getTestDb()
      const seasons = await db.select().from(schema.seasons)
      expect(seasons).toHaveLength(0)
    })

    it("throws FORBIDDEN when users already exist", async () => {
      // Template DB already has a user — don't clear
      const caller = createTestCaller()

      await expect(
        caller.setup.initialize({
          admin: {
            name: "Hacker",
            email: "hacker@evil.com",
            password: "password123",
          },
          leagueSettings: defaultLeagueSettings,
        }),
      ).rejects.toThrow("Setup wurde bereits abgeschlossen")
    })

    it("blocks second initialization after first succeeds", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      await caller.setup.initialize({
        admin: {
          name: "First Admin",
          email: "first@test.de",
          password: "password123",
        },
        leagueSettings: defaultLeagueSettings,
      })

      await expect(
        caller.setup.initialize({
          admin: {
            name: "Second Admin",
            email: "second@test.de",
            password: "password123",
          },
          leagueSettings: defaultLeagueSettings,
        }),
      ).rejects.toThrow("Setup wurde bereits abgeschlossen")
    })

    it("rejects invalid email", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      await expect(
        caller.setup.initialize({
          admin: {
            name: "Admin",
            email: "not-an-email",
            password: "password123",
          },
          leagueSettings: defaultLeagueSettings,
        }),
      ).rejects.toThrow()
    })

    it("rejects empty name", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      await expect(
        caller.setup.initialize({
          admin: {
            name: "",
            email: "admin@test.de",
            password: "password123",
          },
          leagueSettings: defaultLeagueSettings,
        }),
      ).rejects.toThrow()
    })

    it("rejects short password", async () => {
      await clearSetupData()
      const caller = createTestCaller()

      await expect(
        caller.setup.initialize({
          admin: {
            name: "Admin",
            email: "admin@test.de",
            password: "123",
          },
          leagueSettings: defaultLeagueSettings,
        }),
      ).rejects.toThrow()
    })
  })
})
