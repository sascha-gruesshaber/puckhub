import { expect, test } from "@playwright/test"
import { adminPath, login } from "./helpers"

test.describe("Game Report", () => {
  test("completed game report shows header with teams and score", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for games to load
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Game rows are clickable and open the report page directly
    await page.locator(".data-row").first().click()
    await expect(page).toHaveURL(/\/games\/.*\/report/)

    // Completed game should show the reopen button
    await expect(page.getByRole("button", { name: "gameReport.reopenSection.button" })).toBeVisible()
  })

  test("scheduled game report allows completing the game", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for games to load
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Open a scheduled game row
    const scheduledGameRow = page.locator(".data-row", { hasText: "gamesPage.status.scheduled" }).first()
    await expect(scheduledGameRow).toBeVisible({ timeout: 10_000 })
    await scheduledGameRow.click()
    await expect(page).toHaveURL(/\/games\/.*\/report/)

    // Scheduled game should show the complete section
    await expect(page.getByRole("button", { name: "gameReport.completeSection.button" })).toBeVisible()
  })
})
