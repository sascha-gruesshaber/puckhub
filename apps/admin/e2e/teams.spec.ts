import { expect, test } from "@playwright/test"
import { adminPath, login } from "./helpers"

test.describe("Teams Management", () => {
  test("teams list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("teams"))
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show seeded teams
    await expect(page.getByText("E2E Hawks")).toBeVisible()
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("create and update an unassigned team", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("teams"))
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByTestId("teams-new").click()

    await page.getByTestId("teams-form-name").fill("E2E Test Team")
    await page.getByTestId("teams-form-short-name").fill("ETT")
    await page.getByTestId("teams-form-city").fill("Test City")

    await page.getByTestId("teams-form-submit").click()

    // New teams aren't in any division — select the unassigned filter
    await page.locator("button.filter-pill").first().click()
    await page.getByRole("option", { name: "teamsPage.filters.unassigned" }).click()

    await expect(page.getByText("E2E Test Team")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const teamRow = page.getByTestId("team-row").filter({ hasText: "E2E Test Team" })
    await teamRow.click()

    await expect(page).toHaveURL(/\/teams\/.+/)
    await page.getByTestId("team-edit").click()

    const nameField = page.getByTestId("team-edit-name")
    await nameField.clear()
    await nameField.fill("E2E Updated Team")

    await page.getByTestId("team-edit-submit").click()
    await expect(page.getByText("E2E Updated Team")).toBeVisible({ timeout: 10_000 })
  })
})
