/**
 * Capture marketing screenshots from the running admin demo.
 *
 * Prerequisites:
 *   - The full dev stack must be running (pnpm dev)
 *   - Demo data must be seeded
 *   - Set DEMO_EMAIL and DEMO_PASSWORD env vars (or uses defaults)
 *
 * Usage:
 *   pnpm capture:screenshots
 */

import { chromium } from "playwright"
import { existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.ADMIN_URL ?? "http://admin.puckhub.localhost"
const SUBDOMAIN_SUFFIX = process.env.SUBDOMAIN_SUFFIX ?? ".puckhub.localhost"
const EMAIL = process.env.DEMO_EMAIL ?? `admin@demo-league${SUBDOMAIN_SUFFIX}`
const PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234"
const OUTPUT_DIR = resolve(__dirname, "../apps/marketing-site/public/screenshots")

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

interface ScreenshotTarget {
  name: string
  path: string
  waitFor?: string
  delay?: number
}

const targets: ScreenshotTarget[] = [
  { name: "dashboard", path: "/", waitFor: "main", delay: 3000 },
  { name: "game-report", path: "/games", waitFor: "main", delay: 2000 },
  { name: "team-list", path: "/teams", waitFor: "main", delay: 2000 },
  { name: "player-stats", path: "/stats", waitFor: "main", delay: 2000 },
  { name: "standings", path: "/standings", waitFor: "main", delay: 2000 },
  { name: "website-config", path: "/website", waitFor: "main", delay: 2000 },
  { name: "trikot-designer", path: "/trikots", waitFor: "main", delay: 2500 },
]

async function main() {
  console.log("Launching browser...")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  // Collect browser console messages for debugging
  const consoleMsgs: string[] = []
  page.on("console", (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`))
  page.on("requestfailed", (req) => consoleMsgs.push(`[FAILED] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`))

  // Login
  console.log(`Logging in to ${BASE_URL} as ${EMAIL}...`)
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 30000 })

  // Wait for the login form to render
  await page.waitForSelector("#email", { timeout: 15000 })

  // Wait for React hydration — the form's onSubmit handler must be attached
  // before we click submit, otherwise a native form POST happens instead.
  console.log("Waiting for React hydration...")
  await page.waitForFunction(
    () => {
      const form = document.querySelector("form")
      if (!form) return false
      return Object.keys(form).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      )
    },
    { timeout: 30000 },
  )
  console.log("Hydrated.")

  await page.fill("#email", EMAIL)
  await page.fill("#password", PASSWORD)
  await page.click('button[type="submit"]')

  // Wait until we leave /login (redirected to dashboard or org picker)
  try {
    await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 30000 })
  } catch {
    // Login didn't redirect — dump diagnostics
    console.error("\nLogin failed — page did not redirect away from /login")
    console.error(`Current URL: ${page.url()}`)
    const errorText = await page.locator("[role=alert], .text-destructive, .error-message").first().textContent().catch(() => null)
    if (errorText) console.error(`Error on page: ${errorText}`)
    if (consoleMsgs.length) {
      console.error("\nBrowser console/network:")
      for (const m of consoleMsgs) console.error(`  ${m}`)
    }
    const debugPath = resolve(OUTPUT_DIR, "_debug-login-failure.png")
    await page.screenshot({ path: debugPath, fullPage: true })
    console.error(`\nDebug screenshot saved: ${debugPath}`)
    await browser.close()
    process.exit(1)
  }

  // Give the app time to fully load after redirect
  await page.waitForTimeout(3000)

  console.log(`Logged in. Current URL: ${page.url()}\n`)

  // Capture each page
  for (const target of targets) {
    const url = `${BASE_URL}${target.path}`
    console.log(`Capturing ${target.name} (${url})...`)

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })

      if (target.waitFor) {
        try {
          await page.waitForSelector(target.waitFor, { timeout: 10000 })
        } catch {
          console.log(`  Warning: selector "${target.waitFor}" not found, taking screenshot anyway`)
        }
      }

      if (target.delay) {
        await page.waitForTimeout(target.delay)
      }

      const outputPath = resolve(OUTPUT_DIR, `${target.name}.png`)
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } catch (err) {
      console.error(`  Error capturing ${target.name}:`, (err as Error).message)
    }
  }

  // Team history — navigate into first team's history page
  try {
    console.log("\nCapturing team-history...")
    await page.goto(`${BASE_URL}/teams`, { waitUntil: "domcontentloaded", timeout: 20000 })
    await page.waitForTimeout(2000)

    const teamLink = page.locator("a[href*='/teams/']").first()
    if (await teamLink.count()) {
      await teamLink.click()
      await page.waitForTimeout(2000)

      // Navigate to the history tab
      const historyLink = page.locator("a[href*='/history']").first()
      if (await historyLink.count()) {
        await historyLink.click()
        await page.waitForTimeout(3000)
      }

      const outputPath = resolve(OUTPUT_DIR, "team-history.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  No teams found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing team-history:", (err as Error).message)
  }

  // Season structure builder — navigate into first season
  try {
    console.log("\nCapturing season-builder...")
    await page.goto(`${BASE_URL}/seasons`, { waitUntil: "domcontentloaded", timeout: 20000 })
    await page.waitForTimeout(2000)

    const seasonLink = page.locator("a[href*='/seasons/']").first()
    if (await seasonLink.count()) {
      await seasonLink.click()
      await page.waitForTimeout(3000)

      // Check if we landed on the structure page or need to click into it
      try {
        await page.waitForSelector(".react-flow", { timeout: 8000 })
      } catch {
        // Try clicking a "structure" tab/link if available
        const structureLink = page.locator("a[href*='/structure']").first()
        if (await structureLink.count()) {
          await structureLink.click()
          await page.waitForTimeout(2000)
        }
      }

      await page.waitForTimeout(2000)
      const outputPath = resolve(OUTPUT_DIR, "season-builder.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  No seasons found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing season-builder:", (err as Error).message)
  }

  await browser.close()
  console.log("\nDone! Screenshots saved to:", OUTPUT_DIR)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
