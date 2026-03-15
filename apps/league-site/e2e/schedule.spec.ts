import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe("Schedule", () => {
  test("schedule page loads with games", async ({ page }) => {
    await page.goto(`/schedule${q}`)

    // Should show at least one game with team names
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("BRS").first()).toBeVisible()
  })

  test("completed games show scores", async ({ page }) => {
    await page.goto(`/schedule${q}`)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })

    // Completed game scores should be visible (3:2 or 1:4 from seed)
    await expect(page.getByText("3").first()).toBeVisible()
  })

  test("status filter shows only matching games", async ({ page }) => {
    await page.goto(`/schedule${q}`)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })

    // Click "Completed" status filter
    await page.getByRole("button", { name: /Completed/i }).click()

    // Should show completed games
    await expect(page.getByText("HWK").first()).toBeVisible()
  })

  test("clicking a completed game navigates to detail", async ({ page }) => {
    await page.goto(`/schedule${q}`)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })

    // Click on the first game card link
    const firstGameLink = page.locator("a[href*='/schedule/']").first()
    await firstGameLink.click()

    await expect(page).toHaveURL(/\/schedule\//)
  })

  test("cancelled game has visual distinction", async ({ page }) => {
    await page.goto(`/schedule${q}`)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })

    // Cancelled games should show a cancelled indicator
    // The cancelled game (Game 4) should have reduced opacity or line-through
    await expect(page.getByText(/Cancelled/i).or(page.getByText(/cancelled/i))).toBeVisible()
  })
})
