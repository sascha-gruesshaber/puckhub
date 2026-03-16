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

  test("compare-teams page allows selecting teams via dropdown", async ({ page }) => {
    await page.goto(`/stats/compare-teams${q}`)

    // Should show the "Add team" button
    const addBtn = page.getByRole("button", { name: /add team/i })
    await expect(addBtn).toBeVisible({ timeout: 15_000 })

    // Select first team via dropdown
    await addBtn.click()
    await expect(page.getByRole("option", { name: "E2E Hawks" })).toBeVisible()
    await page.getByRole("option", { name: "E2E Hawks" }).click()

    // Hawks should appear as a selected chip with an X button
    await expect(page.getByText("HWK")).toBeVisible()

    // Select second team
    await addBtn.click()
    await page.getByRole("option", { name: "E2E Bears" }).click()

    // Bears chip should appear
    await expect(page.getByText("BRS")).toBeVisible()

    // Charts should now render (at least one SVG from ECharts)
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 })

    // Remove Hawks via the X button on its chip
    const hawksChip = page.locator("span", { hasText: "HWK" })
    await hawksChip.getByRole("button").click()

    // HWK chip should disappear, hint text should show
    await expect(hawksChip).not.toBeVisible()
    await expect(page.getByText(/select at least/i)).toBeVisible()
  })
})
