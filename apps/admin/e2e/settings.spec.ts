import { expect, test } from "@playwright/test"
import { formField, login } from "./helpers"

test.describe("Settings", () => {
  test("settings page loads with seeded league name", async ({ page }) => {
    await login(page)
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "settings.title" })).toBeVisible({
      timeout: 10_000,
    })

    // League name should be pre-filled with seeded data
    const nameInput = formField(page, "settings.leagueName")
    await expect(nameInput).toHaveValue("E2E Test League")
  })

  test("change league name persists after navigation", async ({ page }) => {
    await login(page)
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "settings.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Change league name
    const nameInput = formField(page, "settings.leagueName")
    await nameInput.clear()
    await nameInput.fill("E2E Updated League")
    await page.getByRole("button", { name: "save" }).click()

    // Wait for save to complete
    await page.waitForLoadState("networkidle")

    // Navigate away
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Navigate back to settings
    await page.goto("/settings")
    const nameInput2 = formField(page, "settings.leagueName")
    await expect(nameInput2).toHaveValue("E2E Updated League")

    // Restore original name for other tests
    await nameInput2.clear()
    await nameInput2.fill("E2E Test League")
    await page.getByRole("button", { name: "save" }).click()
    await page.waitForLoadState("networkidle")
  })
})
