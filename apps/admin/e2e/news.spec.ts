import { expect, test } from "@playwright/test"
import { formField, login } from "./helpers"

test.describe("News Management", () => {
  test("news list shows seeded articles", async ({ page }) => {
    await login(page)
    await page.goto("/news")
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText("Season Kickoff")).toBeVisible()
    await expect(page.getByText("Trade Deadline Recap")).toBeVisible()
    await expect(page.getByText("Playoff Preview")).toBeVisible() // draft is visible in admin
  })

  test("create, edit, and delete a news article", async ({ page }) => {
    await login(page)
    await page.goto("/news")
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "newsPage.actions.new" }).click()

    // Should navigate to /news/new
    await expect(page).toHaveURL(/\/news\/new/)

    // Fill title
    await formField(page, "newsForm.fields.title").fill("E2E Test Article")

    // Fill content via rich text editor
    const editor = page.locator("[contenteditable]")
    await editor.click()
    await editor.fill("This is E2E test content for the news article.")

    // Select "published" mode
    await page.getByText("newsForm.publish.options.published.label").click()

    // Submit
    await page.getByRole("button", { name: "save" }).click()

    // Should redirect back to /news
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Verify article appears in list
    await expect(page.getByText("E2E Test Article")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const articleRow = page.locator(".data-row", { hasText: "E2E Test Article" })
    await articleRow.locator("[aria-label='newsPage.actions.edit']").click()

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/news\/.*\/edit/)

    // Change title
    const titleField = formField(page, "newsForm.fields.title")
    await titleField.clear()
    await titleField.fill("E2E Updated Article")

    await page.getByRole("button", { name: "save" }).click()

    // Should redirect back to /news
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText("E2E Updated Article")).toBeVisible({ timeout: 10_000 })

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Article" })
    await updatedRow.locator("[aria-label='newsPage.actions.delete']").click()

    // ConfirmDialog — click confirm button
    await page.getByRole("button", { name: "newsPage.actions.delete" }).last().click()

    await expect(page.getByText("E2E Updated Article")).not.toBeVisible({ timeout: 10_000 })
  })
})
