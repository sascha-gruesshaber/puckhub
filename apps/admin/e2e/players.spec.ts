import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Players Management", () => {
  test("create, update, and delete a player", async ({ page }) => {
    await login(page)
    await page.goto("/players")
    await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({ timeout: 10_000 })

    // --- CREATE ---
    await page.getByRole("button", { name: "playersPage.actions.new" }).click()
    await page.getByLabel("playersPage.fields.firstName").fill("E2E")
    await page.getByLabel("playersPage.fields.lastName").fill("Testplayer")
    await page.getByLabel("playersPage.fields.nationality").fill("DE")
    await page.getByRole("button", { name: "create" }).click()

    // Verify player appears in list
    await expect(page.getByText("Testplayer")).toBeVisible({ timeout: 10_000 })

    // --- UPDATE ---
    const playerRow = page.locator(".data-row", { hasText: "Testplayer" })
    await playerRow.getByRole("button", { name: "playersPage.actions.edit" }).click()

    const lastNameInput = page.getByLabel("playersPage.fields.lastName")
    await lastNameInput.clear()
    await lastNameInput.fill("Updatedplayer")
    await page.getByRole("button", { name: "save" }).click()

    // Verify updated name appears
    await expect(page.getByText("Updatedplayer")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Testplayer")).not.toBeVisible()

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "Updatedplayer" })
    await updatedRow.getByRole("button", { name: "playersPage.actions.delete" }).click()

    // Confirm in dialog
    await page.getByRole("button", { name: "playersPage.actions.delete" }).last().click()

    // Verify player is gone
    await expect(page.getByText("Updatedplayer")).not.toBeVisible({ timeout: 10_000 })
  })
})
