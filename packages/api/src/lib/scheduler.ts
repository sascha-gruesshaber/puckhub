import { createTask, validate, type ScheduledTask } from "node-cron"

export interface Job {
  name: string
  cronExpression: string
  timezone?: string
  enabled: boolean
  handler: () => Promise<void>
}

export interface JobStatus {
  name: string
  cronExpression: string
  timezone: string
  running: boolean
  lastRunAt: string | null
  lastRunDurationMs: number | null
  lastRunError: string | null
  nextRunAt: string | null
}

interface RunningJob {
  job: Job
  task: ScheduledTask
  timezone: string
  running: boolean
  lastRunAt: Date | null
  lastRunDurationMs: number | null
  lastRunError: string | null
}

export class Scheduler {
  private jobs = new Map<string, RunningJob>()
  private defaultTimezone = "Europe/Berlin"

  register(job: Job): void {
    if (!job.enabled) {
      console.log(`[scheduler] Job "${job.name}" is disabled, skipping registration`)
      return
    }

    if (!validate(job.cronExpression)) {
      console.error(`[scheduler] Invalid cron expression for "${job.name}": ${job.cronExpression}`)
      return
    }

    const timezone = job.timezone ?? this.defaultTimezone
    const task = createTask(
      job.cronExpression,
      async () => {
        await this.executeJob(job.name)
      },
      { timezone, name: job.name, noOverlap: true },
    )

    this.jobs.set(job.name, {
      job,
      task,
      timezone,
      running: false,
      lastRunAt: null,
      lastRunDurationMs: null,
      lastRunError: null,
    })
    console.log(`[scheduler] Registered job "${job.name}" (${job.cronExpression}, tz=${timezone})`)
  }

  private async executeJob(name: string): Promise<void> {
    const entry = this.jobs.get(name)
    if (!entry) return

    if (entry.running) {
      console.log(`[scheduler] Job "${name}" still running, skipping`)
      return
    }

    entry.running = true
    entry.lastRunError = null
    const start = Date.now()
    console.log(`[scheduler] Job "${name}" started`)

    try {
      await entry.job.handler()
      const elapsed = Date.now() - start
      entry.lastRunDurationMs = elapsed
      entry.lastRunAt = new Date()
      console.log(`[scheduler] Job "${name}" completed in ${(elapsed / 1000).toFixed(1)}s`)
    } catch (err) {
      const elapsed = Date.now() - start
      entry.lastRunDurationMs = elapsed
      entry.lastRunAt = new Date()
      entry.lastRunError = err instanceof Error ? err.message : String(err)
      console.error(`[scheduler] Job "${name}" failed after ${(elapsed / 1000).toFixed(1)}s:`, err)
    } finally {
      entry.running = false
    }
  }

  start(): void {
    for (const [name, entry] of this.jobs) {
      entry.task.start()
      console.log(`[scheduler] Started job "${name}"`)
    }
  }

  stop(): void {
    for (const [name, entry] of this.jobs) {
      entry.task.stop()
      console.log(`[scheduler] Stopped job "${name}"`)
    }
  }

  getJobStatuses(): JobStatus[] {
    return Array.from(this.jobs.values()).map((entry) => ({
      name: entry.job.name,
      cronExpression: entry.job.cronExpression,
      timezone: entry.timezone,
      running: entry.running,
      lastRunAt: entry.lastRunAt?.toISOString() ?? null,
      lastRunDurationMs: entry.lastRunDurationMs,
      lastRunError: entry.lastRunError,
      nextRunAt: entry.task.getNextRun()?.toISOString() ?? null,
    }))
  }

  async triggerJob(name: string): Promise<void> {
    const entry = this.jobs.get(name)
    if (!entry) {
      throw new Error(`Job "${name}" not found`)
    }
    if (entry.running) {
      throw new Error(`Job "${name}" is already running`)
    }
    await this.executeJob(name)
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton for access from tRPC context
// ---------------------------------------------------------------------------
let _instance: Scheduler | null = null

export function setSchedulerInstance(scheduler: Scheduler): void {
  _instance = scheduler
}

export function getSchedulerInstance(): Scheduler | null {
  return _instance
}
