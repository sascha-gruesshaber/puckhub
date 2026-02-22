import { Badge, Button, toast } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Clock, Loader2, Play, Timer } from "lucide-react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/jobs")({
  component: JobsPage,
})

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.round((ms % 60_000) / 1000)
  return `${min}m ${sec}s`
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function JobsPage() {
  const { data: jobs, isLoading } = trpc.scheduler.list.useQuery(undefined, {
    refetchInterval: 5000,
  })
  const utils = trpc.useUtils()

  const triggerMutation = trpc.scheduler.trigger.useMutation({
    onSuccess: (_data, variables) => {
      utils.scheduler.list.invalidate()
      toast.success(`Job "${variables.jobName}" completed`)
    },
    onError: (err) => toast.error("Failed to trigger job", { description: err.message }),
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scheduled cron jobs running on this server</p>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
          <Clock size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">No jobs registered</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Jobs are registered when the API starts with the appropriate environment variables enabled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <div
              key={job.name}
              className="data-row rounded-xl border border-border/50 bg-white p-5 shadow-sm"
              style={{ "--row-index": i } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Name + metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <h3 className="text-sm font-semibold text-foreground">{job.name}</h3>
                    {job.running ? (
                      <Badge variant="accent" className="gap-1 text-xs">
                        <Loader2 size={10} className="animate-spin" />
                        Running
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Idle
                      </Badge>
                    )}
                  </div>

                  {/* Cron + Timezone */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} />
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        {job.cronExpression}
                      </code>
                    </span>
                    <span>{job.timezone}</span>
                    {job.nextRunAt && (
                      <span className="inline-flex items-center gap-1">
                        <Timer size={12} />
                        Next: {new Date(job.nextRunAt).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Last run info */}
                  {job.lastRunAt && (
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {job.lastRunError ? (
                        <span className="text-destructive">
                          Failed {formatRelative(job.lastRunAt)}
                          {job.lastRunDurationMs != null && ` (${formatDuration(job.lastRunDurationMs)})`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Last run: {formatRelative(job.lastRunAt)}
                          {job.lastRunDurationMs != null && ` (${formatDuration(job.lastRunDurationMs)})`}
                        </span>
                      )}
                      {job.lastRunError && (
                        <span className="text-destructive/70 truncate max-w-xs" title={job.lastRunError}>
                          {job.lastRunError}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Trigger button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={job.running || (triggerMutation.isPending && triggerMutation.variables?.jobName === job.name)}
                  onClick={() => triggerMutation.mutate({ jobName: job.name })}
                >
                  {triggerMutation.isPending && triggerMutation.variables?.jobName === job.name ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Run now
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count summary */}
      {jobs && jobs.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"} registered
          {jobs.some((j) => j.running) && ` (${jobs.filter((j) => j.running).length} running)`}
        </p>
      )}
    </div>
  )
}
