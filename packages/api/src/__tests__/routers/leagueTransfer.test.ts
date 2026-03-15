import { describe, expect, it } from "vitest"
import { createTestCaller, createPlatformAdminCaller, getTestDb, seedTestOrg, TEST_ORG_ID } from "../testUtils"

describe("leagueTransfer router", () => {
  // ─── exportLeague ─────────────────────────────────────────────────────────

  describe("exportLeague", () => {
    it("exports the test organization", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const result = await platformAdmin.leagueTransfer.exportLeague({
        organizationId: TEST_ORG_ID,
      })

      expect(result).toBeDefined()
      expect(result._meta).toBeDefined()
      expect(result._meta.version).toBe(1)
      expect(result._meta.generator).toBe("puckhub-cms")
      expect(result._meta.sourceOrganizationId).toBe(TEST_ORG_ID)
      expect(result._meta.sourceOrganizationName).toBe("Test League")
      expect(result.organization).toBeDefined()
      expect(result.organization.name).toBe("Test League")
      expect(result.systemSettings).toBeNull() // no settings seeded
    })

    it("exports organization with system settings", async () => {
      const platformAdmin = createPlatformAdminCaller(TEST_ORG_ID)
      const db = getTestDb()

      // Create settings
      await db.systemSettings.create({
        data: {
          organizationId: TEST_ORG_ID,
          leagueName: "Test League",
          leagueShortName: "TL",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        },
      })

      const result = await platformAdmin.leagueTransfer.exportLeague({
        organizationId: TEST_ORG_ID,
      })

      expect(result.systemSettings).not.toBeNull()
      expect(result.systemSettings?.leagueName).toBe("Test League")
      expect(result.systemSettings?.leagueShortName).toBe("TL")
      expect(result.systemSettings?.pointsWin).toBe(2)
    })

    it("exports entity arrays (empty when no data)", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const result = await platformAdmin.leagueTransfer.exportLeague({
        organizationId: TEST_ORG_ID,
      })

      // Entity arrays should be present (even if empty)
      expect(result.seasons).toBeDefined()
      expect(result.teams).toBeDefined()
      expect(result.players).toBeDefined()
      expect(result.games).toBeDefined()
      expect(Array.isArray(result.seasons)).toBe(true)
    })

    it("exports organization with seeded data", async () => {
      const platformAdmin = createPlatformAdminCaller(TEST_ORG_ID)

      // Create some data
      const admin = createTestCaller({ asAdmin: true })
      const season = await admin.season.create({
        name: "Export Season",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      })
      await admin.team.create({ name: "Export Team", shortName: "EXT" })

      const result = await platformAdmin.leagueTransfer.exportLeague({
        organizationId: TEST_ORG_ID,
      })

      expect(result.seasons).toHaveLength(1)
      expect(result.teams).toHaveLength(1)
      // IDs should be present in exported records
      expect(result.seasons[0]?.id).toBeDefined()
      expect(result.seasons[0]?.name).toBe("Export Season")
    })

    it("throws NOT_FOUND for non-existent organization", async () => {
      const platformAdmin = createPlatformAdminCaller()
      await expect(
        platformAdmin.leagueTransfer.exportLeague({
          organizationId: "00000000-0000-0000-0000-000000000099",
        }),
      ).rejects.toThrow("Organisation nicht gefunden")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.leagueTransfer.exportLeague({ organizationId: TEST_ORG_ID })).rejects.toThrow(
        "Keine Plattform-Administratorrechte",
      )
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.leagueTransfer.exportLeague({ organizationId: TEST_ORG_ID })).rejects.toThrow(
        "Not authenticated",
      )
    })
  })

  // ─── validateImport ───────────────────────────────────────────────────────

  describe("validateImport", () => {
    it("validates a minimal valid export", async () => {
      const platformAdmin = createPlatformAdminCaller()

      const validData = {
        _meta: {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          generator: "puckhub-cms" as const,
          sourceOrganizationId: TEST_ORG_ID,
          sourceOrganizationName: "Test League",
        },
        organization: { name: "Import Test", logo: null, metadata: null },
        systemSettings: null,
        _attachments: {},
        seasons: [],
        divisions: [],
        rounds: [],
        teams: [],
        teamDivisions: [],
        players: [],
        contracts: [],
        trikots: [],
        teamTrikots: [],
        games: [],
        gameLineups: [],
        gameEvents: [],
        gameSuspensions: [],
        goalieGameStats: [],
        bonusPoints: [],
        sponsors: [],
        news: [],
        pages: [],
        pageAliases: [],
        documents: [],
      }

      const result = await platformAdmin.leagueTransfer.validateImport({
        data: validData,
      })

      expect(result).toBeDefined()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      // Warnings for empty arrays
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.summary).toBeDefined()
    })

    it("validates a round-trip export/import", async () => {
      const platformAdmin = createPlatformAdminCaller()

      // Export the test org
      const exported = await platformAdmin.leagueTransfer.exportLeague({
        organizationId: TEST_ORG_ID,
      })

      // Validate the exported data
      const result = await platformAdmin.leagueTransfer.validateImport({
        data: exported,
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const minimalData = {
        _meta: {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          generator: "puckhub-cms" as const,
          sourceOrganizationId: "x",
          sourceOrganizationName: "x",
        },
        organization: { name: "x", logo: null, metadata: null },
        systemSettings: null,
        _attachments: {},
        seasons: [],
        divisions: [],
        rounds: [],
        teams: [],
        teamDivisions: [],
        players: [],
        contracts: [],
        trikots: [],
        teamTrikots: [],
        games: [],
        gameLineups: [],
        gameEvents: [],
        gameSuspensions: [],
        goalieGameStats: [],
        bonusPoints: [],
        sponsors: [],
        news: [],
        pages: [],
        pageAliases: [],
        documents: [],
      }

      await expect(admin.leagueTransfer.validateImport({ data: minimalData })).rejects.toThrow(
        "Keine Plattform-Administratorrechte",
      )
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.leagueTransfer.validateImport({
          data: {} as any,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── importLeague ─────────────────────────────────────────────────────────

  describe("importLeague", () => {
    it("imports a minimal league successfully", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      const importData = {
        _meta: {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          generator: "puckhub-cms" as const,
          sourceOrganizationId: "source-org-id",
          sourceOrganizationName: "Source League",
        },
        organization: { name: "Imported League", logo: null, metadata: null },
        systemSettings: {
          leagueName: "Imported League",
          leagueShortName: "IL",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        },
        _attachments: {},
        seasons: [],
        divisions: [],
        rounds: [],
        teams: [],
        teamDivisions: [],
        players: [],
        contracts: [],
        trikots: [],
        teamTrikots: [],
        games: [],
        gameLineups: [],
        gameEvents: [],
        gameSuspensions: [],
        goalieGameStats: [],
        bonusPoints: [],
        sponsors: [],
        news: [],
        pages: [],
        pageAliases: [],
        documents: [],
      }

      const result = await platformAdmin.leagueTransfer.importLeague({
        data: importData,
      })

      expect(result).toBeDefined()
      expect(result.organizationId).toBeDefined()
      expect(result.organizationName).toBe("Imported League")
      expect(result.summary).toBeDefined()

      // Verify org was created in DB
      const org = await db.organization.findFirst({
        where: { id: result.organizationId },
      })
      expect(org).not.toBeNull()
      expect(org?.name).toBe("Imported League")

      // Verify settings were created
      const settings = await db.systemSettings.findFirst({
        where: { organizationId: result.organizationId },
      })
      expect(settings).not.toBeNull()
      expect(settings?.leagueName).toBe("Imported League")

      // Verify caller was added as owner
      const member = await db.member.findFirst({
        where: {
          userId: "test-platform-admin-id",
          organizationId: result.organizationId,
        },
      })
      expect(member).not.toBeNull()
    })

    it("imports with custom name override", async () => {
      const platformAdmin = createPlatformAdminCaller()

      const importData = {
        _meta: {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          generator: "puckhub-cms" as const,
          sourceOrganizationId: "source-org-id",
          sourceOrganizationName: "Source",
        },
        organization: { name: "Original Name", logo: null, metadata: null },
        systemSettings: {
          leagueName: "Original Name",
          leagueShortName: "ON",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        },
        _attachments: {},
        seasons: [],
        divisions: [],
        rounds: [],
        teams: [],
        teamDivisions: [],
        players: [],
        contracts: [],
        trikots: [],
        teamTrikots: [],
        games: [],
        gameLineups: [],
        gameEvents: [],
        gameSuspensions: [],
        goalieGameStats: [],
        bonusPoints: [],
        sponsors: [],
        news: [],
        pages: [],
        pageAliases: [],
        documents: [],
      }

      const result = await platformAdmin.leagueTransfer.importLeague({
        data: importData,
        name: "Custom Name",
      })

      expect(result.organizationName).toBe("Custom Name")
    })

    it("round-trip: export then import creates valid copy", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // Seed some data
      const admin = createTestCaller({ asAdmin: true })
      await db.systemSettings.create({
        data: {
          organizationId: TEST_ORG_ID,
          leagueName: "RT League",
          leagueShortName: "RTL",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        },
      })
      await admin.season.create({
        name: "RT Season",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      })
      await admin.team.create({ name: "RT Team A", shortName: "RTA" })
      await admin.team.create({ name: "RT Team B", shortName: "RTB" })

      // Export
      const exported = await platformAdmin.leagueTransfer.exportLeague({
        organizationId: TEST_ORG_ID,
      })

      // Import
      const result = await platformAdmin.leagueTransfer.importLeague({
        data: exported,
        name: "RT Copy",
      })

      expect(result.organizationId).not.toBe(TEST_ORG_ID)
      expect(result.organizationName).toBe("RT Copy")

      // Verify data was imported
      const seasons = await db.season.findMany({
        where: { organizationId: result.organizationId },
      })
      expect(seasons).toHaveLength(1)
      expect(seasons[0]?.name).toBe("RT Season")

      const teams = await db.team.findMany({
        where: { organizationId: result.organizationId },
      })
      expect(teams).toHaveLength(2)
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.leagueTransfer.importLeague({
          data: {} as any,
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.leagueTransfer.importLeague({
          data: {} as any,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })
})
