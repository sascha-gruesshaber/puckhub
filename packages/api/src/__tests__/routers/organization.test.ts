import { describe, expect, it } from "vitest"
import {
  createTestCaller,
  createPlatformAdminCaller,
  createOtherOrgAdminCaller,
  seedSecondOrg,
  getTestDb,
  TEST_ORG_ID,
  OTHER_ORG_ID,
} from "../testUtils"

describe("organization router", () => {
  // ─── listMine ───────────────────────────────────────────────────────────────

  describe("listMine", () => {
    it("returns orgs for admin user (owner of test-org)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const orgs = await admin.organization.listMine()

      expect(orgs).toHaveLength(1)
      expect(orgs[0]?.id).toBe(TEST_ORG_ID)
      expect(orgs[0]?.name).toBe("Test League")
      expect(orgs[0]?.role).toBe("member") // Better Auth field is always "member"; actual roles in MemberRole table
    })

    it("returns orgs for regular user (member of test-org)", async () => {
      const user = createTestCaller({ asUser: true })
      const orgs = await user.organization.listMine()

      expect(orgs).toHaveLength(1)
      expect(orgs[0]?.id).toBe(TEST_ORG_ID)
      expect(orgs[0]?.role).toBe("member")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.listMine()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── getActive / getActiveOrNull ────────────────────────────────────────────

  describe("getActive", () => {
    it("returns the active organization for a member", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const org = await admin.organization.getActive()

      expect(org).toBeDefined()
      expect(org.id).toBe(TEST_ORG_ID)
      expect(org.name).toBe("Test League")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.getActive()).rejects.toThrow("Not authenticated")
    })
  })

  describe("getActiveOrNull", () => {
    it("returns org when active org is set", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const org = await admin.organization.getActiveOrNull()

      expect(org).not.toBeNull()
      expect(org?.id).toBe(TEST_ORG_ID)
    })

    it("returns null when no active org is set", async () => {
      // Platform admin with no active org
      const platformAdmin = createPlatformAdminCaller()
      const org = await platformAdmin.organization.getActiveOrNull()

      expect(org).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.getActiveOrNull()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── setActive ──────────────────────────────────────────────────────────────

  describe("setActive", () => {
    it("sets active org for a member", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.organization.setActive({ organizationId: TEST_ORG_ID })

      expect(result).toEqual({ organizationId: TEST_ORG_ID })
    })

    it("rejects setting active org when user is not a member", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const randomOrgId = "00000000-0000-0000-0000-000000000099"

      await expect(admin.organization.setActive({ organizationId: randomOrgId })).rejects.toThrow(
        "ORG_NOT_MEMBER",
      )
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.setActive({ organizationId: TEST_ORG_ID })).rejects.toThrow("Not authenticated")
    })
  })

  // ─── clearActive ────────────────────────────────────────────────────────────

  describe("clearActive", () => {
    it("returns ok true", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.organization.clearActive()

      expect(result).toEqual({ ok: true })
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.clearActive()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── create (platform admin) ───────────────────────────────────────────────

  describe("create", () => {
    it("creates org with new owner user, account, and settings", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      const result = await platformAdmin.organization.create({
        name: "New Hockey League",
        ownerEmail: "newowner@example.com",
        ownerName: "New Owner",
        leagueSettings: {
          leagueName: "New Hockey League",
          leagueShortName: "NHL",
        },
      })

      expect(result.organization).toBeDefined()
      expect(result.organization.name).toBe("New Hockey League")
      expect(result.isNewUser).toBe(true)
      expect(result.generatedPassword).toBeDefined()
      expect(typeof result.generatedPassword).toBe("string")

      // Verify user was created
      const user = await db.user.findFirst({ where: { email: "newowner@example.com" } })
      expect(user).not.toBeNull()
      expect(user?.name).toBe("New Owner")

      // Verify account was created
      const account = await db.account.findFirst({ where: { userId: user!.id } })
      expect(account).not.toBeNull()
      expect(account?.providerId).toBe("credential")

      // Verify member (owner) was created
      const member = await db.member.findFirst({
        where: { userId: user!.id, organizationId: result.organization.id },
      })
      expect(member).not.toBeNull()
      expect(member?.role).toBe("member") // Better Auth field is always "member"

      // Verify owner MemberRole was created
      const memberRoleEntry = await db.memberRole.findFirst({
        where: { memberId: member!.id, role: "owner" },
      })
      expect(memberRoleEntry).not.toBeNull()

      // Verify system settings were created
      const settings = await db.systemSettings.findFirst({
        where: { organizationId: result.organization.id },
      })
      expect(settings).not.toBeNull()
      expect(settings?.leagueName).toBe("New Hockey League")
      expect(settings?.leagueShortName).toBe("NHL")
      expect(settings?.locale).toBe("de-DE")
      expect(settings?.timezone).toBe("Europe/Berlin")
      expect(settings?.pointsWin).toBe(2)
      expect(settings?.pointsDraw).toBe(1)
      expect(settings?.pointsLoss).toBe(0)
    })

    it("reuses existing user when email already exists", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // admin@test.local already exists in the template DB
      const result = await platformAdmin.organization.create({
        name: "Second League for Admin",
        ownerEmail: "admin@test.local",
        ownerName: "Test Admin",
        leagueSettings: {
          leagueName: "Second League",
          leagueShortName: "SL",
        },
      })

      expect(result.organization.name).toBe("Second League for Admin")
      expect(result.isNewUser).toBe(false)
      expect(result.generatedPassword).toBeUndefined()

      // Verify member was created for existing user
      const member = await db.member.findFirst({
        where: { userId: "test-admin-id", organizationId: result.organization.id },
      })
      expect(member).not.toBeNull()
      expect(member?.role).toBe("member") // Better Auth field is always "member"

      // Verify owner MemberRole was created
      const memberRoleEntry = await db.memberRole.findFirst({
        where: { memberId: member!.id, role: "owner" },
      })
      expect(memberRoleEntry).not.toBeNull()
    })

    it("creates org with custom league settings", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      const result = await platformAdmin.organization.create({
        name: "Custom League",
        ownerEmail: "custom@example.com",
        ownerName: "Custom Owner",
        leagueSettings: {
          leagueName: "Custom Hockey League",
          leagueShortName: "CHL",
          locale: "en-US",
          timezone: "America/New_York",
          pointsWin: 3,
          pointsDraw: 1,
          pointsLoss: 0,
        },
      })

      const settings = await db.systemSettings.findFirst({
        where: { organizationId: result.organization.id },
      })
      expect(settings?.locale).toBe("en-US")
      expect(settings?.timezone).toBe("America/New_York")
      expect(settings?.pointsWin).toBe(3)
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.organization.create({
          name: "Forbidden",
          ownerEmail: "x@example.com",
          ownerName: "X",
          leagueSettings: {
            leagueName: "Forbidden League",
            leagueShortName: "FL",
          },
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.organization.create({
          name: "Hacked",
          ownerEmail: "hacker@example.com",
          ownerName: "Hacker",
          leagueSettings: {
            leagueName: "Hacked League",
            leagueShortName: "HL",
          },
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── update ─────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates org name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const updated = await admin.organization.update({ name: "Updated League" })

      expect(updated.name).toBe("Updated League")
    })

    it("updates org logo", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const updated = await admin.organization.update({ logo: "/uploads/logo.png" })

      expect(updated.logo).toBe("/uploads/logo.png")
    })

    it("clears org logo by setting to null", async () => {
      const admin = createTestCaller({ asAdmin: true })

      // First set a logo
      await admin.organization.update({ logo: "/uploads/logo.png" })

      // Then clear it
      const updated = await admin.organization.update({ logo: null })
      expect(updated.logo).toBeNull()
    })

    it("rejects regular member (not admin/owner)", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(user.organization.update({ name: "Nope" })).rejects.toThrow("Keine Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.update({ name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  // ─── listMembers ────────────────────────────────────────────────────────────

  describe("listMembers", () => {
    it("returns members with user data", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const members = await admin.organization.listMembers()

      expect(members).toHaveLength(2) // admin + regular user
      const adminMember = members.find((m) => m.user.email === "admin@test.local")
      expect(adminMember).toBeDefined()
      expect(adminMember?.role).toBe("member") // Better Auth field is always "member"
      expect(adminMember?.user.name).toBe("Test Admin")

      const userMember = members.find((m) => m.user.email === "user@test.local")
      expect(userMember).toBeDefined()
      expect(userMember?.role).toBe("member")
    })

    it("allows regular member to list members", async () => {
      const user = createTestCaller({ asUser: true })
      const members = await user.organization.listMembers()

      expect(members).toHaveLength(2)
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.listMembers()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── inviteMember ───────────────────────────────────────────────────────────

  describe("inviteMember", () => {
    it("creates a pending invitation", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const inv = await admin.organization.inviteMember({
        email: "invite@example.com",
        role: "member",
      })

      expect(inv).toBeDefined()
      expect(inv.email).toBe("invite@example.com")
      expect(inv.organizationId).toBe(TEST_ORG_ID)
      expect(inv.role).toBe("member")
      expect(inv.status).toBe("pending")
      expect(inv.inviterId).toBe("test-admin-id")
      expect(inv.expiresAt).toBeInstanceOf(Date)
    })

    it("creates invitation with admin role", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const inv = await admin.organization.inviteMember({
        email: "admin-invite@example.com",
        role: "admin",
      })

      expect(inv.role).toBe("admin")
    })

    it("defaults to member role when not specified", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const inv = await admin.organization.inviteMember({
        email: "default-role@example.com",
      })

      expect(inv.role).toBe("member")
    })

    it("rejects duplicate pending invitation", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.organization.inviteMember({
        email: "dup@example.com",
      })

      await expect(
        admin.organization.inviteMember({
          email: "dup@example.com",
        }),
      ).rejects.toThrow("ORG_INVITATION_ALREADY_SENT")
    })

    it("rejects regular member (not admin/owner)", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(
        user.organization.inviteMember({
          email: "nope@example.com",
        }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.organization.inviteMember({
          email: "hacker@example.com",
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── removeMember ───────────────────────────────────────────────────────────

  describe("removeMember", () => {
    it("removes a member from the org", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // Remove the regular user (member id = "test-user-member-id")
      await admin.organization.removeMember({ memberId: "test-user-member-id" })

      // Verify member is gone
      const member = await db.member.findFirst({
        where: { id: "test-user-member-id" },
      })
      expect(member).toBeNull()
    })

    it("rejects self-removal", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await expect(
        admin.organization.removeMember({ memberId: "test-admin-member-id" }),
      ).rejects.toThrow("MEMBER_CANNOT_REMOVE_SELF")
    })

    it("throws NOT_FOUND for non-existent member", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await expect(
        admin.organization.removeMember({ memberId: "non-existent-member-id" }),
      ).rejects.toThrow("MEMBER_NOT_FOUND")
    })

    it("rejects regular member (not admin/owner)", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(
        user.organization.removeMember({ memberId: "test-admin-member-id" }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.organization.removeMember({ memberId: "test-user-member-id" }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── listAll (platform admin) ──────────────────────────────────────────────

  describe("listAll", () => {
    it("returns all orgs with member counts", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const orgs = await platformAdmin.organization.listAll()

      expect(orgs.length).toBeGreaterThanOrEqual(1)
      const testOrg = orgs.find((o) => o.id === TEST_ORG_ID)
      expect(testOrg).toBeDefined()
      expect(testOrg?.name).toBe("Test League")
      expect(testOrg?.memberCount).toBe(2) // admin + regular user
    })

    it("returns orgs sorted by name ascending", async () => {
      const platformAdmin = createPlatformAdminCaller()

      // Create a second org so we can verify sort order
      await platformAdmin.organization.create({
        name: "Alpha League",
        ownerEmail: "alpha@example.com",
        ownerName: "Alpha Owner",
        leagueSettings: {
          leagueName: "Alpha League",
          leagueShortName: "AL",
        },
      })

      const orgs = await platformAdmin.organization.listAll()
      expect(orgs.length).toBeGreaterThanOrEqual(2)

      // Verify ascending order
      for (let i = 1; i < orgs.length; i++) {
        expect(orgs[i]!.name.localeCompare(orgs[i - 1]!.name)).toBeGreaterThanOrEqual(0)
      }
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.organization.listAll()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.listAll()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── delete (platform admin) ───────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an org and its associated data", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // First create an org to delete
      const created = await platformAdmin.organization.create({
        name: "To Delete League",
        ownerEmail: "delete-owner@example.com",
        ownerName: "Delete Owner",
        leagueSettings: {
          leagueName: "To Delete",
          leagueShortName: "TD",
        },
      })

      const orgId = created.organization.id

      // Verify it exists
      const orgBefore = await db.organization.findFirst({ where: { id: orgId } })
      expect(orgBefore).not.toBeNull()

      // Delete it
      const result = await platformAdmin.organization.delete({ id: orgId })
      expect(result).toEqual({ id: orgId })

      // Verify org is gone
      const orgAfter = await db.organization.findFirst({ where: { id: orgId } })
      expect(orgAfter).toBeNull()

      // Verify members are gone (cascade)
      const members = await db.member.findMany({ where: { organizationId: orgId } })
      expect(members).toHaveLength(0)

      // Verify settings are gone (cascade)
      const settings = await db.systemSettings.findFirst({ where: { organizationId: orgId } })
      expect(settings).toBeNull()
    })

    it("cleans up orphaned users (no remaining memberships)", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // Create an org with a brand new user (orphan candidate)
      const created = await platformAdmin.organization.create({
        name: "Orphan Test League",
        ownerEmail: "orphan@example.com",
        ownerName: "Orphan User",
        leagueSettings: {
          leagueName: "Orphan League",
          leagueShortName: "OL",
        },
      })

      const orgId = created.organization.id
      const ownerUser = await db.user.findFirst({ where: { email: "orphan@example.com" } })
      expect(ownerUser).not.toBeNull()

      // Delete the org
      await platformAdmin.organization.delete({ id: orgId })

      // The orphan user should be cleaned up (no other memberships)
      const userAfter = await db.user.findFirst({ where: { email: "orphan@example.com" } })
      expect(userAfter).toBeNull()
    })

    it("does NOT delete users who have other memberships", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // Create an org where test-admin-id (who already has TEST_ORG_ID membership) is the owner
      const created = await platformAdmin.organization.create({
        name: "Shared User League",
        ownerEmail: "admin@test.local", // existing user with TEST_ORG_ID membership
        ownerName: "Test Admin",
        leagueSettings: {
          leagueName: "Shared League",
          leagueShortName: "SHL",
        },
      })

      const orgId = created.organization.id

      // Delete this new org
      await platformAdmin.organization.delete({ id: orgId })

      // test-admin-id should still exist (has membership in TEST_ORG_ID)
      const adminUser = await db.user.findFirst({ where: { id: "test-admin-id" } })
      expect(adminUser).not.toBeNull()
    })

    it("throws NOT_FOUND for missing org", async () => {
      const platformAdmin = createPlatformAdminCaller()

      await expect(
        platformAdmin.organization.delete({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toThrow("ORG_NOT_FOUND")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.organization.delete({ id: TEST_ORG_ID })).rejects.toThrow(
        "Keine Plattform-Administratorrechte",
      )
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.organization.delete({ id: TEST_ORG_ID })).rejects.toThrow("Not authenticated")
    })
  })

  // ─── setActiveForAdmin (platform admin) ────────────────────────────────────

  describe("setActiveForAdmin", () => {
    it("sets active org bypassing membership check", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const result = await platformAdmin.organization.setActiveForAdmin({ organizationId: TEST_ORG_ID })

      expect(result).toEqual({ organizationId: TEST_ORG_ID })
    })

    it("throws NOT_FOUND for missing org", async () => {
      const platformAdmin = createPlatformAdminCaller()

      await expect(
        platformAdmin.organization.setActiveForAdmin({
          organizationId: "00000000-0000-0000-0000-000000000099",
        }),
      ).rejects.toThrow("ORG_NOT_FOUND")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.organization.setActiveForAdmin({ organizationId: TEST_ORG_ID }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.organization.setActiveForAdmin({ organizationId: TEST_ORG_ID }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── updateMemberRole ──────────────────────────────────────────────────────

  describe("updateMemberRole", () => {
    it("changes a member role to admin", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const updated = await admin.organization.updateMemberRole({
        memberId: "test-user-member-id",
        role: "admin",
      })

      expect(updated).toBeDefined()
      expect(updated.role).toBe("admin")
    })

    it("changes a member role to owner", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const updated = await admin.organization.updateMemberRole({
        memberId: "test-user-member-id",
        role: "owner",
      })

      expect(updated.role).toBe("owner")
    })

    it("demotes a member back to member", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // First promote to admin
      await db.member.update({
        where: { id: "test-user-member-id" },
        data: { role: "admin" },
      })

      // Then demote back to member
      const updated = await admin.organization.updateMemberRole({
        memberId: "test-user-member-id",
        role: "member",
      })

      expect(updated.role).toBe("member")
    })

    it("throws NOT_FOUND for non-existent member", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await expect(
        admin.organization.updateMemberRole({
          memberId: "non-existent-member-id",
          role: "admin",
        }),
      ).rejects.toThrow("MEMBER_NOT_FOUND")
    })

    it("rejects regular member (not admin/owner)", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(
        user.organization.updateMemberRole({
          memberId: "test-admin-member-id",
          role: "member",
        }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.organization.updateMemberRole({
          memberId: "test-user-member-id",
          role: "admin",
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── removeMemberRole ─────────────────────────────────────────────────────

  describe("removeMemberRole", () => {
    it("prevents removing the last owner role in the organization", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // Find the admin's owner MemberRole
      const ownerRole = await db.memberRole.findFirst({
        where: { memberId: "test-admin-member-id", role: "owner" },
      })
      expect(ownerRole).not.toBeNull()

      await expect(
        admin.organization.removeMemberRole({ memberRoleId: ownerRole!.id }),
      ).rejects.toThrow("ORG_LAST_OWNER")
    })

    it("allows removing an owner role when another owner exists", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // Give the regular user an owner role too
      await db.memberRole.create({
        data: {
          memberId: "test-user-member-id",
          role: "owner",
        },
      })

      // Now removing the admin's owner role should succeed (2 owners → 1)
      const adminOwnerRole = await db.memberRole.findFirst({
        where: { memberId: "test-admin-member-id", role: "owner" },
      })
      expect(adminOwnerRole).not.toBeNull()

      const result = await admin.organization.removeMemberRole({ memberRoleId: adminOwnerRole!.id })
      expect(result.success).toBe(true)
    })
  })

  // ─── Cross-org isolation ───────────────────────────────────────────────────

  describe("cross-org isolation", () => {
    it("other org admin cannot access test org members", async () => {
      await seedSecondOrg()
      const otherAdmin = createOtherOrgAdminCaller()

      // otherAdmin has activeOrganizationId=OTHER_ORG_ID, should only see that org's members
      const members = await otherAdmin.organization.listMembers()
      expect(members).toHaveLength(1)
      expect(members[0]?.user.email).toBe("other-admin@test.local")
    })

    it("other org admin cannot update test org", async () => {
      await seedSecondOrg()
      const otherAdmin = createOtherOrgAdminCaller()

      // This updates the active org (OTHER_ORG_ID), not TEST_ORG_ID
      const updated = await otherAdmin.organization.update({ name: "Updated Other" })
      expect(updated.id).toBe(OTHER_ORG_ID)
      expect(updated.name).toBe("Updated Other")

      // Verify test org is unchanged
      const db = getTestDb()
      const testOrg = await db.organization.findFirst({ where: { id: TEST_ORG_ID } })
      expect(testOrg?.name).toBe("Test League")
    })
  })
})
