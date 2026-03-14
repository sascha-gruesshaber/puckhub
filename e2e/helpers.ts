import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const apiLogFile = resolve(import.meta.dirname, ".e2e-api.log")

/**
 * Polls the API log file for a magic link URL.
 * The API logs `[Email] Link: <url>` when SMTP is not configured.
 */
export async function waitForMagicLink(timeoutMs = 15_000): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const content = readFileSync(apiLogFile, "utf-8")
    const match = content.match(/\[Email\] Link: (.+)/)
    if (match) return match[1]!.trim()
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error("Magic link URL not found in API logs within timeout")
}

/**
 * Clears the API log file so that we only capture fresh magic links.
 */
export function clearApiLog() {
  writeFileSync(apiLogFile, "")
}

/**
 * Logs into the admin app via magic link.
 *
 * Flow:
 * 1. Clear API log file (so we capture the fresh magic link)
 * 2. Navigate to /login
 * 3. Fill email and submit
 * 4. Read the magic link URL from API logs
 * 5. Navigate to the magic link (Better Auth verifies token, sets cookie, redirects)
 * 6. Wait for the dashboard to load (org auto-selects since there's only one)
 */
export async function login(page: Page) {
  clearApiLog()

  await page.goto("/login")

  // Wait for React hydration to complete before interacting
  // (SSR renders the form HTML but event handlers aren't attached until hydration)
  await page.waitForLoadState("networkidle")

  // Fill email and submit (labels show raw i18n keys with VITE_LOCALE=raw)
  await page.getByLabel("login.email").fill("admin@test.local")
  await page.getByRole("button", { name: "login.magicLink.submit" }).click()

  // Wait for the "check inbox" confirmation to appear
  await expect(page.getByText("login.magicLink.checkInbox")).toBeVisible({ timeout: 10_000 })

  // Capture the magic link from API server logs
  const magicLinkUrl = await waitForMagicLink()

  // Navigate to the magic link — Better Auth verifies token, sets session cookie, redirects to admin
  await page.goto(magicLinkUrl)

  // Wait for the dashboard (org auto-selects when user belongs to exactly one org)
  await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
    timeout: 15_000,
  })
}

/** E2E org ID — matches seed data */
export const E2E_ORG_ID = "e2e-org-id"

/**
 * Builds a league-site URL with `?orgId` appended (needed for localhost E2E).
 */
export function leaguePath(path: string): string {
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}orgId=${E2E_ORG_ID}`
}
