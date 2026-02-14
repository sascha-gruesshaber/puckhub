import * as schema from "@puckhub/db/schema"
import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

describe("users router", () => {
  describe("list", () => {
    it("returns the seeded admin user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const users = await admin.users.list()

      expect(users).toHaveLength(1)
      expect(users[0]?.email).toBe("admin@test.local")
      expect(users[0]?.roles).toHaveLength(1)
      expect(users[0]?.roles[0]?.role).toBe("super_admin")
    })

    it("returns users with their roles and team info", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      // Insert a second user with a team-scoped role
      await db.insert(schema.user).values({
        id: "user-2",
        name: "Team Manager",
        email: "manager@test.local",
        emailVerified: false,
      })
      await db.insert(schema.userRoles).values({
        userId: "user-2",
        role: "team_manager",
        teamId: team?.id,
      })

      const users = await admin.users.list()
      expect(users).toHaveLength(2)

      const manager = users.find((u) => u.id === "user-2")
      expect(manager).toBeDefined()
      expect(manager?.roles).toHaveLength(1)
      expect(manager?.roles[0]?.role).toBe("team_manager")
      expect(manager?.roles[0]?.team).toBeDefined()
      expect(manager?.roles[0]?.team?.name).toBe("Eagles")
    })
  })

  describe("getById", () => {
    it("returns user with roles", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.users.getById({ id: "test-admin-id" })

      expect(result.name).toBe("Test Admin")
      expect(result.email).toBe("admin@test.local")
      expect(result.roles).toHaveLength(1)
      expect(result.roles[0]?.role).toBe("super_admin")
    })

    it("throws NOT_FOUND for non-existent user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.getById({ id: "non-existent" })).rejects.toThrow("Benutzer nicht gefunden")
    })
  })

  describe("create", () => {
    it("creates a new user with credential account", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const user = await admin.users.create({
        name: "New User",
        email: "new@test.local",
        password: "password123",
      })

      expect(user).toBeDefined()
      expect(user.name).toBe("New User")
      expect(user.email).toBe("new@test.local")

      // Verify the user appears in the list
      const users = await admin.users.list()
      expect(users).toHaveLength(2)
    })

    it("rejects duplicate email", async () => {
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
      ).rejects.toThrow("E-Mail-Adresse existiert bereits")
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

      await db.insert(schema.user).values({
        id: "update-target",
        name: "Old Name",
        email: "update@test.local",
        emailVerified: false,
      })

      const updated = await admin.users.update({ id: "update-target", name: "New Name" })
      expect(updated?.name).toBe("New Name")
    })

    it("updates user email", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      await db.insert(schema.user).values({
        id: "update-email-target",
        name: "User",
        email: "old@test.local",
        emailVerified: false,
      })

      const updated = await admin.users.update({ id: "update-email-target", email: "new@test.local" })
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
    it("deletes a user and their related data", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      // Create a user to delete
      await db.insert(schema.user).values({
        id: "delete-target",
        name: "To Delete",
        email: "delete@test.local",
        emailVerified: false,
      })
      await db.insert(schema.userRoles).values({
        userId: "delete-target",
        role: "viewer",
      })

      await admin.users.delete({ id: "delete-target" })

      // Verify user is gone
      await expect(admin.users.getById({ id: "delete-target" })).rejects.toThrow("Benutzer nicht gefunden")
    })

    it("prevents deleting yourself", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.delete({ id: "test-admin-id" })).rejects.toThrow("eigenen Account nicht löschen")
    })
  })

  describe("resetPassword", () => {
    it("resets password for a user with an account", async () => {
      const admin = createTestCaller({ asAdmin: true })

      // Create a user with a credential account
      const user = await admin.users.create({
        name: "PW User",
        email: "pw@test.local",
        password: "oldpassword",
      })

      // Reset should succeed without throwing
      await admin.users.resetPassword({ id: user.id, password: "newpassword123" })
    })

    it("throws NOT_FOUND when user has no account", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      await db.insert(schema.user).values({
        id: "no-account",
        name: "No Account",
        email: "noaccount@test.local",
        emailVerified: false,
      })

      await expect(admin.users.resetPassword({ id: "no-account", password: "newpass123" })).rejects.toThrow(
        "Account nicht gefunden",
      )
    })

    it("rejects short password", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.users.resetPassword({ id: "test-admin-id", password: "123" })).rejects.toThrow()
    })
  })

  describe("assignRole", () => {
    it("assigns a global role to a user", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      await db.insert(schema.user).values({
        id: "role-target",
        name: "Role User",
        email: "role@test.local",
        emailVerified: false,
      })

      const role = await admin.users.assignRole({
        userId: "role-target",
        role: "league_admin",
      })

      expect(role).toBeDefined()
      expect(role?.role).toBe("league_admin")
      expect(role?.teamId).toBeNull()
    })

    it("assigns a team-scoped role", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })

      await db.insert(schema.user).values({
        id: "team-role-target",
        name: "Manager",
        email: "mgr@test.local",
        emailVerified: false,
      })

      const role = await admin.users.assignRole({
        userId: "team-role-target",
        role: "team_manager",
        teamId: team?.id,
      })

      expect(role?.role).toBe("team_manager")
      expect(role?.teamId).toBe(team?.id)
    })

    it("rejects duplicate role assignment", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      await db.insert(schema.user).values({
        id: "dup-role-target",
        name: "Dup User",
        email: "dup-role@test.local",
        emailVerified: false,
      })

      await admin.users.assignRole({
        userId: "dup-role-target",
        role: "viewer",
      })

      await expect(
        admin.users.assignRole({
          userId: "dup-role-target",
          role: "viewer",
        }),
      ).rejects.toThrow("bereits zugewiesen")
    })
  })

  describe("removeRole", () => {
    it("removes a role assignment", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const db = getTestDb()

      await db.insert(schema.user).values({
        id: "rm-role-target",
        name: "RM User",
        email: "rm-role@test.local",
        emailVerified: false,
      })

      const role = await admin.users.assignRole({
        userId: "rm-role-target",
        role: "viewer",
      })

      await admin.users.removeRole({ roleId: role?.id })

      // Verify role is gone
      const user = await admin.users.getById({ id: "rm-role-target" })
      expect(user.roles).toHaveLength(0)
    })
  })

  describe("listTeams", () => {
    it("returns empty list when no teams exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const teams = await admin.users.listTeams()
      expect(teams).toEqual([])
    })

    it("returns teams ordered by name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.team.create({ name: "Zebras", shortName: "ZEB" })
      await admin.team.create({ name: "Eagles", shortName: "EAG" })

      const teams = await admin.users.listTeams()
      expect(teams).toHaveLength(2)
      expect(teams[0]?.name).toBe("Eagles")
      expect(teams[1]?.name).toBe("Zebras")
    })
  })
})
