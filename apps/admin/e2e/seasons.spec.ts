import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Seasons Management", () => {
  test("roster page shows players assigned to teams", async ({ page }) => {
    await login(page)

    // Navigate to games first to ensure season context is loaded,
    // then navigate via sidebar to roster
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Navigate to roster via sidebar link
    await page.getByRole("link", { name: "nav.roster" }).click()

    // Roster page should load (may show season picker if not auto-selected)
    await expect(page.getByRole("heading", { name: "rosterPage.title" })).toBeVisible({
      timeout: 15_000,
    })

    // Should show team filter pills
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 10_000 })

    // Players should be visible (from seeded contracts)
    await expect(page.getByText("Hawkins")).toBeVisible({ timeout: 10_000 })
  })
})
