import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe("News", () => {
  test("published articles visible on home, draft not visible", async ({ page }) => {
    await page.goto(`/${q}`)

    await expect(page.getByText("Season Kickoff")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Trade Deadline Recap")).toBeVisible()
    await expect(page.getByText("Playoff Preview")).not.toBeVisible()
  })

  test("clicking article navigates to detail page", async ({ page }) => {
    await page.goto(`/${q}`)
    await expect(page.getByText("Season Kickoff")).toBeVisible({ timeout: 15_000 })

    await page.getByRole("link", { name: /Season Kickoff/ }).click()

    // Detail page should show the article title and content
    await expect(page.getByRole("heading", { name: /Season Kickoff/ })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText("Welcome to the E2E Test League season")).toBeVisible()
  })

  test("article detail page has back navigation", async ({ page }) => {
    await page.goto(`/${q}`)
    await expect(page.getByText("Season Kickoff")).toBeVisible({ timeout: 15_000 })

    await page.getByRole("link", { name: /Season Kickoff/ }).click()
    await expect(page.getByRole("heading", { name: /Season Kickoff/ })).toBeVisible({
      timeout: 10_000,
    })

    // Click back link
    await page.getByRole("link", { name: /Back|Zurück/ }).click()
    await expect(page.getByText("E2E Test League")).toBeVisible({ timeout: 10_000 })
  })
})
