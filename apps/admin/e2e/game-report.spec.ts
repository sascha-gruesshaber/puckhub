import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Game Report", () => {
  test("completed game report shows header with teams and score", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Click report button on a completed game
    const completedRow = page.locator(".data-row", { hasText: "3 : 2" })
    await completedRow.getByRole("button", { name: "gamesPage.actions.report" }).click()

    // Verify report page shows both teams
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("E2E Bears")).toBeVisible()

    // Score should be visible
    await expect(page.getByText("3")).toBeVisible()
    await expect(page.getByText("2")).toBeVisible()
  })

  test("scheduled game report allows completing the game", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Filter to scheduled games
    await page.getByRole("button", { name: "gamesPage.status.scheduled" }).click()

    // Open report for the scheduled game
    const scheduledRow = page.locator(".data-row").first()
    await scheduledRow.getByRole("button", { name: "gamesPage.actions.report" }).click()

    // Should see report page with lineup tab
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 10_000 })

    // Complete game button should be present
    await expect(
      page.getByRole("button", { name: "gameReport.actions.complete" }),
    ).toBeVisible()
  })
})
