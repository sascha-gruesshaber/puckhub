import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Seasons Management", () => {
  test("roster page shows players assigned to teams", async ({ page }) => {
    await login(page)

    // Click roster link in sidebar (season-scoped link)
    await page.getByRole("link", { name: "sidebar.items.roster" }).click()

    // Verify roster page loads with seeded player names
    await expect(page.getByText("Hawkins")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Bradley")).toBeVisible()
    await expect(page.getByText("Garrett")).toBeVisible()
  })
})
