import { expect, test } from "@playwright/test"

test.describe("Platform Auth Redirect", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    // Intercept the admin login redirect so the browser doesn't navigate to an unreachable host
    await page.route("http://localhost:4000/**", (route) =>
      route.fulfill({ status: 200, body: "<html><body>Login</body></html>", contentType: "text/html" }),
    )

    await page.goto("/")

    // The platform detects no session and redirects to the admin login page
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test("organizations page requires authentication", async ({ page }) => {
    await page.route("http://localhost:4000/**", (route) =>
      route.fulfill({ status: 200, body: "<html><body>Login</body></html>", contentType: "text/html" }),
    )

    await page.goto("/organizations")

    // Should redirect to admin login when not authenticated
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })
})
