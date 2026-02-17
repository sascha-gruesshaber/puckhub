import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Trikots Management", () => {
  test("create, update, and delete a trikot", async ({ page }) => {
    await login(page)
    await page.goto("/trikots")
    await expect(page.getByRole("heading", { name: "trikotsPage.title" })).toBeVisible({ timeout: 10_000 })

    // --- CREATE ---
    await page.getByRole("button", { name: "trikotsPage.actions.new" }).click()
    await page.getByLabel("trikotsPage.fields.name").fill("E2E Test Jersey")

    // Select the first template card (templates are seeded in global-setup)
    const templateGrid = page.locator(".grid.grid-cols-2")
    await templateGrid.locator("button").first().click()

    // Primary color is pre-filled (#1B365D), just submit
    await page.getByRole("button", { name: "create" }).click()

    // Verify trikot appears in list
    await expect(page.getByText("E2E Test Jersey")).toBeVisible({ timeout: 10_000 })

    // --- UPDATE ---
    const trikotRow = page.locator(".data-row", { hasText: "E2E Test Jersey" })
    await trikotRow.getByRole("button", { name: "trikotsPage.actions.edit" }).click()

    const nameInput = page.getByLabel("trikotsPage.fields.name")
    await nameInput.clear()
    await nameInput.fill("E2E Updated Jersey")
    await page.getByRole("button", { name: "save" }).click()

    // Verify updated name appears
    await expect(page.getByText("E2E Updated Jersey")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("E2E Test Jersey")).not.toBeVisible()

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Jersey" })
    await updatedRow.getByRole("button", { name: "trikotsPage.actions.delete" }).click()

    // Confirm in dialog
    await page.getByRole("button", { name: "trikotsPage.actions.delete" }).last().click()

    // Verify trikot is gone
    await expect(page.getByText("E2E Updated Jersey")).not.toBeVisible({ timeout: 10_000 })
  })
})
