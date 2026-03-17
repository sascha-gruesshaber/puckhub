import { expect, test } from "@playwright/test"
import { adminPath, login } from "./helpers"

test.describe("Players Management", () => {
  test("players list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("players"))
    await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show seeded players
    await expect(page.getByText("Hawkins").first()).toBeVisible()
    await expect(page.getByText("Bradley").first()).toBeVisible()
  })

  test("create and update an unassigned player", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("players"))
    await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByTestId("players-new").click()

    await page.getByTestId("players-form-first-name").fill("E2E")
    await page.getByTestId("players-form-last-name").fill("TestPlayer")

    await page.getByTestId("players-form-submit").click()

    // New players are unassigned — select the unassigned filter in the team dropdown
    await page.locator("button.filter-pill").first().click()
    await page.getByRole("option", { name: "playersPage.filters.unassigned" }).click()

    await expect(page.getByText("TestPlayer")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const playerRow = page.getByTestId("player-row").filter({ hasText: "TestPlayer" })
    await playerRow.click()

    await expect(page).toHaveURL(/\/players\/.+/)
    await page.getByTestId("player-edit-info").click()

    const lastNameField = page.getByTestId("player-edit-last-name")
    await lastNameField.clear()
    await lastNameField.fill("UpdatedPlayer")

    await page.getByTestId("player-edit-submit").click()
    await expect(page.getByRole("heading", { name: "E2E UpdatedPlayer" })).toBeVisible({ timeout: 10_000 })
  })
})
