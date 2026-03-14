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

  test.skip("magic link login flow", async ({ page }) => {
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

    // Should land on the dashboard (org auto-selects for single-org user)
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL("/")
  })

  test("show error with invalid email format", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("login.email").fill("not-an-email")
    await page.getByRole("button", { name: "login.magicLink.submit" }).click()

    // The HTML5 email validation should prevent submission
    // The form should stay on the login page
    await expect(page).toHaveURL(/\/login/)
  })

  test.skip("logout", async ({ page }) => {
    // Login first via magic link
    await login(page)

    // Logout
    await page.getByTitle("logout").click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
