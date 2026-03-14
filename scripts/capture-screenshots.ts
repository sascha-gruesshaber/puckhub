/**
 * Capture marketing screenshots from the running demo.
 *
 * Automatically reseeds the demo database before capturing to ensure
 * fresh, consistent data (AI recaps, standings, stats, etc.).
 *
 * Prerequisites:
 *   - The full dev stack must be running (pnpm dev)
 *   - DATABASE_URL must be set (reads from .env)
 *
 * Usage:
 *   pnpm capture:screenshots            # reseed + capture
 *   pnpm capture:screenshots --no-seed  # skip reseed, capture only
 */

import { existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
process.loadEnvFile(resolve(__dirname, "../.env"))

const ADMIN_URL = process.env.ADMIN_URL ?? "http://admin.puckhub.localhost"
const API_URL = process.env.API_URL ?? "http://api.puckhub.localhost"
const LEAGUE_SITE_URL = process.env.LEAGUE_SITE_URL ?? "http://demo-league.puckhub.localhost"
const SUBDOMAIN_SUFFIX = process.env.SUBDOMAIN_SUFFIX ?? ".puckhub.localhost"
const EMAIL = process.env.DEMO_EMAIL ?? `admin@demo-league${SUBDOMAIN_SUFFIX}`
const OUTPUT_DIR = resolve(__dirname, "../apps/marketing-site/public/screenshots")

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

interface ScreenshotTarget {
  name: string
  baseUrl: "admin" | "league"
  path: string
  waitFor?: string
  delay?: number
}

// Admin portal screenshots
const adminTargets: ScreenshotTarget[] = [
  { name: "dashboard", baseUrl: "admin", path: "/", waitFor: "main", delay: 3000 },
  { name: "game-report", baseUrl: "admin", path: "/games", waitFor: "main", delay: 2000 },
  { name: "team-list", baseUrl: "admin", path: "/teams", waitFor: "main", delay: 2000 },
  { name: "website-config", baseUrl: "admin", path: "/website", waitFor: "main", delay: 2000 },
  { name: "trikot-designer", baseUrl: "admin", path: "/trikots", waitFor: "main", delay: 2500 },
  { name: "pages-cms", baseUrl: "admin", path: "/pages", waitFor: "main", delay: 2000 },
]

// Public league site screenshots
const leagueTargets: ScreenshotTarget[] = [
  { name: "league-standings", baseUrl: "league", path: "/standings", waitFor: "main", delay: 3000 },
  { name: "league-stats", baseUrl: "league", path: "/standings", waitFor: "main", delay: 4000 },
  { name: "league-schedule", baseUrl: "league", path: "/schedule", waitFor: "main", delay: 3000 },
  { name: "league-home", baseUrl: "league", path: "/", waitFor: "main", delay: 3000 },
]

function getBaseUrl(type: "admin" | "league") {
  return type === "admin" ? ADMIN_URL : LEAGUE_SITE_URL
}

async function reseedDemo() {
  const { createPrismaClientWithUrl } = await import("../packages/db/src/index")
  const { runSeed } = await import("../packages/db/src/seed/index")
  const { seedDemoOrg } = await import("../packages/db/src/seed/demoSeed")

  const db = createPrismaClientWithUrl(process.env.DATABASE_URL!)

  console.log("Reseeding reference data...")
  await runSeed(db)

  console.log("Reseeding demo organization...")
  await seedDemoOrg(db)

  await db.$disconnect()
  console.log("Reseed complete.\n")
}

async function main() {
  const skipSeed = process.argv.includes("--no-seed")

  if (!skipSeed) {
    await reseedDemo()
  } else {
    console.log("Skipping reseed (--no-seed flag)\n")
  }

  // Use Firefox because Chromium treats .localhost as a public suffix,
  // preventing cross-subdomain cookies needed for admin auth.
  const { firefox } = await import("playwright")
  console.log("Launching Firefox...")
  const browser = await firefox.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "en-US",
  })
  const page = await context.newPage()

  // Collect browser console messages for debugging
  const consoleMsgs: string[] = []
  page.on("console", (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`))
  page.on("requestfailed", (req) => consoleMsgs.push(`[FAILED] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`))

  // Login via demo-login API endpoint (magic link bypass for demo).
  // Navigate the browser to the API domain and call demo-login as same-origin
  // so the Set-Cookie header is accepted by the browser natively.
  console.log(`Logging in via demo-login API as ${EMAIL}...`)
  await page.goto(`${API_URL}/api/health`, { waitUntil: "load", timeout: 30000 })

  const loginOk = await page.evaluate(async (email: string) => {
    const res = await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    })
    return res.ok
  }, EMAIL)

  if (!loginOk) {
    console.error("Demo login failed")
    await browser.close()
    process.exit(1)
  }
  console.log("Demo login successful.")

  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "puckhub.localhost"
  // Override SameSite to None so the cookie is sent on cross-origin fetch
  // from admin.puckhub.localhost to api.puckhub.localhost (useSession check).
  const cookies = await context.cookies()
  const sessionCookie = cookies.find((c) => c.name === "better-auth.session_token")
  if (sessionCookie) {
    await context.clearCookies()
    await context.addCookies([{
      name: sessionCookie.name,
      value: sessionCookie.value,
      domain: `.${COOKIE_DOMAIN}`,
      path: "/",
      sameSite: "None",
      secure: false,
    }])
    console.log(`  Cookie overridden: SameSite=None on .${COOKIE_DOMAIN}`)
  }

  // Navigate to admin dashboard to verify session
  await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded", timeout: 20000 })
  await page.waitForTimeout(5000)

  const currentUrl = page.url()
  if (currentUrl.includes("/login")) {
    console.error("Session not recognized by admin app — still on login page")
    const debugPath = resolve(OUTPUT_DIR, "_debug-login-failure.png")
    await page.screenshot({ path: debugPath, fullPage: true })
    console.log("Continuing with league-site screenshots only...")
  } else {
    console.log(`Session active. Current URL: ${currentUrl}\n`)
  }

  // ─── Admin portal screenshots ───────────────────────────────────────

  console.log("=== Admin Portal Screenshots ===\n")
  for (const target of adminTargets) {
    const url = `${getBaseUrl(target.baseUrl)}${target.path}`
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

  // AI game recap — find a completed game that has a seeded recap
  try {
    console.log("\nCapturing ai-game-recap...")

    // Query the DB directly for a game with recap content
    const { createPrismaClientWithUrl } = await import("../packages/db/src/index")
    const db = createPrismaClientWithUrl(process.env.DATABASE_URL!)
    const gameWithRecap = await db.game.findFirst({
      where: { recapTitle: { not: null } },
      select: { id: true },
    })
    await db.$disconnect()

    if (gameWithRecap) {
      const url = `${LEAGUE_SITE_URL}/schedule/${gameWithRecap.id}`
      console.log(`  Navigating to game with recap: ${gameWithRecap.id}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(4000)

      const outputPath = resolve(OUTPUT_DIR, "ai-game-recap.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  No games with recap found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing ai-game-recap:", (err as Error).message)
  }

  // Team history — find a team and capture the Saisonverlauf tab
  try {
    console.log("\nCapturing team-history...")

    const { createPrismaClientWithUrl: createDbHistory } = await import("../packages/db/src/index")
    const dbHistory = createDbHistory(process.env.DATABASE_URL!)
    const teamForHistory = await dbHistory.team.findFirst({
      where: { organization: { slug: "demo-league" } },
      select: { id: true, name: true },
    })
    await dbHistory.$disconnect()

    if (teamForHistory) {
      const url = `${LEAGUE_SITE_URL}/teams/${teamForHistory.id}?tab=history`
      console.log(`  Navigating to team history: ${teamForHistory.name}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(5000)

      const outputPath = resolve(OUTPUT_DIR, "team-history.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  No teams found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing team-history:", (err as Error).message)
  }

  // Season structure builder — pick the season with the most divisions for visual impact
  try {
    console.log("\nCapturing season-builder...")

    // Find the season with the most divisions directly from the DB
    const { createPrismaClientWithUrl: createDb2 } = await import("../packages/db/src/index")
    const db2 = createDb2(process.env.DATABASE_URL!)
    const allSeasons = await db2.season.findMany({
      where: { organization: { slug: "demo-league" } },
      select: { id: true, name: true, _count: { select: { divisions: true } } },
    })
    await db2.$disconnect()

    const bestSeason = allSeasons.sort((a, b) => b._count.divisions - a._count.divisions)[0]

    if (bestSeason) {
      console.log(`  Using season "${bestSeason.name}" (${bestSeason._count.divisions} divisions)`)
      await page.goto(`${ADMIN_URL}/seasons/${bestSeason.id}/structure`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      })

      try {
        await page.waitForSelector(".react-flow", { timeout: 8000 })
      } catch {
        console.log("  Warning: React Flow canvas not found")
      }
      await page.waitForTimeout(3000)

      // Collapse the right-side structure elements panel
      const collapseBtn = page.locator("button[style*='right: 320']").first()
      if (await collapseBtn.count()) {
        await collapseBtn.click()
        await page.waitForTimeout(800)
      }

      const outputPath = resolve(OUTPUT_DIR, "season-builder.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  No seasons found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing season-builder:", (err as Error).message)
  }

  // ─── League site screenshots ────────────────────────────────────────

  console.log("\n=== League Site Screenshots ===\n")
  for (const target of leagueTargets) {
    const url = `${getBaseUrl(target.baseUrl)}${target.path}`
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

  await browser.close()
  console.log("\nDone! Screenshots saved to:", OUTPUT_DIR)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
