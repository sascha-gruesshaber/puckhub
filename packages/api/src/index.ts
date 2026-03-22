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

  // Ensure system sub-route pages exist for all organizations
  const { ensureSystemPages } = await import("./services/ensureSystemPages")
  const { db: sysDb } = await import("@puckhub/db")
  const allOrgs = await sysDb.organization.findMany({ select: { id: true } })
  for (const org of allOrgs) {
    const settings = await sysDb.systemSettings.findUnique({
      where: { organizationId: org.id },
      select: { locale: true },
    })
    await ensureSystemPages(sysDb, org.id, settings?.locale ?? undefined)
  }

  // Register and start job scheduler
  const { Scheduler, setSchedulerInstance } = await import("./lib/scheduler")
  const { createDemoResetJob } = await import("./lib/jobs/demoResetJob")
  const { createAiHomeWidgetsJob } = await import("./lib/jobs/aiHomeWidgetsJob")
  const { createStatsRecalcJob } = await import("./lib/jobs/statsRecalcJob")
  const { createBackupJob } = await import("./lib/jobs/backupJob")

  const scheduler = new Scheduler()
  scheduler.register(createDemoResetJob())
  scheduler.register(createAiHomeWidgetsJob())
  scheduler.register(createStatsRecalcJob())
  scheduler.register(createBackupJob())
  scheduler.start()
  setSchedulerInstance(scheduler)

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
