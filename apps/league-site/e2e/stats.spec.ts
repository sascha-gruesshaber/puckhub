import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe("Stats", () => {
  test("scorers page shows player stats", async ({ page }) => {
    await page.goto(`/stats/scorers${q}`)

    // Should show player names from seed
    await expect(page.getByText("Hawkins").first()).toBeVisible({ timeout: 15_000 })
  })

  test("goalies page shows goalie stats", async ({ page }) => {
    await page.goto(`/stats/goalies${q}`)

    // Should show goalie names from seed
    await expect(page.getByRole("link", { name: /Sam Garrett/ })).toBeVisible({
      timeout: 15_000,
    })
  })

  test("penalties page shows penalty stats", async ({ page }) => {
    await page.goto(`/stats/penalties${q}`)

    // Page should load without error
    await expect(page.locator("body")).toBeVisible({ timeout: 15_000 })
    // Dalton has 2 PIM from seed
    await expect(page.getByRole("link", { name: /Nick Dalton/ })).toBeVisible()
  })

  test("compare-teams page allows selecting teams via dropdown", async ({ page }) => {
    await page.goto(`/stats/compare-teams${q}`)

    // Should show the "Add team" button
    const addBtn = page.getByTestId("compare-teams-add-team")
    await expect(addBtn).toBeVisible({ timeout: 15_000 })

    // Select first team via dropdown
    await addBtn.click()
    await expect(page.getByTestId("compare-teams-option-hwk")).toBeVisible()
    await page.getByTestId("compare-teams-option-hwk").click()

    // Hawks should appear as a selected chip with an X button
    await expect(page.getByTestId("compare-teams-chip-hwk")).toBeVisible()

    // Select second team
    await addBtn.click()
    await page.getByTestId("compare-teams-option-brs").click()

    // Bears chip should appear
    await expect(page.getByTestId("compare-teams-chip-brs")).toBeVisible()

    // Charts should now render (at least one SVG from ECharts)
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 })

    // Remove Hawks via the X button on its chip
    const hawksChip = page.getByTestId("compare-teams-chip-hwk")
    await page.getByTestId("compare-teams-remove-hwk").click()

    // HWK chip should disappear, hint text should show
    await expect(hawksChip).not.toBeVisible()
    await expect(page.getByText(/select at least/i)).toBeVisible()
  })
})
