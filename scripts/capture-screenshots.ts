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

import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
process.loadEnvFile(resolve(__dirname, "../.env"))

const ADMIN_URL = process.env.ADMIN_URL ?? "http://admin.puckhub.localhost"
const API_URL = process.env.API_URL ?? "http://api.puckhub.localhost"
const LEAGUE_SITE_URL = process.env.LEAGUE_SITE_URL ?? "http://demo-league.puckhub.localhost"
const SUBDOMAIN_SUFFIX = process.env.SUBDOMAIN_SUFFIX ?? ".puckhub.localhost"
const DEMO_ORG_SLUG = process.env.DEMO_ORG_SLUG ?? "demo-league"
const EMAIL = process.env.DEMO_EMAIL ?? `admin@demo-league${SUBDOMAIN_SUFFIX}`
const OUTPUT_DIR = resolve(__dirname, "../apps/marketing-site/public/screenshots")

if (existsSync(OUTPUT_DIR)) {
  const old = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".png"))
  if (old.length > 0) {
    console.log(`Cleaning ${old.length} old screenshots...`)
    for (const file of old) unlinkSync(resolve(OUTPUT_DIR, file))
  }
} else {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

interface ScreenshotTarget {
  name: string
  baseUrl: "admin" | "league"
  path: string
  waitFor?: string
  delay?: number
}

// Admin portal screenshots (paths include org slug)
const adminTargets: ScreenshotTarget[] = [
  { name: "dashboard", baseUrl: "admin", path: `/${DEMO_ORG_SLUG}`, waitFor: "main", delay: 3000 },
  { name: "game-report", baseUrl: "admin", path: `/${DEMO_ORG_SLUG}/games`, waitFor: "main", delay: 2000 },
  { name: "team-list", baseUrl: "admin", path: `/${DEMO_ORG_SLUG}/teams`, waitFor: "main", delay: 2000 },
  { name: "website-config", baseUrl: "admin", path: `/${DEMO_ORG_SLUG}/website`, waitFor: "main", delay: 2000 },
  { name: "trikot-designer", baseUrl: "admin", path: `/${DEMO_ORG_SLUG}/trikots`, waitFor: "main", delay: 2500 },
  { name: "pages-cms", baseUrl: "admin", path: `/${DEMO_ORG_SLUG}/pages`, waitFor: "main", delay: 2000 },
]

// Admin portal screenshots (require auth)
const adminExtraTargets: ScreenshotTarget[] = [
  {
    name: "public-report-admin",
    baseUrl: "admin",
    path: `/${DEMO_ORG_SLUG}/games/public-reports`,
    waitFor: "main",
    delay: 3000,
  },
]

// Public league site screenshots
const leagueTargets: ScreenshotTarget[] = [
  { name: "league-standings", baseUrl: "league", path: "/standings", waitFor: "main", delay: 3000 },
  { name: "league-stats", baseUrl: "league", path: "/stats/scorers", waitFor: "main", delay: 4000 },
  { name: "league-schedule", baseUrl: "league", path: "/schedule", waitFor: "main", delay: 3000 },
  { name: "league-home", baseUrl: "league", path: "/", waitFor: "main", delay: 3000 },
  // goalie-stats captured separately below (needs extra wait for lazy-loaded ECharts)
  { name: "season-structure", baseUrl: "league", path: "/structure", waitFor: "main", delay: 3000 },
]

function getBaseUrl(type: "admin" | "league") {
  return type === "admin" ? ADMIN_URL : LEAGUE_SITE_URL
}

async function captureTarget(page: import("playwright").Page, target: ScreenshotTarget) {
  const url = `${getBaseUrl(target.baseUrl)}${target.path}`
  console.log(`Capturing ${target.name} (${url})...`)

  try {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
    } catch (navErr) {
      // NS_BINDING_ABORTED occurs in Firefox when a redirect interrupts navigation
      // (common with SPA routers that do client-side redirects after initial load)
      if (String(navErr).includes("NS_BINDING_ABORTED")) {
        console.log(`  Navigation redirect detected, waiting for page to settle...`)
        await page.waitForTimeout(3000)
      } else {
        throw navErr
      }
    }

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
  page.on("requestfailed", (req) =>
    consoleMsgs.push(`[FAILED] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`),
  )

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
    await context.addCookies([
      {
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: `.${COOKIE_DOMAIN}`,
        path: "/",
        sameSite: "None",
        secure: false,
      },
    ])
    console.log(`  Cookie overridden: SameSite=None on .${COOKIE_DOMAIN}`)
  }

  // Navigate to admin dashboard to verify session.
  // The first load sometimes redirects to login before the async session check
  // completes, so we retry once if needed.
  await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded", timeout: 20000 })
  await page.waitForTimeout(5000)

  let currentUrl = page.url()
  if (currentUrl.includes("/login")) {
    console.log("Session not yet recognized on first load, retrying...")
    await page.goto(`${ADMIN_URL}/${DEMO_ORG_SLUG}`, { waitUntil: "domcontentloaded", timeout: 20000 })
    await page.waitForTimeout(5000)
    currentUrl = page.url()
  }

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
    await captureTarget(page, target)
  }

  // AI game recap — find a completed game that has a seeded recap
  try {
    console.log("\nCapturing ai-game-recap...")

    // Query the DB directly for a game with recap content
    const { createPrismaClientWithUrl } = await import("../packages/db/src/index")
    const db = createPrismaClientWithUrl(process.env.DATABASE_URL!)
    const gameWithRecap = await db.game.findFirst({
      where: { recapTitle: { not: null }, organization: { slug: "demo-league" } },
      select: { id: true },
    })
    await db.$disconnect()

    if (gameWithRecap) {
      const url = `${LEAGUE_SITE_URL}/schedule/${gameWithRecap.id}`
      console.log(`  Navigating to game with recap: ${gameWithRecap.id}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(4000)

      // Scroll to the AI recap section (it's below the fold)
      const recapSection = page.locator("text=/recap|Spielbericht|zusammenfassung/i").first()
      if (await recapSection.count()) {
        await recapSection.scrollIntoViewIfNeeded()
        await page.waitForTimeout(1000)
      }

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
      await page.goto(`${ADMIN_URL}/${DEMO_ORG_SLUG}/seasons/${bestSeason.id}/structure`, {
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

      // Zoom in one step using the React Flow zoom-in control button
      const zoomInBtn = page.locator(".react-flow__controls-zoomin").first()
      if (await zoomInBtn.count()) {
        await zoomInBtn.click()
        await page.waitForTimeout(600)
        await zoomInBtn.click()
        await page.waitForTimeout(600)
        console.log("  Zoomed in 2 steps")
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

  // ─── Additional admin screenshots ──────────────────────────────────

  console.log("\n=== Additional Admin Screenshots ===\n")
  for (const target of adminExtraTargets) {
    await captureTarget(page, target)
  }

  // ─── League site screenshots ────────────────────────────────────────

  console.log("\n=== League Site Screenshots ===\n")
  for (const target of leagueTargets) {
    await captureTarget(page, target)
  }

  // ─── Goalie stats screenshot (needs extra wait for lazy-loaded charts) ──

  try {
    console.log("\nCapturing goalie-stats...")
    const url = `${LEAGUE_SITE_URL}/stats/goalies`
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })

    try {
      await page.waitForSelector("main", { timeout: 10000 })
    } catch {
      // continue
    }

    // Wait for lazy-loaded ECharts to render (the chart is inside a Suspense boundary
    // that shows an animate-pulse skeleton while loading)
    await page.waitForTimeout(3000)
    // Wait until the pulse skeleton disappears (chart has rendered)
    try {
      await page.waitForFunction(() => !document.querySelector(".animate-pulse"), { timeout: 8000 })
    } catch {
      console.log("  Warning: chart skeleton still visible, taking screenshot anyway")
    }
    await page.waitForTimeout(1000)

    const outputPath = resolve(OUTPUT_DIR, "goalie-stats.png")
    await page.screenshot({ path: outputPath, fullPage: false })
    console.log(`  Saved: ${outputPath}`)
  } catch (err) {
    console.error("  Error capturing goalie-stats:", (err as Error).message)
  }

  // ─── Player detail screenshot ────────────────────────────────────────

  try {
    console.log("\nCapturing player-detail...")

    const { createPrismaClientWithUrl: createDbPlayer } = await import("../packages/db/src/index")
    const dbPlayer = createDbPlayer(process.env.DATABASE_URL!)
    const playerWithStats = await dbPlayer.playerSeasonStat.findFirst({
      where: { player: { organization: { slug: "demo-league" } } },
      orderBy: { goals: "desc" },
      select: { playerId: true, player: { select: { firstName: true, lastName: true } } },
    })
    await dbPlayer.$disconnect()

    if (playerWithStats) {
      const url = `${LEAGUE_SITE_URL}/stats/players/${playerWithStats.playerId}`
      console.log(`  Navigating to player: ${playerWithStats.player.firstName} ${playerWithStats.player.lastName}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(4000)

      const outputPath = resolve(OUTPUT_DIR, "player-detail.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  No players with stats found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing player-detail:", (err as Error).message)
  }

  // ─── Team comparison screenshot ────────────────────────────────────

  try {
    console.log("\nCapturing team-comparison...")

    const { createPrismaClientWithUrl: createDbTeamComp } = await import("../packages/db/src/index")
    const dbTeamComp = createDbTeamComp(process.env.DATABASE_URL!)
    const teamsForComparison = await dbTeamComp.team.findMany({
      where: { organization: { slug: "demo-league" } },
      select: { id: true, name: true, shortName: true },
      take: 3,
    })
    await dbTeamComp.$disconnect()

    if (teamsForComparison.length >= 2) {
      const url = `${LEAGUE_SITE_URL}/stats/compare-teams`
      console.log(`  Comparing teams: ${teamsForComparison.map((t) => t.shortName ?? t.name).join(", ")}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(4000)

      // The TeamComparisonSelector uses a Radix Popover dropdown.
      // After selecting a team the popover state can be unpredictable,
      // so we close it explicitly after each selection and reopen fresh.
      for (const team of teamsForComparison.slice(0, 3)) {
        // Ensure any previously open popover is closed
        await page.locator("body").click({ position: { x: 10, y: 10 } })
        await page.waitForTimeout(300)

        const addBtn = page.getByRole("button", { name: /add team|team hinzufügen/i })
        if (!(await addBtn.count())) {
          console.log(`  "Add team" button not found, skipping remaining teams`)
          break
        }
        await addBtn.click()
        await page.waitForTimeout(500)

        const teamOption = page.getByRole("option", { name: team.name })
        if (await teamOption.count()) {
          await teamOption.click()
          console.log(`  Selected team: ${team.shortName ?? team.name}`)
          await page.waitForTimeout(500)
        } else {
          console.log(`  Team option "${team.name}" not found in dropdown, skipping`)
        }
      }

      // Close dropdown if still open
      await page.locator("body").click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(300)

      // Wait for lazy-loaded charts to render
      await page.waitForTimeout(4000)
      try {
        await page.waitForFunction(() => !document.querySelector(".animate-pulse"), { timeout: 8000 })
      } catch {
        console.log("  Warning: chart skeleton still visible")
      }
      await page.waitForTimeout(1000)

      const outputPath = resolve(OUTPUT_DIR, "team-comparison.png")
      await page.screenshot({ path: outputPath, fullPage: false })
      console.log(`  Saved: ${outputPath}`)
    } else {
      console.log("  Not enough teams for comparison, skipping")
    }
  } catch (err) {
    console.error("  Error capturing team-comparison:", (err as Error).message)
  }

  // ─── Public report form screenshot ─────────────────────────────────

  try {
    console.log("\nCapturing public-report-form...")

    // Enable public reports on the demo org's plan and settings
    const { createPrismaClientWithUrl: createDbReport } = await import("../packages/db/src/index")
    const dbReport = createDbReport(process.env.DATABASE_URL!)

    const demoOrg = await dbReport.organization.findFirst({
      where: { slug: "demo-league" },
      select: { id: true },
    })

    if (demoOrg) {
      // Enable featurePublicReports on the org's plan
      const sub = await dbReport.orgSubscription.findFirst({
        where: { organizationId: demoOrg.id, status: "active" },
        select: { planId: true },
      })
      if (sub) {
        await dbReport.plan.update({
          where: { id: sub.planId },
          data: { featurePublicReports: true },
        })
        console.log("  Enabled featurePublicReports on demo plan")
      }

      // Enable publicReportsEnabled in system settings
      await dbReport.systemSettings.updateMany({
        where: { organizationId: demoOrg.id },
        data: {
          publicReportsEnabled: true,
          publicReportsRequireEmail: true,
          publicReportsBotDetection: true,
        },
      })
      console.log("  Enabled publicReportsEnabled in system settings")
    }

    const scheduledGame = await dbReport.game.findFirst({
      where: {
        organization: { slug: "demo-league" },
        status: { in: ["scheduled", "postponed"] },
      },
      select: { id: true },
    })
    await dbReport.$disconnect()

    if (scheduledGame) {
      const url = `${LEAGUE_SITE_URL}/schedule/${scheduledGame.id}`
      console.log(`  Navigating to game: ${scheduledGame.id}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })
      await page.waitForTimeout(4000)

      // The PublicReportButton contains t.publicReport.title:
      // "Submit Result" (en) or "Ergebnis melden" (de)
      const reportBtn = page
        .locator("button")
        .filter({ hasText: /submit result|ergebnis melden/i })
        .first()

      if (await reportBtn.count()) {
        // Screenshot 1: game detail page showing the "Submit Result" CTA button
        await reportBtn.scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)
        const formPath = resolve(OUTPUT_DIR, "public-report-form.png")
        await page.screenshot({ path: formPath, fullPage: false })
        console.log(`  Saved: ${formPath}`)

        // Screenshot 2: the opened slide-in panel with form fields
        console.log("\nCapturing public-report-otp...")
        await reportBtn.click()
        await page.waitForTimeout(1500)

        const otpPath = resolve(OUTPUT_DIR, "public-report-otp.png")
        await page.screenshot({ path: otpPath, fullPage: false })
        console.log(`  Saved: ${otpPath}`)
      } else {
        console.log("  Public report button not found, skipping")
        console.log("  (Check that public reports are enabled on the plan and in settings)")
      }
    } else {
      console.log("  No scheduled games found, skipping")
    }
  } catch (err) {
    console.error("  Error capturing public-report-form:", (err as Error).message)
  }

  await browser.close()
  console.log("\nDone! Screenshots saved to:", OUTPUT_DIR)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
