import { describe, expect, it } from "vitest"
import {
  createTestCaller,
  createPlatformAdminCaller,
  getTestDb,
  seedSecondOrg,
  TEST_ORG_ID,
  OTHER_ORG_ID,
} from "../testUtils"

describe("users router", () => {
  describe("list", () => {
    it("returns the seeded members", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const users = await admin.users.list()

      expect(users).toHaveLength(2) // admin + regular test user
      const adminUser = users.find((u) => u.email === "admin@test.local")
      expect(adminUser).toBeDefined()
      expect(adminUser?.role).toBe("member") // Better Auth field is always "member"; actual roles in memberRoles
      expect((adminUser as any)?.memberRoles).toBeDefined()
      expect((adminUser as any)?.memberRoles.some((r: any) => r.role === "owner")).toBe(true)
    })
  })

  describe("getById", () => {
    it("returns user with role", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.getById({ id: "test-admin-id" })

      expect(result.name).toBe("Test Admin")
      expect(result.email).toBe("admin@test.local")
      expect(result.role).toBe("member") // Better Auth field
      expect((result as any).memberRoles).toBeDefined()
      expect((result as any).memberRoles.some((r: any) => r.role === "owner")).toBe(true)
    })

    it("throws NOT_FOUND for non-existent user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.getById({ id: "non-existent" })).rejects.toThrow("USER_NOT_FOUND")
    })
  })

  describe("create", () => {
    it("creates a new user with credential account and org membership", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.create({
        name: "New User",
        email: "new@test.local",
        password: "password123",
      })

      expect(result).toBeDefined()
      expect(result.userId).toBeDefined()

      // Verify the user appears in the list
      const users = await admin.users.list()
      expect(users).toHaveLength(3) // admin + regular test user + new user
    })

    it("rejects adding a user who is already a member", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.users.create({
        name: "First",
        email: "dup@test.local",
        password: "password123",
      })

      await expect(
        admin.users.create({
          name: "Second",
          email: "dup@test.local",
          password: "password123",
        }),
      ).rejects.toThrow("USER_ALREADY_MEMBER")
    })

    it("rejects short password", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.users.create({
          name: "Test",
          email: "short@test.local",
          password: "12345",
        }),
      ).rejects.toThrow()
    })

    it("rejects invalid email", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.users.create({
          name: "Test",
          email: "not-an-email",
          password: "password123",
        }),
      ).rejects.toThrow()
    })
  })

  describe("update", () => {
    it("updates user name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const userId = "update-target"
      await db.user.create({
        data: {
          id: userId,
          name: "Old Name",
          email: "update@test.local",
          emailVerified: false,
        },
      })
      await db.member.create({
        data: {
          id: "update-target-member",
          userId,
          organizationId: TEST_ORG_ID,
          role: "member",
        },
      })

      const updated = await admin.users.update({ id: userId, name: "New Name" })
      expect(updated?.name).toBe("New Name")
    })

    it("updates user email", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const userId = "update-email-target"
      await db.user.create({
        data: {
          id: userId,
          name: "User",
          email: "old@test.local",
          emailVerified: false,
        },
      })
      await db.member.create({
        data: {
          id: "update-email-target-member",
          userId,
          organizationId: TEST_ORG_ID,
          role: "member",
        },
      })

      const updated = await admin.users.update({ id: userId, email: "new@test.local" })
      expect(updated?.email).toBe("new@test.local")
    })

    it("throws for non-existent user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.update({ id: "non-existent", name: "Nope" })).rejects.toThrow()
    })

    it("returns undefined when no fields provided", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.update({ id: "test-admin-id" })
      expect(result).toBeUndefined()
    })
  })

  describe("delete", () => {
    it("removes a member from the organization", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // Create a user to delete
      const userId = "delete-target"
      await db.user.create({
        data: {
          id: userId,
          name: "To Delete",
          email: "delete@test.local",
          emailVerified: false,
        },
      })
      await db.member.create({
        data: {
          id: "delete-target-member",
          userId,
          organizationId: TEST_ORG_ID,
          role: "member",
        },
      })

      await admin.users.delete({ id: userId })

      // Verify member record is gone
      const memberRecord = await db.member.findFirst({
        where: { userId, organizationId: TEST_ORG_ID },
      })
      expect(memberRecord).toBeNull()
    })

    it("prevents deleting yourself", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.delete({ id: "test-admin-id" })).rejects.toThrow()
    })
  })

  describe("resetPassword", () => {
    it("resets password for a user with an account", async () => {
      const admin = createTestCaller({ asAdmin: true })

      // Create a user with a credential account
      const result = await admin.users.create({
        name: "PW User",
        email: "pw@test.local",
        password: "oldpassword",
      })

      // Reset should succeed without throwing
      await admin.users.resetPassword({ id: result.userId, password: "newpassword123" })
    })

    it("throws NOT_FOUND when user has no account", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const userId = "no-account"
      await db.user.create({
        data: {
          id: userId,
          name: "No Account",
          email: "noaccount@test.local",
          emailVerified: false,
        },
      })
      await db.member.create({
        data: {
          id: "no-account-member",
          userId,
          organizationId: TEST_ORG_ID,
          role: "member",
        },
      })

      await expect(admin.users.resetPassword({ id: userId, password: "newpass123" })).rejects.toThrow(
        "ACCOUNT_NOT_FOUND",
      )
    })

    it("rejects short password", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.resetPassword({ id: "test-admin-id", password: "123" })).rejects.toThrow()
    })
  })

  describe("updateRole", () => {
    it("updates a member role", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const userId = "role-target"
      await db.user.create({
        data: {
          id: userId,
          name: "Role User",
          email: "role@test.local",
          emailVerified: false,
        },
      })
      await db.member.create({
        data: {
          id: "role-target-member",
          userId,
          organizationId: TEST_ORG_ID,
          role: "member",
        },
      })

      const updated = await admin.users.updateRole({
        userId,
        role: "admin",
      })

      expect(updated).toBeDefined()
      expect(updated?.role).toBe("admin")
    })
  })

  // ─── me ─────────────────────────────────────────────────────────────────────

  describe("me", () => {
    it("returns the current user with mustChangePassword flag", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.me()

      expect(result).toBeDefined()
      expect(result?.id).toBe("test-admin-id")
      expect(result?.mustChangePassword).toBeDefined()
    })

    it("returns user info for regular user", async () => {
      const user = createTestCaller({ asUser: true })
      const result = await user.users.me()

      expect(result).toBeDefined()
      expect(result?.id).toBe("test-user-id")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.users.me()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── clearMustChangePassword ──────────────────────────────────────────────

  describe("clearMustChangePassword", () => {
    it("clears the mustChangePassword flag", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // Set the flag first
      await db.user.update({
        where: { id: "test-admin-id" },
        data: { mustChangePassword: true },
      })

      const result = await admin.users.clearMustChangePassword()
      expect(result).toEqual({ ok: true })

      // Verify flag is cleared
      const user = await db.user.findUnique({ where: { id: "test-admin-id" } })
      expect(user?.mustChangePassword).toBe(false)
    })

    it("succeeds even when flag is already false", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.clearMustChangePassword()
      expect(result).toEqual({ ok: true })
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.users.clearMustChangePassword()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── listAll (platform admin) ─────────────────────────────────────────────

  describe("listAll", () => {
    it("returns all users with organization memberships", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const users = await platformAdmin.users.listAll()

      // Template DB has: test-admin-id, test-user-id, test-platform-admin-id, other-admin-id
      expect(users.length).toBeGreaterThanOrEqual(3)

      const adminUser = users.find((u: any) => u.email === "admin@test.local")
      expect(adminUser).toBeDefined()
      expect(adminUser?.organizations).toBeDefined()
      expect(adminUser?.organizations.length).toBeGreaterThanOrEqual(1)
      expect(adminUser?.organizations[0]?.organizationId).toBe(TEST_ORG_ID)
    })

    it("returns users sorted by name ascending", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const users = await platformAdmin.users.listAll()

      for (let i = 1; i < users.length; i++) {
        const prev = users[i - 1]?.name ?? ""
        const curr = users[i]?.name ?? ""
        expect(curr.localeCompare(prev)).toBeGreaterThanOrEqual(0)
      }
    })

    it("includes platform admin role field", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const users = await platformAdmin.users.listAll()

      const platUser = users.find((u: any) => u.email === "platform@test.local")
      expect(platUser).toBeDefined()
      expect(platUser?.role).toBe("admin")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.listAll()).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.users.listAll()).rejects.toThrow("Not authenticated")
    })
  })

  // ─── deleteGlobal (platform admin) ────────────────────────────────────────

  describe("deleteGlobal", () => {
    it("deletes a user globally (including all memberships)", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // Create a user to delete
      const userId = "global-delete-target"
      await db.user.create({
        data: {
          id: userId,
          name: "Global Delete",
          email: "global-delete@test.local",
          emailVerified: true,
        },
      })
      await db.member.create({
        data: {
          id: "global-delete-member",
          userId,
          organizationId: TEST_ORG_ID,
          role: "member",
        },
      })

      const result = await platformAdmin.users.deleteGlobal({ id: userId })
      expect(result).toEqual({ id: userId })

      // Verify user is gone
      const user = await db.user.findFirst({ where: { id: userId } })
      expect(user).toBeNull()

      // Verify members are gone (cascade)
      const members = await db.member.findMany({ where: { userId } })
      expect(members).toHaveLength(0)
    })

    it("prevents deleting yourself", async () => {
      const platformAdmin = createPlatformAdminCaller()
      await expect(
        platformAdmin.users.deleteGlobal({ id: "test-platform-admin-id" }),
      ).rejects.toThrow("USER_CANNOT_DELETE_SELF")
    })

    it("throws NOT_FOUND for non-existent user", async () => {
      const platformAdmin = createPlatformAdminCaller()
      await expect(
        platformAdmin.users.deleteGlobal({ id: "non-existent-user-id" }),
      ).rejects.toThrow("USER_NOT_FOUND")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.users.deleteGlobal({ id: "test-user-id" }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.users.deleteGlobal({ id: "test-user-id" }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── addToOrganization (platform admin) ───────────────────────────────────

  describe("addToOrganization", () => {
    it("adds an existing user to an organization", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()
      await seedSecondOrg()

      // test-user-id is in TEST_ORG_ID but not in OTHER_ORG_ID
      const result = await platformAdmin.users.addToOrganization({
        userId: "test-user-id",
        organizationId: OTHER_ORG_ID,
      })

      expect(result).toEqual({ ok: true })

      // Verify membership
      const member = await db.member.findFirst({
        where: { userId: "test-user-id", organizationId: OTHER_ORG_ID },
      })
      expect(member).not.toBeNull()

      // Verify MemberRole was created
      const memberRole = await db.memberRole.findFirst({
        where: { memberId: member!.id },
      })
      expect(memberRole).not.toBeNull()
      expect(memberRole?.role).toBe("admin") // default role
    })

    it("adds user with specific role", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()
      await seedSecondOrg()

      const result = await platformAdmin.users.addToOrganization({
        userId: "test-user-id",
        organizationId: OTHER_ORG_ID,
        role: "owner",
      })

      expect(result).toEqual({ ok: true })

      const member = await db.member.findFirst({
        where: { userId: "test-user-id", organizationId: OTHER_ORG_ID },
      })
      const memberRole = await db.memberRole.findFirst({
        where: { memberId: member!.id },
      })
      expect(memberRole?.role).toBe("owner")
    })

    it("rejects adding user who is already a member", async () => {
      const platformAdmin = createPlatformAdminCaller()

      // test-admin-id is already in TEST_ORG_ID
      await expect(
        platformAdmin.users.addToOrganization({
          userId: "test-admin-id",
          organizationId: TEST_ORG_ID,
        }),
      ).rejects.toThrow("USER_ALREADY_MEMBER")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.users.addToOrganization({
          userId: "test-user-id",
          organizationId: TEST_ORG_ID,
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.users.addToOrganization({
          userId: "test-user-id",
          organizationId: TEST_ORG_ID,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── removeFromOrganization (platform admin) ─────────────────────────────

  describe("removeFromOrganization", () => {
    it("removes a user from an organization", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      // Remove the regular user from TEST_ORG_ID
      const result = await platformAdmin.users.removeFromOrganization({
        userId: "test-user-id",
        organizationId: TEST_ORG_ID,
      })

      expect(result).toEqual({ ok: true })

      // Verify membership is gone
      const member = await db.member.findFirst({
        where: { userId: "test-user-id", organizationId: TEST_ORG_ID },
      })
      expect(member).toBeNull()
    })

    it("prevents removing yourself", async () => {
      const platformAdmin = createPlatformAdminCaller()
      await expect(
        platformAdmin.users.removeFromOrganization({
          userId: "test-platform-admin-id",
          organizationId: TEST_ORG_ID,
        }),
      ).rejects.toThrow("MEMBER_CANNOT_REMOVE_SELF")
    })

    it("succeeds silently when user is not a member", async () => {
      const platformAdmin = createPlatformAdminCaller()

      // platform-admin-id is not in TEST_ORG_ID at all; deleteMany returns 0 which is ok
      const result = await platformAdmin.users.removeFromOrganization({
        userId: "non-existent-user-id",
        organizationId: TEST_ORG_ID,
      })

      expect(result).toEqual({ ok: true })
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.users.removeFromOrganization({
          userId: "test-user-id",
          organizationId: TEST_ORG_ID,
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.users.removeFromOrganization({
          userId: "test-user-id",
          organizationId: TEST_ORG_ID,
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ─── createPlatformUser (platform admin) ──────────────────────────────────

  describe("createPlatformUser", () => {
    it("creates a new platform user with generated password", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      const result = await platformAdmin.users.createPlatformUser({
        name: "New Platform User",
        email: "newplatform@test.local",
      })

      expect(result).toBeDefined()
      expect(result.userId).toBeDefined()
      expect(result.email).toBe("newplatform@test.local")
      expect(result.generatedPassword).toBeDefined()
      expect(typeof result.generatedPassword).toBe("string")
      expect(result.generatedPassword.length).toBeGreaterThanOrEqual(16)

      // Verify user was created
      const user = await db.user.findFirst({ where: { id: result.userId } })
      expect(user).not.toBeNull()
      expect(user?.name).toBe("New Platform User")
      expect(user?.mustChangePassword).toBe(true)
      expect(user?.role).toBeNull() // no role by default

      // Verify credential account was created
      const account = await db.account.findFirst({ where: { userId: result.userId } })
      expect(account).not.toBeNull()
      expect(account?.providerId).toBe("credential")
    })

    it("creates a platform admin user when role is set", async () => {
      const platformAdmin = createPlatformAdminCaller()
      const db = getTestDb()

      const result = await platformAdmin.users.createPlatformUser({
        name: "Admin Platform User",
        email: "adminplatform@test.local",
        role: "admin",
      })

      const user = await db.user.findFirst({ where: { id: result.userId } })
      expect(user?.role).toBe("admin")
    })

    it("rejects duplicate email", async () => {
      const platformAdmin = createPlatformAdminCaller()

      await expect(
        platformAdmin.users.createPlatformUser({
          name: "Duplicate",
          email: "admin@test.local", // already exists in template
        }),
      ).rejects.toThrow("USER_EMAIL_CONFLICT")
    })

    it("rejects non-platform-admin caller", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.users.createPlatformUser({
          name: "Blocked",
          email: "blocked@test.local",
        }),
      ).rejects.toThrow("Keine Plattform-Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.users.createPlatformUser({
          name: "Blocked",
          email: "blocked@test.local",
        }),
      ).rejects.toThrow("Not authenticated")
    })
  })
})
