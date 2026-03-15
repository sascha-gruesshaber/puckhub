import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe("Teams", () => {
  test("teams page shows both teams", async ({ page }) => {
    await page.goto(`/teams${q}`)

    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("team detail page shows roster", async ({ page }) => {
    await page.goto(`/teams${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })

    await page.getByRole("link", { name: /E2E Hawks/ }).click()

    // Detail page should show team info
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Teststadt")).toBeVisible()

    // Roster should show players
    await expect(page.getByText("Hawkins")).toBeVisible()
    await expect(page.getByText("Garrett")).toBeVisible() // goalie
  })

  test("team detail shows venue", async ({ page }) => {
    await page.goto(`/teams${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })

    await page.getByRole("link", { name: /E2E Hawks/ }).click()
    await expect(page.getByText("Eishalle Teststadt")).toBeVisible({ timeout: 10_000 })
  })
})
