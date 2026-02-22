import { describe, expect, it, beforeEach } from "vitest"
import {
  createTestCaller,
  createPlatformAdminCaller,
  createOtherOrgAdminCaller,
  createCrossOrgCaller,
  seedSecondOrg,
  TEST_ORG_ID,
  OTHER_ORG_ID,
} from "../testUtils"

// =========================================================================
// 2a. Role Escalation Prevention
// =========================================================================
describe("role escalation prevention", () => {
  describe("org members (non-admin) are rejected by orgAdminProcedure endpoints", () => {
    let memberCaller: ReturnType<typeof createTestCaller>

    beforeEach(() => {
      memberCaller = createTestCaller({ asUser: true })
    })

    it("season.create rejects non-admin member", async () => {
      await expect(
        memberCaller.season.create({
          name: "Blocked Season",
          seasonStart: "2025-09-01",
          seasonEnd: "2026-04-30",
        }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("team.create rejects non-admin member", async () => {
      await expect(
        memberCaller.team.create({ name: "Blocked Team", shortName: "BLK" }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("player.create rejects non-admin member", async () => {
      await expect(
        memberCaller.player.create({ firstName: "Blocked", lastName: "Player" }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("settings.update rejects non-admin member", async () => {
      await expect(
        memberCaller.settings.update({
          leagueName: "Hacked League",
          leagueShortName: "HCK",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("news.create rejects member without editor role", async () => {
      await expect(
        memberCaller.news.create({ title: "Blocked News", content: "<p>No</p>" }),
      ).rejects.toThrow("Unzureichende Berechtigungen")
    })

    it("page.create rejects member without editor role", async () => {
      await expect(
        memberCaller.page.create({ title: "Blocked Page" }),
      ).rejects.toThrow("Unzureichende Berechtigungen")
    })

    it("game.create rejects member without game_manager role", async () => {
      const FAKE_ID = "00000000-0000-0000-0000-000000000000"
      await expect(
        memberCaller.game.create({ roundId: FAKE_ID, homeTeamId: FAKE_ID, awayTeamId: FAKE_ID }),
      ).rejects.toThrow("Unzureichende Berechtigungen")
    })

    it("users.create rejects non-admin member", async () => {
      await expect(
        memberCaller.users.create({
          name: "Hacker",
          email: "hacker@test.local",
          password: "password123",
        }),
      ).rejects.toThrow("Keine Administratorrechte")
    })
  })
})

// =========================================================================
// 2b. Cross-Organization Data Isolation
// =========================================================================
describe("cross-organization data isolation", () => {
  beforeEach(async () => {
    await seedSecondOrg()
  })

  describe("read isolation: org B cannot see org A's data", () => {
    it("season.list returns empty for org B after creating seasons in org A", async () => {
      const orgAAdmin = createTestCaller({ asAdmin: true })
      await orgAAdmin.season.create({
        name: "Org A Season",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      })

      const orgBAdmin = createOtherOrgAdminCaller()
      const orgBSeasons = await orgBAdmin.season.list()
      expect(orgBSeasons).toEqual([])
    })

    it("team.list returns empty for org B after creating teams in org A", async () => {
      const orgAAdmin = createTestCaller({ asAdmin: true })
      await orgAAdmin.team.create({ name: "Org A Tigers", shortName: "TIG" })

      const orgBAdmin = createOtherOrgAdminCaller()
      const orgBTeams = await orgBAdmin.team.list()
      expect(orgBTeams).toEqual([])
    })

    it("player.list returns empty for org B after creating players in org A", async () => {
      const orgAAdmin = createTestCaller({ asAdmin: true })
      await orgAAdmin.player.create({ firstName: "Org A", lastName: "Player" })

      const orgBAdmin = createOtherOrgAdminCaller()
      const orgBPlayers = await orgBAdmin.player.list()
      expect(orgBPlayers).toEqual([])
    })
  })

  describe("mutation isolation: cross-org caller is rejected as non-member", () => {
    it("season.list rejects cross-org caller (orgProcedure)", async () => {
      // crossOrgCaller has activeOrganizationId=TEST_ORG_ID but is NOT a member
      const crossOrgCaller = createCrossOrgCaller()
      await expect(crossOrgCaller.season.list()).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("team.list rejects cross-org caller (orgProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(crossOrgCaller.team.list()).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("player.list rejects cross-org caller (orgProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(crossOrgCaller.player.list()).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("season.create rejects cross-org caller (orgAdminProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(
        crossOrgCaller.season.create({
          name: "Cross-Org Season",
          seasonStart: "2025-09-01",
          seasonEnd: "2026-04-30",
        }),
      ).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("team.create rejects cross-org caller (orgAdminProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(
        crossOrgCaller.team.create({ name: "Cross-Org Team", shortName: "COT" }),
      ).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("player.create rejects cross-org caller (orgAdminProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(
        crossOrgCaller.player.create({ firstName: "Cross", lastName: "Player" }),
      ).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("settings.update rejects cross-org caller (orgAdminProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(
        crossOrgCaller.settings.update({
          leagueName: "Hijacked",
          leagueShortName: "HIJ",
          locale: "de-DE",
          timezone: "Europe/Berlin",
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        }),
      ).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("news.create rejects cross-org caller (orgProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(
        crossOrgCaller.news.create({ title: "Cross-Org News", content: "<p>No</p>" }),
      ).rejects.toThrow("Kein Mitglied dieser Organisation")
    })

    it("users.create rejects cross-org caller (orgAdminProcedure)", async () => {
      const crossOrgCaller = createCrossOrgCaller()
      await expect(
        crossOrgCaller.users.create({
          name: "Infiltrator",
          email: "infiltrator@test.local",
          password: "password123",
        }),
      ).rejects.toThrow("Kein Mitglied dieser Organisation")
    })
  })
})

// =========================================================================
// 2c. Platform Admin Boundaries
// =========================================================================
describe("platform admin boundaries", () => {
  beforeEach(async () => {
    await seedSecondOrg()
  })

  describe("platformAdminProcedure endpoints reject non-platform-admin callers", () => {
    it("organization.listAll rejects regular org admin", async () => {
      const orgAdmin = createTestCaller({ asAdmin: true })
      await expect(orgAdmin.organization.listAll()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("organization.create rejects regular org admin", async () => {
      const orgAdmin = createTestCaller({ asAdmin: true })
      await expect(
        orgAdmin.organization.create({
          name: "Rogue Org",
          ownerEmail: "rogue@test.local",
          ownerName: "Rogue Owner",
          leagueSettings: {
            leagueName: "Rogue League",
            leagueShortName: "RGL",
          },
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("organization.delete rejects regular org admin", async () => {
      const orgAdmin = createTestCaller({ asAdmin: true })
      await expect(
        orgAdmin.organization.delete({ id: OTHER_ORG_ID }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("organization.listAll rejects regular org member", async () => {
      const orgMember = createTestCaller({ asUser: true })
      await expect(orgMember.organization.listAll()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("organization.listAll rejects unauthenticated caller", async () => {
      const publicCaller = createTestCaller()
      await expect(publicCaller.organization.listAll()).rejects.toThrow("Not authenticated")
    })
  })

  describe("platform admin can access orgProcedure/orgAdminProcedure endpoints for any org", () => {
    it("platform admin can list seasons for TEST_ORG_ID", async () => {
      // First create a season in org A as the org admin
      const orgAAdmin = createTestCaller({ asAdmin: true })
      await orgAAdmin.season.create({
        name: "Platform Visible Season",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      })

      // Platform admin (not a member of TEST_ORG_ID) can see it
      const platformAdmin = createPlatformAdminCaller(TEST_ORG_ID)
      const seasons = await platformAdmin.season.list()
      expect(seasons).toHaveLength(1)
      expect(seasons[0]?.name).toBe("Platform Visible Season")
    })

    it("platform admin can list teams for TEST_ORG_ID", async () => {
      const orgAAdmin = createTestCaller({ asAdmin: true })
      await orgAAdmin.team.create({ name: "Platform Visible Team", shortName: "PVT" })

      const platformAdmin = createPlatformAdminCaller(TEST_ORG_ID)
      const teams = await platformAdmin.team.list()
      expect(teams).toHaveLength(1)
      expect(teams[0]?.name).toBe("Platform Visible Team")
    })

    it("platform admin can create a season in TEST_ORG_ID (orgAdminProcedure)", async () => {
      const platformAdmin = createPlatformAdminCaller(TEST_ORG_ID)
      const season = await platformAdmin.season.create({
        name: "Platform Created Season",
        seasonStart: "2025-09-01",
        seasonEnd: "2026-04-30",
      })
      expect(season.name).toBe("Platform Created Season")
      expect(season.organizationId).toBe(TEST_ORG_ID)
    })

    it("platform admin can create a team in OTHER_ORG_ID (orgAdminProcedure)", async () => {
      const platformAdmin = createPlatformAdminCaller(OTHER_ORG_ID)
      const team = await platformAdmin.team.create({ name: "Other Org Team", shortName: "OOT" })
      expect(team.name).toBe("Other Org Team")
      expect(team.organizationId).toBe(OTHER_ORG_ID)
    })

    it("platform admin without activeOrgId is rejected by orgProcedure", async () => {
      const platformAdminNoOrg = createPlatformAdminCaller()
      await expect(platformAdminNoOrg.season.list()).rejects.toThrow("Keine Organisation ausgewählt")
    })
  })
})
