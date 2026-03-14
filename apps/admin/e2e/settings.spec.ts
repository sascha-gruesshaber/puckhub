import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Settings", () => {
  test("settings page loads with seeded league name", async ({ page }) => {
    await login(page)
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "settingsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // League name should be pre-filled with seeded data
    const nameInput = page.getByLabel("settingsPage.fields.leagueName")
    await expect(nameInput).toHaveValue("E2E Test League")
  })

  test("change league name persists after navigation", async ({ page }) => {
    await login(page)
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "settingsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Change league name
    const nameInput = page.getByLabel("settingsPage.fields.leagueName")
    await nameInput.clear()
    await nameInput.fill("E2E Updated League")
    await page.getByRole("button", { name: "save" }).click()

    // Navigate away
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Navigate back to settings
    await page.goto("/settings")
    await expect(page.getByLabel("settingsPage.fields.leagueName")).toHaveValue(
      "E2E Updated League",
    )

    // Restore original name for other tests
    await nameInput.clear()
    await nameInput.fill("E2E Test League")
    await page.getByRole("button", { name: "save" }).click()
  })
})
