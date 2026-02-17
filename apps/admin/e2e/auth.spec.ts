import { expect, test } from "@playwright/test"

test.describe("Authentication", () => {
  test("redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login with valid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("login.email").fill("admin@test.local")
    await page.getByLabel("login.password").fill("test1234")
    await page.getByRole("button", { name: "login.submit" }).click()

    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL("/")
  })

  test("show error with invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("login.email").fill("admin@test.local")
    await page.getByLabel("login.password").fill("wrongpassword")
    await page.getByRole("button", { name: "login.submit" }).click()

    await expect(page.getByText(/invalid|fehlgeschlagen/i)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("logout", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByLabel("login.email").fill("admin@test.local")
    await page.getByLabel("login.password").fill("test1234")
    await page.getByRole("button", { name: "login.submit" }).click()

    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 15_000,
    })

    // Logout
    await page.getByTitle("logout").click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
