import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Users Management", () => {
  test("users list shows the test user", async ({ page }) => {
    await login(page)
    await page.goto("/users")
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show the seeded admin user
    await expect(page.getByText("E2E Admin")).toBeVisible()
    await expect(page.getByText("admin@test.local")).toBeVisible()
  })

  test("create and remove a new user", async ({ page }) => {
    await login(page)
    await page.goto("/users")
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "usersPage.actions.new" }).click()

    await page.getByLabel("usersPage.fields.name").fill("E2E New User")
    await page.getByLabel("usersPage.fields.email").fill("e2e-new@test.local")

    // Select a role
    await page.getByLabel("usersPage.roles.admin").click()

    await page.getByRole("button", { name: "create" }).click()

    // Verify user appears in list
    await expect(page.getByText("E2E New User")).toBeVisible({ timeout: 10_000 })

    // --- REMOVE ---
    const userRow = page.locator(".data-row", { hasText: "E2E New User" })
    await userRow.getByRole("button", { name: "usersPage.actions.delete" }).click()
    await page.getByRole("button", { name: "usersPage.actions.delete" }).last().click()

    await expect(page.getByText("E2E New User")).not.toBeVisible({ timeout: 10_000 })
  })
})
