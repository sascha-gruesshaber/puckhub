import { expect, test } from "@playwright/test"
import { adminPath, formField, login } from "./helpers"

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

  test("create, update, and delete a player", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("players"))
    await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "playersPage.actions.new" }).click()

    await formField(page, "playersPage.fields.firstName").fill("E2E")
    await formField(page, "playersPage.fields.lastName").fill("TestPlayer")

    await page.getByRole("button", { name: "create" }).click()

    // New players are unassigned — use filter to find them
    await page.getByRole("button", { name: "playersPage.filters.unassigned" }).click()

    await expect(page.getByText("TestPlayer")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const playerRow = page.locator(".data-row", { hasText: "TestPlayer" })
    await playerRow.locator("[aria-label='playersPage.actions.edit']").click()

    const lastNameField = formField(page, "playersPage.fields.lastName")
    await lastNameField.clear()
    await lastNameField.fill("UpdatedPlayer")

    await page.getByRole("button", { name: "save" }).click()

    await expect(page.getByText("UpdatedPlayer")).toBeVisible({ timeout: 10_000 })

    // --- DELETE (RemoveDialog 2-step) ---
    const updatedRow = page.locator(".data-row", { hasText: "UpdatedPlayer" })
    await updatedRow.locator("[aria-label='playersPage.actions.delete']").click()

    // Step 1: Click "Delete permanently..." option
    await page.getByRole("button", { name: "playersPage.removeDialog.delete.button" }).click()

    // Step 2: Confirm deletion
    await page.getByRole("button", { name: "playersPage.removeDialog.delete.confirmButton" }).click()

    await expect(page.getByText("UpdatedPlayer")).not.toBeVisible({ timeout: 10_000 })
  })
})
