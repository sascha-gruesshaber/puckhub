import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe.skip("Home Page", () => {
  test("renders with league name", async ({ page }) => {
    await page.goto(`/${q}`)
    await expect(page.getByText("E2E Test League")).toBeVisible({ timeout: 15_000 })
  })

  test("shows published news articles", async ({ page }) => {
    await page.goto(`/${q}`)
    await expect(page.getByText("Season Kickoff")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Trade Deadline Recap")).toBeVisible()
  })

  test("does not show draft articles", async ({ page }) => {
    await page.goto(`/${q}`)
    // Wait for page to load
    await expect(page.getByText("E2E Test League")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Playoff Preview")).not.toBeVisible()
  })

  test("standings sidebar shows both teams", async ({ page }) => {
    await page.goto(`/${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })
})
