import { expect, test } from "@playwright/test"
import { adminPath, login } from "./helpers"

test.describe("Settings", () => {
  test("settings page loads with seeded league name", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("settings"))
    await expect(page.getByRole("heading", { name: "settings.title" })).toBeVisible({
      timeout: 10_000,
    })

    // League name should be pre-filled with seeded data
    const nameInput = page.getByTestId("settings-league-name")
    await expect(nameInput).toHaveValue("E2E Test League")
  })

  test("change league name persists after navigation", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("settings"))
    await expect(page.getByRole("heading", { name: "settings.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Change league name
    const nameInput = page.getByTestId("settings-league-name")
    const saveButton = page.getByTestId("settings-save")
    await nameInput.clear()
    await nameInput.fill("E2E Updated League")
    const saveResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes("settings.update"),
      { timeout: 10_000 },
    )
    await saveButton.click()
    const saveResult = await saveResponse
    const saveError = saveResult.ok() ? "" : await saveResult.text()
    expect(saveResult.ok(), saveError).toBeTruthy()

    // Navigate away
    await page.goto(adminPath(""))
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Navigate back to settings
    await page.goto(adminPath("settings"))
    const nameInput2 = page.getByTestId("settings-league-name")
    await expect(nameInput2).toHaveValue("E2E Updated League")

    // Restore original name for other tests
    await nameInput2.clear()
    await nameInput2.fill("E2E Test League")
    const restoreResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes("settings.update"),
      { timeout: 10_000 },
    )
    await saveButton.click()
    const restoreResult = await restoreResponse
    const restoreError = restoreResult.ok() ? "" : await restoreResult.text()
    expect(restoreResult.ok(), restoreError).toBeTruthy()
  })
})
