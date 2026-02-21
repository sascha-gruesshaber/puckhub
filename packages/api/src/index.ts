import { config } from "dotenv"

config({ path: "../../.env" })

try {
  // Auto-migrate + seed (skip only when explicitly disabled)
  const autoMigrate = process.env.AUTO_MIGRATE
  if (autoMigrate !== "false" && autoMigrate !== "0") {
    const { db, runMigrations, runSeed } = await import("@puckhub/db")
    await runMigrations(db)
    await runSeed(db)
  }

  // Create default admin user from env if no users exist yet
  const { ensureDefaultUser } = await import("./lib/ensureDefaultUser")
  await ensureDefaultUser()

  const { serve } = await import("@hono/node-server")
  const { app } = await import("./app")

  const port = Number(process.env.API_PORT) || 3001

  serve(
    {
      fetch: app.fetch,
      port,
      hostname: "0.0.0.0",
    },
    (info) => {
      console.log(`PuckHub API running at http://localhost:${info.port}`)
    },
  )
} catch (err) {
  console.error("Failed to start API server:", err)
  process.exit(1)
}
