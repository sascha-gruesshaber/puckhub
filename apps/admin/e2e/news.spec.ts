import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("News Management", () => {
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

    // Should navigate to edit page for new article
    await page.getByLabel("newsPage.fields.title").fill("E2E Test Article")
    await page.getByLabel("newsPage.fields.shortText").fill("A test article created by E2E")
    await page.getByRole("button", { name: "save" }).click()

    // Navigate back to list
    await page.goto("/news")
    await expect(page.getByText("E2E Test Article")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const articleRow = page.locator(".data-row", { hasText: "E2E Test Article" })
    await articleRow.getByRole("button", { name: "newsPage.actions.edit" }).click()

    const titleInput = page.getByLabel("newsPage.fields.title")
    await titleInput.clear()
    await titleInput.fill("E2E Updated Article")
    await page.getByRole("button", { name: "save" }).click()

    await page.goto("/news")
    await expect(page.getByText("E2E Updated Article")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("E2E Test Article")).not.toBeVisible()

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Article" })
    await updatedRow.getByRole("button", { name: "newsPage.actions.delete" }).click()
    await page.getByRole("button", { name: "newsPage.actions.delete" }).last().click()

    await expect(page.getByText("E2E Updated Article")).not.toBeVisible({ timeout: 10_000 })
  })
})
