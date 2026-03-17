import { expect, test } from "@playwright/test"
import { resolve } from "node:path"
import { readFileSync, writeFileSync } from "node:fs"
import { login, clearApiLog, waitForMagicLink } from "./helpers"

const apiLogFile = resolve(import.meta.dirname, "../../../e2e/.e2e-api.log")

test.describe("Authentication", () => {
  test("redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })

  test("magic link login flow", async ({ page }) => {
    writeFileSync(apiLogFile, "")

    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    // Fill email and submit
    await page.getByLabel("login.email").fill("admin@test.local")
    await page.getByRole("button", { name: "login.magicLink.submit" }).click()

    // Should show "check your inbox" confirmation
    await expect(page.getByText("login.magicLink.checkInbox")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("login.magicLink.sentTo")).toBeVisible()

    // Resend button should be visible
    await expect(page.getByRole("button", { name: "login.magicLink.resend" })).toBeVisible()

    // Capture magic link from API logs and navigate to it
    const magicLinkUrl = await waitForMagicLink()
    expect(magicLinkUrl).toBeTruthy()

    // Navigate to magic link — verifies token, sets session, redirects to admin
    await page.goto(magicLinkUrl)
    await page.waitForLoadState("networkidle")

    // Platform admins see the org picker — select the E2E org
    const orgButton = page.getByRole("button", { name: /E2E Test League/ })
    if (await orgButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await orgButton.click()
    }

    // Should land on the dashboard (at /$orgSlug/ after org selection)
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/(e2e-league\/?)?$/)
  })

  test("show error with invalid email format", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    await page.getByLabel("login.email").fill("not-an-email")
    await page.getByRole("button", { name: "login.magicLink.submit" }).click()

    // The HTML5 email validation should prevent submission
    // The form should stay on the login page
    await expect(page).toHaveURL(/\/login/)
  })

  test("logout", async ({ page }) => {
    // Login first via magic link
    await login(page)

    // Open user dropdown in top bar, then click logout
    await page.locator(".topbar-user-trigger").click()
    await page.getByText("topBar.logout").click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
