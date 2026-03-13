#!/usr/bin/env node
// Start the full PuckHub stack locally and run smoke tests.
//
// Usage:
//   node scripts/docker-test.mjs          # start, test, stop
//   node scripts/docker-test.mjs --keep   # start, test, keep running
//   node scripts/docker-test.mjs --down   # tear down (remove volumes too)
//   node scripts/docker-test.mjs --logs   # show logs from running stack

import { execSync, execFileSync } from "node:child_process"

const COMPOSE = "docker compose -f docker-compose.local.yml"
const run = (cmd, opts) => execSync(cmd, { stdio: "inherit", ...opts })
const quiet = (cmd) => execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim()

const args = process.argv.slice(2)
const keep = args.includes("--keep") || args.includes("-k")

if (args.includes("--down") || args.includes("-d")) {
  run(`${COMPOSE} down -v`)
  console.log("Stack removed.")
  process.exit(0)
}
if (args.includes("--logs") || args.includes("-l")) {
  run(`${COMPOSE} logs -f`)
  process.exit(0)
}

// Preflight: check images exist
for (const img of ["puckhub-api", "puckhub-admin", "puckhub-platform", "puckhub-league-site", "puckhub-marketing-site"]) {
  try { quiet(`docker image inspect ${img}:local`) }
  catch { console.error(`Image ${img}:local not found. Run: pnpm docker:build`); process.exit(1) }
}

// Start
console.log("Starting local stack...")
run(`${COMPOSE} up -d`)

// Wait for health
console.log("\nWaiting for services to become healthy...")
const services = ["api", "admin", "platform", "league-site", "marketing-site"]
for (const svc of services) {
  process.stdout.write(`  ${svc.padEnd(15)}`)
  const timeout = 120_000
  const start = Date.now()
  while (true) {
    try {
      const json = quiet(`${COMPOSE} ps --format json ${svc}`)
      const parsed = JSON.parse(json.split("\n")[0])
      if (parsed.Health === "healthy") { console.log("healthy"); break }
    } catch {}
    if (Date.now() - start > timeout) {
      console.log(`TIMEOUT (${timeout / 1000}s)`)
      console.log(`\n  Last 30 lines of ${svc} logs:`)
      run(`${COMPOSE} logs --tail=30 ${svc}`)
      process.exit(1)
    }
    execSync("node -e \"setTimeout(()=>{},3000)\"", { stdio: "ignore" })
  }
}

// Smoke tests
console.log("\n━━━ Smoke Tests ━━━")
let pass = 0, fail = 0

function check(name, url, expect) {
  try {
    const status = quiet(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}"`)
    if (status === expect) {
      console.log(`  ${name.padEnd(30)} OK (HTTP ${status})`)
      pass++
    } else {
      console.log(`  ${name.padEnd(30)} FAIL (expected ${expect}, got ${status})`)
      fail++
    }
  } catch {
    console.log(`  ${name.padEnd(30)} FAIL (connection error)`)
    fail++
  }
}

check("API health (via Caddy)", "http://api.puckhub.localhost/api/health", "200")
check("Admin UI (via Caddy)", "http://admin.puckhub.localhost/", "200")
check("Platform UI (via Caddy)", "http://platform.puckhub.localhost/", "200")
check("Marketing Site (via Caddy)", "http://puckhub.localhost/", "200")

console.log(`\nResults: ${pass} passed, ${fail} failed`)

if (fail > 0) {
  console.log(`\nCheck service logs with: pnpm docker:test -- --logs`)
  if (!keep) run(`${COMPOSE} down`)
  process.exit(1)
}

if (keep) {
  console.log(`
Stack is running. Access:
  Admin:      http://admin.puckhub.localhost
  API:        http://api.puckhub.localhost/api/health
  Platform:   http://platform.puckhub.localhost
  Marketing:  http://puckhub.localhost

  Default login: admin@puckhub.local / admin123

  Logs:  pnpm docker:test -- --logs
  Stop:  pnpm docker:test:down`)
} else {
  run(`${COMPOSE} down`)
  console.log("Stack stopped.")
}
