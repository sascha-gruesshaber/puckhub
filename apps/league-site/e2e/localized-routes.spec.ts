import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe.skip("Localized Routes", () => {
  test("/tabelle renders same content as /standings", async ({ page }) => {
    await page.goto(`/tabelle${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("/spielplan renders same content as /schedule", async ({ page }) => {
    await page.goto(`/spielplan${q}`)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("BRS").first()).toBeVisible()
  })

  test("/neuigkeiten renders same content as /news (home page)", async ({ page }) => {
    // News on league-site is shown on home page; /neuigkeiten is a separate route
    await page.goto(`/neuigkeiten${q}`)
    // Should show published articles
    await expect(page.getByText("Season Kickoff")).toBeVisible({ timeout: 15_000 })
  })

  test("/statistiken/scorer renders same content as /stats/scorers", async ({ page }) => {
    await page.goto(`/statistiken/scorer${q}`)
    await expect(page.getByText("Hawkins").first()).toBeVisible({ timeout: 15_000 })
  })
})
