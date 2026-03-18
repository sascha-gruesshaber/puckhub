import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

const apiLogFile = resolve(import.meta.dirname, ".e2e-api.log")
const stateFile = resolve(import.meta.dirname, ".e2e-state.json")
let cachedE2EDatabaseUrl: string | null = null

/**
 * Polls the API log file for a magic link URL.
 * The API logs `[Email] Link: <url>` when SMTP is not configured.
 */
export async function waitForMagicLink(timeoutMs = 15_000): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const content = readFileSync(apiLogFile, "utf-8")
    const matches = [...content.matchAll(/\[Email\] Link: (.+)/g)]
    const latestMatch = matches.at(-1)
    if (latestMatch) return latestMatch[1]!.trim()
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

function getE2EDatabaseUrl() {
  if (cachedE2EDatabaseUrl) {
    return cachedE2EDatabaseUrl
  }

  if (!existsSync(stateFile)) {
    throw new Error(`E2E state file not found at ${stateFile}`)
  }

  const state = JSON.parse(readFileSync(stateFile, "utf-8")) as { dbUrl?: string }
  if (!state.dbUrl) {
    throw new Error("E2E database URL missing from state file")
  }

  cachedE2EDatabaseUrl = state.dbUrl
  return cachedE2EDatabaseUrl
}

export async function withE2EDb<T>(fn: (sql: ReturnType<typeof import("postgres").default>) => Promise<T>): Promise<T> {
  const postgres = (await import("postgres")).default
  const sql = postgres(getE2EDatabaseUrl(), { max: 1 })

  try {
    return await fn(sql)
  } finally {
    await sql.end()
  }
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
  await page.waitForLoadState("networkidle")

  // Platform admins see the org picker — select the E2E org (navigates to /$orgSlug/)
  const orgButton = page.getByRole("button", { name: /E2E Test League/ })
  if (await orgButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await orgButton.click()
  }

  // Normalize to the org dashboard explicitly so tests start from a stable post-login route.
  await page.goto(`/${E2E_ORG_SLUG}/`)
  await page.waitForLoadState("networkidle")

  // Wait for the dashboard to load (now at /$orgSlug/)
  await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({
    timeout: 15_000,
  })
}

/**
 * Locates the input inside a FormField by its label text.
 * FormField components don't use htmlFor/id linking, so we locate
 * the label, go to its parent container, and find the input there.
 */
export function formField(page: Page, labelKey: string) {
  return page
    .locator("label", { hasText: labelKey })
    .locator("xpath=..")
    .locator("input:not([type='hidden']), textarea")
    .last()
}

/** E2E org ID - matches seed data */
export const E2E_ORG_ID = "e2e-org-id"

/** E2E admin user ID - matches seed data */
export const E2E_ADMIN_USER_ID = "e2e-admin-id"

/** E2E org slug - matches seed data */
export const E2E_ORG_SLUG = "e2e-league"

/**
 * Builds a league-site URL with `?orgId` appended (needed for localhost E2E).
 */
export function leaguePath(path: string): string {
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}orgId=${E2E_ORG_ID}`
}
