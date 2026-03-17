import { expect, test } from "@playwright/test"
import { adminPath, formField, login } from "./helpers"

test.describe("Trikots Management", () => {
  test("create, update, and delete a trikot", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("trikots"))
    await expect(page.getByRole("heading", { name: "trikotsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "trikotsPage.actions.new" }).click()

    // Fill name
    await formField(page, "trikotsPage.fields.name").fill("E2E Test Trikot")

    // Select the one-color template
    await page.getByText("trikotsPage.templateNames.oneColor").click()

    // Primary color should be available — fill it
    await formField(page, "trikotsPage.fields.primaryColor").fill("#FF0000")

    await page.getByRole("button", { name: "create" }).click()

    // Verify trikot appears in list
    await expect(page.getByText("E2E Test Trikot")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const trikotRow = page.locator(".data-row", { hasText: "E2E Test Trikot" })
    await trikotRow.click()

    // Change name
    const nameField = formField(page, "trikotsPage.fields.name")
    await nameField.clear()
    await nameField.fill("E2E Updated Trikot")

    await page.getByRole("button", { name: "save" }).click()

    // Verify updated name
    await expect(page.getByText("E2E Updated Trikot")).toBeVisible({ timeout: 10_000 })

    // --- DELETE ---
    await page.locator(".data-row", { hasText: "E2E Updated Trikot" }).click()
    await page.getByRole("button", { name: "trikotsPage.actions.delete" }).first().click()

    // ConfirmDialog — click the confirm/delete button
    await page.getByRole("button", { name: "trikotsPage.actions.delete" }).last().click()

    await expect(page.getByText("E2E Updated Trikot")).not.toBeVisible({ timeout: 10_000 })
  })
})
