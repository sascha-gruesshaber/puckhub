import * as schema from "@puckhub/db/schema"
import { and, eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

describe("users router", () => {
  describe("list", () => {
    it("returns the seeded members", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const users = await admin.users.list()

      expect(users).toHaveLength(2) // admin + regular test user
      const adminUser = users.find((u) => u.email === "admin@test.local")
      expect(adminUser).toBeDefined()
      expect(adminUser?.role).toBe("owner")
    })
  })

  describe("getById", () => {
    it("returns user with role", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.getById({ id: "test-admin-id" })

      expect(result.name).toBe("Test Admin")
      expect(result.email).toBe("admin@test.local")
      expect(result.role).toBe("owner")
    })

    it("throws NOT_FOUND for non-existent user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.getById({ id: "non-existent" })).rejects.toThrow("Benutzer nicht gefunden")
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
      ).rejects.toThrow("bereits Mitglied")
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
      await db.insert(schema.user).values({
        id: userId,
        name: "Old Name",
        email: "update@test.local",
        emailVerified: false,
      })
      await db.insert(schema.member).values({
        id: "update-target-member",
        userId,
        organizationId: TEST_ORG_ID,
        role: "member",
      })

      const updated = await admin.users.update({ id: userId, name: "New Name" })
      expect(updated?.name).toBe("New Name")
    })

    it("updates user email", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const userId = "update-email-target"
      await db.insert(schema.user).values({
        id: userId,
        name: "User",
        email: "old@test.local",
        emailVerified: false,
      })
      await db.insert(schema.member).values({
        id: "update-email-target-member",
        userId,
        organizationId: TEST_ORG_ID,
        role: "member",
      })

      const updated = await admin.users.update({ id: userId, email: "new@test.local" })
      expect(updated?.email).toBe("new@test.local")
    })

    it("throws NOT_FOUND for non-existent user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.update({ id: "non-existent", name: "Nope" })).rejects.toThrow("Benutzer nicht gefunden")
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
      await db.insert(schema.user).values({
        id: userId,
        name: "To Delete",
        email: "delete@test.local",
        emailVerified: false,
      })
      await db.insert(schema.member).values({
        id: "delete-target-member",
        userId,
        organizationId: TEST_ORG_ID,
        role: "member",
      })

      await admin.users.delete({ id: userId })

      // Verify member record is gone
      const memberRecord = await db.query.member.findFirst({
        where: and(eq(schema.member.userId, userId), eq(schema.member.organizationId, TEST_ORG_ID)),
      })
      expect(memberRecord).toBeUndefined()
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
      await db.insert(schema.user).values({
        id: userId,
        name: "No Account",
        email: "noaccount@test.local",
        emailVerified: false,
      })
      await db.insert(schema.member).values({
        id: "no-account-member",
        userId,
        organizationId: TEST_ORG_ID,
        role: "member",
      })

      await expect(admin.users.resetPassword({ id: userId, password: "newpass123" })).rejects.toThrow(
        "Account nicht gefunden",
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
      await db.insert(schema.user).values({
        id: userId,
        name: "Role User",
        email: "role@test.local",
        emailVerified: false,
      })
      await db.insert(schema.member).values({
        id: "role-target-member",
        userId,
        organizationId: TEST_ORG_ID,
        role: "member",
      })

      const updated = await admin.users.updateRole({
        userId,
        role: "admin",
      })

      expect(updated).toBeDefined()
      expect(updated?.role).toBe("admin")
    })
  })
})
