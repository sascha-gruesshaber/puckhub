import { expect, test } from "@playwright/test"
import { formField, login } from "./helpers"

test.describe("Users Management", () => {
  test("users list shows the test user", async ({ page }) => {
    await login(page)
    await page.goto("/users")
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show the seeded admin user in the list (use the row heading to avoid matching top-bar)
    const userRow = page.locator(".data-row", { hasText: "admin@test.local" })
    await expect(userRow).toBeVisible()
    await expect(userRow.getByText("E2E Admin")).toBeVisible()
  })

  test("create and remove a new user", async ({ page }) => {
    await login(page)
    await page.goto("/users")
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "usersPage.actions.newMember" }).click()

    await formField(page, "usersPage.fields.name").fill("E2E New User")
    await formField(page, "usersPage.fields.email").fill("e2e-new@test.local")

    await page.getByRole("button", { name: "create" }).click()

    // Verify user appears in list
    await expect(page.getByText("E2E New User")).toBeVisible({ timeout: 10_000 })

    // --- REMOVE ---
    const userRow = page.locator(".data-row", { hasText: "E2E New User" })
    await userRow.locator("[aria-label='usersPage.actions.remove']").click()
    await page.getByRole("button", { name: "usersPage.actions.remove" }).last().click()

    await expect(page.getByText("E2E New User")).not.toBeVisible({ timeout: 10_000 })
  })
})
