import { expect, test } from "@playwright/test"
import { adminPath, formField, login } from "./helpers"

test.describe("Pages Management", () => {
  test("pages list shows system routes and custom pages", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Default tab is main_nav — system routes should be visible (wait for data to load)
    await expect(page.locator("h3", { hasText: "Standings" }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("h3", { hasText: "Schedule" }).first()).toBeVisible()

    // Switch to footer tab to see custom pages
    await page.getByText("pagesPage.tabs.footerNav").click()
    await expect(page.locator("h3", { hasText: "About Us" })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("h3", { hasText: "Legal Notice" })).toBeVisible()
  })

  test("create, edit, and delete a custom page", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "pagesPage.actions.new" }).click()

    // Should navigate to /pages/new
    await expect(page).toHaveURL(/\/pages\/new/)

    // Fill title
    await formField(page, "pageForm.fields.title").fill("E2E Test Page")

    // Fill content via rich text editor
    const editor = page.locator("[contenteditable]")
    await editor.click()
    await editor.fill("This is E2E test content for the custom page.")

    // Select "published" status
    await page.getByText("published").click()

    // Select footer menu location
    await page.getByText("pageForm.fields.footer").click()

    // Submit
    await page.getByRole("button", { name: "save" }).click()

    // Should redirect back to /pages
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Switch to footer tab to find the new page
    await page.getByText("pagesPage.tabs.footerNav").click()
    await expect(page.locator("h3", { hasText: "E2E Test Page" })).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const pageRow = page.locator(".data-row", { hasText: "E2E Test Page" })
    await pageRow.locator("[aria-label='pagesPage.actions.edit']").click()

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/pages\/.*\/edit/)

    // Change title
    const titleField = formField(page, "pageForm.fields.title")
    await titleField.clear()
    await titleField.fill("E2E Updated Page")

    await page.getByRole("button", { name: "save" }).click()

    // Should redirect back to /pages
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Switch to footer tab to verify
    await page.getByText("pagesPage.tabs.footerNav").click()
    await expect(page.locator("h3", { hasText: "E2E Updated Page" })).toBeVisible({ timeout: 10_000 })

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Page" })
    await updatedRow.locator("[aria-label='pagesPage.actions.delete']").click()

    // ConfirmDialog — click confirm button
    await page.getByRole("button", { name: "pagesPage.actions.delete" }).last().click()

    await expect(page.locator("h3", { hasText: "E2E Updated Page" })).not.toBeVisible({ timeout: 10_000 })
  })

  test("system routes cannot be deleted", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for system routes to load
    await expect(page.locator("h3", { hasText: "Standings" }).first()).toBeVisible({ timeout: 10_000 })

    // Find the "Standings" system route row and assert no delete button
    const standingsRow = page.locator(".data-row", { hasText: "Standings" }).first()
    await expect(standingsRow).toBeVisible()
    await expect(standingsRow.locator("[aria-label='pagesPage.actions.delete']")).toHaveCount(0)
  })
})
