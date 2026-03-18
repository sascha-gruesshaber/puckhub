import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminPath, E2E_ORG_ID, login, withE2EDb } from "./helpers"

type UserFixture = {
  userId: string
  memberId: string
  email: string
  name: string
}

async function createUserFixture(name: string, email: string): Promise<UserFixture> {
  const userId = randomUUID()
  const memberId = randomUUID()
  const now = new Date().toISOString()

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES (${userId}, ${name}, ${email}, ${true}, ${now}, ${now})
    `
    await sql`
      INSERT INTO member (id, "userId", "organizationId", role, "createdAt")
      VALUES (${memberId}, ${userId}, ${E2E_ORG_ID}, ${"admin"}, ${now})
    `
  })

  return { userId, memberId, email, name }
}

async function deleteUserFixture(userId: string) {
  await withE2EDb(async (sql) => {
    // member cascades from user delete
    await sql`DELETE FROM "user" WHERE id = ${userId}`
  })
}

test.describe("Users Management", () => {
  test("users list shows the test user", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("users"))
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show the seeded admin user in the list
    const userRow = page.getByTestId("user-row").filter({ hasText: "admin@test.local" })
    await expect(userRow).toBeVisible()
    await expect(userRow.getByText("E2E Admin")).toBeVisible()
  })

  test("create a new user", async ({ page }) => {
    const email = `e2e-create-${Date.now()}@test.local`

    await login(page)
    await page.goto(adminPath("users"))
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    try {
      await page.getByTestId("users-new").click()
      await page.getByTestId("users-form-name").fill("E2E Created User")
      await page.getByTestId("users-form-email").fill(email)
      await page.getByTestId("users-form-submit").click()

      // Verify user appears in list
      await expect(page.getByTestId("user-row").filter({ hasText: "E2E Created User" })).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      // Cleanup: find and delete the created user
      await withE2EDb(async (sql) => {
        const rows = await sql<{ id: string }[]>`
          SELECT id FROM "user" WHERE email = ${email} LIMIT 1
        `
        if (rows[0]) {
          await sql`DELETE FROM "user" WHERE id = ${rows[0].id}`
        }
      })
    }
  })

  test("remove a user", async ({ page }) => {
    const fixture = await createUserFixture("E2E Removable User", `e2e-remove-${Date.now()}@test.local`)

    try {
      await login(page)
      await page.goto(adminPath("users"))
      await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
        timeout: 10_000,
      })

      const userRow = page.getByTestId("user-row").filter({ hasText: fixture.name })
      await expect(userRow).toBeVisible({ timeout: 10_000 })
      await userRow.click()

      await page.getByTestId("user-remove").click()
      await page.getByTestId("user-remove-confirm").click()

      await expect(page.getByTestId("user-row").filter({ hasText: fixture.name })).not.toBeVisible({
        timeout: 10_000,
      })
    } catch (error) {
      // If test failed before removal, clean up the fixture
      await deleteUserFixture(fixture.userId).catch(() => {})
      throw error
    }
  })
})
