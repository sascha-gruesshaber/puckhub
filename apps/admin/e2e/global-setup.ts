import { type ChildProcess, execSync, spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const adminRoot = resolve(__dirname, "..")
const monorepoRoot = resolve(adminRoot, "../..")
const stateFile = resolve(__dirname, ".e2e-state.json")

const E2E_DB = "puckhub_e2e"
const API_PORT = 4001
const isWindows = process.platform === "win32"

function replaceDbName(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

async function waitForHealth(port: number, timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`API server did not become healthy within ${timeoutMs}ms`)
}

export default async function globalSetup() {
  // 1. Start Postgres container
  const { PostgreSqlContainer } = await import("@testcontainers/postgresql")
  const container = await new PostgreSqlContainer("postgres:16-alpine").start()
  const baseUrl = container.getConnectionUri()

  const maintenanceUrl = replaceDbName(baseUrl, "postgres")
  const e2eDbUrl = replaceDbName(baseUrl, E2E_DB)

  // 2. Create e2e database
  const postgres = (await import("postgres")).default
  const maintenanceSql = postgres(maintenanceUrl, { max: 1 })

  try {
    await maintenanceSql.unsafe(`DROP DATABASE IF EXISTS ${E2E_DB} WITH (FORCE)`)
    await maintenanceSql.unsafe(`CREATE DATABASE ${E2E_DB}`)
  } finally {
    await maintenanceSql.end()
  }

  // 3. Push schema
  const dbPkgDir = resolve(monorepoRoot, "packages/db")
  const drizzleKitBin = resolve(dbPkgDir, `node_modules/.bin/drizzle-kit${isWindows ? ".cmd" : ""}`)
  execSync(`"${drizzleKitBin}" push --force`, {
    cwd: dbPkgDir,
    env: { ...process.env, DATABASE_URL: e2eDbUrl },
    stdio: "pipe",
    shell: isWindows ? "cmd.exe" : undefined,
  })

  // 4. Seed test user with credential account (raw SQL to avoid drizzle-orm dep)
  const e2eSql = postgres(e2eDbUrl, { max: 1 })
  const { hashPassword } = await import("better-auth/crypto")

  const userId = "e2e-admin-id"
  const hashedPw = await hashPassword("test1234")
  const now = new Date().toISOString()

  await e2eSql`
    INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (${userId}, ${"E2E Admin"}, ${"admin@test.local"}, ${true}, ${now}, ${now})
  `

  await e2eSql`
    INSERT INTO account (id, "accountId", "providerId", password, "userId", "createdAt", "updatedAt")
    VALUES (${"e2e-account-id"}, ${userId}, ${"credential"}, ${hashedPw}, ${userId}, ${now}, ${now})
  `

  await e2eSql`
    INSERT INTO user_roles (user_id, role)
    VALUES (${userId}, ${"super_admin"})
  `

  // Seed trikot templates (needed for trikots E2E tests)
  const oneColorSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
</svg>`
  const twoColorSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
  <path id="schulter" fill="{{color_schulter}}" stroke="#000" stroke-width="0" d="m 11.281638,47.768982 14.298956,37.743671 c 0,0 0.07017,0.05963 40.892953,-26.364418 44.282223,-11.865387 74.894513,-11.712062 117.051423,-0.115073 40.82279,26.424051 40.70605,26.428872 40.70605,26.428872 l 14.23102,-37.693051 -48.97471,-34.6076 -27.231,0.376583 C 140.0897,29.243719 108.88499,28.731064 86.718361,13.025311 H 60.512656 Z"/>
</svg>`

  await e2eSql`
    INSERT INTO trikot_templates (name, template_type, color_count, svg)
    VALUES
      (${"One-color"}, ${"one_color"}, ${1}, ${oneColorSvg}),
      (${"Two-color"}, ${"two_color"}, ${2}, ${twoColorSvg})
    ON CONFLICT DO NOTHING
  `

  await e2eSql.end()

  // 5. Start API server (CWD = packages/api so tsx resolves from its node_modules)
  const apiPkgDir = resolve(monorepoRoot, "packages/api")
  const apiEntry = resolve(apiPkgDir, "src/index.ts")
  const apiProcess: ChildProcess = spawn("node", ["--import", "tsx", apiEntry], {
    cwd: apiPkgDir,
    env: {
      ...process.env,
      DATABASE_URL: e2eDbUrl,
      AUTO_MIGRATE: "false",
      API_PORT: String(API_PORT),
      BETTER_AUTH_BASE_URL: `http://localhost:${API_PORT}`,
      TRUSTED_ORIGINS: "http://localhost:4000",
    },
    stdio: "pipe",
    shell: isWindows,
    detached: !isWindows,
  })

  apiProcess.stdout?.on("data", (d: Buffer) => process.stdout.write(`[api] ${d}`))
  apiProcess.stderr?.on("data", (d: Buffer) => process.stderr.write(`[api:err] ${d}`))

  // 6. Wait for health
  await waitForHealth(API_PORT)

  // 7. Write state for teardown
  writeFileSync(
    stateFile,
    JSON.stringify({
      containerId: container.getId(),
      apiPid: apiProcess.pid,
      maintenanceUrl,
      dbName: E2E_DB,
    }),
  )
}
