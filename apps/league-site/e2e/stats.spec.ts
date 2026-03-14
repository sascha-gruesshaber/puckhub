import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe.skip("Stats", () => {
  test("scorers page shows player stats", async ({ page }) => {
    await page.goto(`/stats/scorers${q}`)

    // Should show player names from seed
    await expect(page.getByText("Hawkins").first()).toBeVisible({ timeout: 15_000 })
  })

  test("goalies page shows goalie stats", async ({ page }) => {
    await page.goto(`/stats/goalies${q}`)

    // Should show goalie names from seed
    await expect(page.getByText("Garrett").or(page.getByText("Novak"))).toBeVisible({
      timeout: 15_000,
    })
  })

  test("penalties page shows penalty stats", async ({ page }) => {
    await page.goto(`/stats/penalties${q}`)

    // Page should load without error
    await expect(page.locator("body")).toBeVisible({ timeout: 15_000 })
    // Dalton has 2 PIM from seed
    await expect(page.getByText("Dalton").or(page.getByText("PIM").first())).toBeVisible()
  })
})
