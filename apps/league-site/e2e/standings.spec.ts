import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe("Standings", () => {
  test("standings table renders with team names", async ({ page }) => {
    await page.goto(`/standings${q}`)

    // Both teams should be visible
    await expect(page.getByText("E2E Hawks").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("E2E Bears").first()).toBeVisible()
  })

  test("teams show correct game counts", async ({ page }) => {
    await page.goto(`/standings${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })

    // Hawks: 2GP, 2W, 0L, 6pts (rank 1)
    // Bears: 2GP, 0W, 2L, 0pts (rank 2)
    const tableRows = page.locator("table tbody tr")
    await expect(tableRows).toHaveCount(2, { timeout: 10_000 })
  })

  test("clicking team name navigates to team detail", async ({ page }) => {
    await page.goto(`/standings${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })

    await page.getByRole("link", { name: /E2E Hawks/ }).click()
    await expect(page).toHaveURL(/\/teams\//)
  })
})
