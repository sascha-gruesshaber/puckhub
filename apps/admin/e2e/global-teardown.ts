import { execSync } from "node:child_process"
import { existsSync, readFileSync, unlinkSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const stateFile = resolve(__dirname, ".e2e-state.json")

const isWindows = process.platform === "win32"

export default async function globalTeardown() {
  if (!existsSync(stateFile)) return

  const state = JSON.parse(readFileSync(stateFile, "utf-8"))

  // 1. Kill API server
  if (state.apiPid) {
    try {
      if (isWindows) {
        execSync(`taskkill /pid ${state.apiPid} /T /F`, { stdio: "ignore" })
      } else {
        process.kill(-state.apiPid, "SIGTERM")
      }
    } catch {
      // process may already be gone
    }
  }

  // 2. Drop test database
  if (state.maintenanceUrl && state.dbName) {
    try {
      const postgres = (await import("postgres")).default
      const sql = postgres(state.maintenanceUrl, { max: 1 })
      await sql.unsafe(`DROP DATABASE IF EXISTS ${state.dbName} WITH (FORCE)`)
      await sql.end()
    } catch {
      // best-effort cleanup
    }
  }

  // 3. Delete state file (Ryuk handles container cleanup)
  unlinkSync(stateFile)
}
