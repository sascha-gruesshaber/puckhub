import { type ChildProcess, execSync, spawn } from "node:child_process"
import { createWriteStream, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const monorepoRoot = resolve(import.meta.dirname, "..")
const stateFile = resolve(import.meta.dirname, ".e2e-state.json")
const apiLogFile = resolve(import.meta.dirname, ".e2e-api.log")

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

  // 3. Push schema using Prisma
  const dbPkgDir = resolve(monorepoRoot, "packages/db")
  execSync("npx prisma db push --accept-data-loss", {
    cwd: dbPkgDir,
    env: { ...process.env, DATABASE_URL: e2eDbUrl },
    stdio: "pipe",
    shell: isWindows ? "cmd.exe" : undefined,
  })

  // 4. Seed test data
  const { seed } = await import("./seed")
  await seed(e2eDbUrl)

  // 5. Initialize API log file (used to capture magic link URLs)
  writeFileSync(apiLogFile, "")

  // 6. Start API server
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
      COOKIE_DOMAIN: "localhost",
      TRUSTED_ORIGINS: "http://localhost:4000,http://localhost:4002,http://localhost:4003,http://localhost:4004",
    },
    stdio: "pipe",
    shell: isWindows,
    detached: !isWindows,
  })

  // Pipe API stdout to both terminal and log file (for magic link capture)
  const logStream = createWriteStream(apiLogFile, { flags: "a" })

  apiProcess.stdout?.on("data", (d: Buffer) => {
    process.stdout.write(`[api] ${d}`)
    logStream.write(d)
  })
  apiProcess.stderr?.on("data", (d: Buffer) => {
    process.stderr.write(`[api:err] ${d}`)
    logStream.write(d)
  })

  // 7. Wait for health
  await waitForHealth(API_PORT)

  // 8. Write state for teardown
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
