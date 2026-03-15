import { expect, test } from "@playwright/test"

test.describe("Platform Auth Redirect", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/")

    // Should show either a login redirect or the "access denied" / loading state
    // Since the platform checks session and redirects to /login
    await expect(
      page
        .getByText(/login/i)
        .or(page.getByText(/Sign in/i))
        .or(page.getByText(/Access Denied/i)),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("organizations page requires authentication", async ({ page }) => {
    await page.goto("/organizations")

    // Should redirect to login or show access denied
    await expect(
      page
        .getByText(/login/i)
        .or(page.getByText(/Sign in/i))
        .or(page.getByText(/Access Denied/i)),
    ).toBeVisible({ timeout: 15_000 })
  })
})
