import { expect, test } from "@playwright/test"

test.describe("Landing Page", () => {
  test("hero section renders with PuckHub branding", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("PuckHub")).toBeVisible({ timeout: 15_000 })
  })

  test("features section is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("#features")).toBeVisible({ timeout: 15_000 })
  })

  test("pricing section loads with plan cards", async ({ page }) => {
    await page.goto("/")
    const pricing = page.locator("#pricing")
    await expect(pricing).toBeVisible({ timeout: 15_000 })

    // At least one plan should be visible (E2E Pro from seed)
    await expect(page.getByText("E2E Pro")).toBeVisible({ timeout: 10_000 })
  })

  test("footer renders with legal links", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /Impressum/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("link", { name: /Datenschutz/ })).toBeVisible()
  })

  test("demo CTA button exists", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("#demo")).toBeVisible({ timeout: 15_000 })
  })
})
