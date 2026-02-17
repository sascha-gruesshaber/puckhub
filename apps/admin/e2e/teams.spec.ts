import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Teams Management", () => {
  test("create, update, and delete a team", async ({ page }) => {
    await login(page)
    await page.goto("/teams")
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({ timeout: 10_000 })

    // --- CREATE ---
    await page.getByRole("button", { name: "teamsPage.actions.new" }).click()
    await page.getByLabel("teamsPage.fields.name").fill("E2E Test Eagles")
    await page.getByLabel("teamsPage.fields.shortName").fill("ETE")
    await page.getByLabel("teamsPage.fields.city").fill("Teststadt")
    await page.getByRole("button", { name: "create" }).click()

    // Verify team appears in list
    await expect(page.getByText("E2E Test Eagles")).toBeVisible({ timeout: 10_000 })

    // --- UPDATE ---
    const teamRow = page.locator(".data-row", { hasText: "E2E Test Eagles" })
    await teamRow.getByRole("button", { name: "teamsPage.actions.edit" }).click()

    const nameInput = page.getByLabel("teamsPage.fields.name")
    await nameInput.clear()
    await nameInput.fill("E2E Test Hawks")
    await page.getByRole("button", { name: "save" }).click()

    // Verify updated name appears
    await expect(page.getByText("E2E Test Hawks")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("E2E Test Eagles")).not.toBeVisible()

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Test Hawks" })
    await updatedRow.getByRole("button", { name: "teamsPage.actions.delete" }).click()

    // Confirm in dialog
    await page.getByRole("button", { name: "teamsPage.actions.delete" }).last().click()

    // Verify team is gone
    await expect(page.getByText("E2E Test Hawks")).not.toBeVisible({ timeout: 10_000 })
  })
})
