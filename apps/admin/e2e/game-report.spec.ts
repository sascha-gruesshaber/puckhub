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

    // Click report on first game (completed games appear first)
    await page.locator("[aria-label='gamesPage.actions.report']").first().click()

    // Verify report page loaded with team info
    await expect(page.getByText("HWK")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("BRS")).toBeVisible()

    // Completed game should show the reopen button
    await expect(page.getByText("gameReport.reopenSection.button")).toBeVisible()
  })

  test("scheduled game report allows completing the game", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for games to load
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Filter to show only scheduled games
    await page.getByRole("button", { name: "gamesPage.filters.allStatus" }).click()
    await page.getByRole("option", { name: "gamesPage.status.scheduled" }).click()

    // Click report on the scheduled game
    const reportBtn = page.locator("[aria-label='gamesPage.actions.report']").first()
    await expect(reportBtn).toBeVisible({ timeout: 10_000 })
    await reportBtn.click()

    // Verify report page loaded
    await expect(page.getByText("HWK")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("BRS")).toBeVisible()

    // Scheduled game should show the complete section
    await expect(page.getByText("gameReport.completeSection.button")).toBeVisible()
  })
})
