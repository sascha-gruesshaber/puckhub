import { expect, test } from "@playwright/test"
import { formField, login } from "./helpers"

test.describe("Teams Management", () => {
  test("teams list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto("/teams")
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show seeded teams
    await expect(page.getByText("E2E Hawks")).toBeVisible()
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("create, update, and delete a team", async ({ page }) => {
    await login(page)
    await page.goto("/teams")
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "teamsPage.actions.new" }).click()

    await formField(page, "teamsPage.fields.name").fill("E2E Test Team")
    await formField(page, "teamsPage.fields.shortName").fill("ETT")
    await formField(page, "teamsPage.fields.city").fill("Test City")

    await page.getByRole("button", { name: "create" }).click()

    // New teams aren't in any division — use unassigned filter to find them
    await page.getByRole("button", { name: "teamsPage.filters.unassigned" }).click()

    await expect(page.getByText("E2E Test Team")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const teamRow = page.locator(".data-row", { hasText: "E2E Test Team" })
    await teamRow.locator("[aria-label='teamsPage.actions.edit']").click()

    const nameField = formField(page, "teamsPage.fields.name")
    await nameField.clear()
    await nameField.fill("E2E Updated Team")

    await page.getByRole("button", { name: "save" }).click()

    await expect(page.getByText("E2E Updated Team")).toBeVisible({ timeout: 10_000 })

    // --- DELETE (RemoveDialog 2-step) ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Team" })
    await updatedRow.locator("[aria-label='teamsPage.actions.delete']").click()

    // Step 1: Click "Delete permanently..." option
    await page.getByRole("button", { name: "teamsPage.removeDialog.delete.button" }).click()

    // Step 2: Confirm deletion
    await page.getByRole("button", { name: "teamsPage.removeDialog.delete.confirmButton" }).click()

    await expect(page.getByText("E2E Updated Team")).not.toBeVisible({ timeout: 10_000 })
  })
})
