import { expect, test } from "@playwright/test"

test.describe.skip("Legal Pages", () => {
  test("Datenschutz page loads with correct heading", async ({ page }) => {
    await page.goto("/datenschutz")
    await expect(
      page.getByRole("heading", { name: /Datenschutzerklärung/ }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("Impressum page loads with correct heading", async ({ page }) => {
    await page.goto("/impressum")
    await expect(page.getByRole("heading", { name: /Impressum/ })).toBeVisible({
      timeout: 15_000,
    })
  })

  test("back link navigates to landing page", async ({ page }) => {
    await page.goto("/datenschutz")
    await expect(
      page.getByRole("heading", { name: /Datenschutzerklärung/ }),
    ).toBeVisible({ timeout: 15_000 })

    await page.getByRole("link", { name: /Zurück/ }).click()
    await expect(page).toHaveURL("/")
  })
})
