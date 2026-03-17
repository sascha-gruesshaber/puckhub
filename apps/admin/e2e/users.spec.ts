import { expect, test } from "@playwright/test"
import { adminPath, login } from "./helpers"

test.describe("Users Management", () => {
  test("users list shows the test user", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("users"))
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show the seeded admin user in the list (use the row heading to avoid matching top-bar)
    const userRow = page.getByTestId("user-row").filter({ hasText: "admin@test.local" })
    await expect(userRow).toBeVisible()
    await expect(userRow.getByText("E2E Admin")).toBeVisible()
  })

  test("create and remove a new user", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("users"))
    await expect(page.getByRole("heading", { name: "usersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByTestId("users-new").click()

    await page.getByTestId("users-form-name").fill("E2E New User")
    await page.getByTestId("users-form-email").fill("e2e-new@test.local")

    await page.getByTestId("users-form-submit").click()

    // Verify user appears in list
    await expect(page.getByText("E2E New User")).toBeVisible({ timeout: 10_000 })

    // --- REMOVE ---
    const userRow = page.getByTestId("user-row").filter({ hasText: "E2E New User" })
    await userRow.click()
    await page.getByTestId("user-remove").click()
    await page.getByTestId("user-remove-confirm").click()

    await expect(page.getByText("E2E New User")).not.toBeVisible({ timeout: 10_000 })
  })
})
