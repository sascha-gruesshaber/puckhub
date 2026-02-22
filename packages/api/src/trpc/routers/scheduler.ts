import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { getSchedulerInstance } from "../../lib/scheduler"
import { platformAdminProcedure, router } from "../init"

export const schedulerRouter = router({
  list: platformAdminProcedure.query(() => {
    const scheduler = getSchedulerInstance()
    if (!scheduler) return []
    return scheduler.getJobStatuses()
  }),

  trigger: platformAdminProcedure.input(z.object({ jobName: z.string() })).mutation(async ({ input }) => {
    const scheduler = getSchedulerInstance()
    if (!scheduler) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Scheduler not initialized" })
    }
    try {
      await scheduler.triggerJob(input.jobName)
      return { success: true }
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Failed to trigger job",
      })
    }
  }),
})
