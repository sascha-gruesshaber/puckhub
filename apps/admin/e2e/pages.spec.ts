import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Pages Management", () => {
  test("pages list shows system routes and custom pages", async ({ page }) => {
    await login(page)
    await page.goto("/pages")
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // System routes
    await expect(page.getByText("Home")).toBeVisible()
    await expect(page.getByText("Standings")).toBeVisible()
    await expect(page.getByText("Schedule")).toBeVisible()

    // Custom pages
    await expect(page.getByText("About Us")).toBeVisible()
    await expect(page.getByText("Legal Notice")).toBeVisible()
  })

  test("create, edit, and delete a custom page", async ({ page }) => {
    await login(page)
    await page.goto("/pages")
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "pagesPage.actions.new" }).click()

    await page.getByLabel("pagesPage.fields.title").fill("E2E Test Page")
    await page.getByRole("button", { name: "create" }).click()

    // Should navigate to edit page — go back to list
    await page.goto("/pages")
    await expect(page.getByText("E2E Test Page")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const pageRow = page.locator(".data-row", { hasText: "E2E Test Page" })
    await pageRow.getByRole("button", { name: "pagesPage.actions.edit" }).click()

    const titleInput = page.getByLabel("pagesPage.fields.title")
    await titleInput.clear()
    await titleInput.fill("E2E Updated Page")
    await page.getByRole("button", { name: "save" }).click()

    await page.goto("/pages")
    await expect(page.getByText("E2E Updated Page")).toBeVisible({ timeout: 10_000 })

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Page" })
    await updatedRow.getByRole("button", { name: "pagesPage.actions.delete" }).click()
    await page.getByRole("button", { name: "pagesPage.actions.delete" }).last().click()

    await expect(page.getByText("E2E Updated Page")).not.toBeVisible({ timeout: 10_000 })
  })

  test("system routes cannot be deleted", async ({ page }) => {
    await login(page)
    await page.goto("/pages")
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // System route rows should not have a delete button
    const homeRow = page.locator(".data-row", { hasText: "Home" })
    await expect(homeRow.getByRole("button", { name: "pagesPage.actions.delete" })).not.toBeVisible()
  })
})
