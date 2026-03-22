import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { isS3Configured } from "../../lib/s3"
import {
  createBackup,
  enforceRetention,
  getBackupUrl,
  listBackups,
} from "../../services/backupService"
import { getOrgPlan } from "../../services/planLimits"
import { orgAdminProcedure, router } from "../init"

export const backupRouter = router({
  list: orgAdminProcedure.query(async ({ ctx }) => {
    return listBackups(ctx.db, ctx.organizationId)
  }),

  downloadUrl: orgAdminProcedure
    .input(z.object({ backupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!isS3Configured()) {
        throw createAppError(
          "PRECONDITION_FAILED",
          APP_ERROR_CODES.BACKUP_S3_NOT_CONFIGURED,
          "Backup storage is not configured",
        )
      }

      try {
        const url = await getBackupUrl(ctx.db, input.backupId, ctx.organizationId)
        return { url }
      } catch {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.BACKUP_NOT_FOUND, "Backup not found")
      }
    }),

  trigger: orgAdminProcedure.mutation(async ({ ctx }) => {
    if (!isS3Configured()) {
      throw createAppError(
        "PRECONDITION_FAILED",
        APP_ERROR_CODES.BACKUP_S3_NOT_CONFIGURED,
        "Backup storage is not configured",
      )
    }

    const plan = await getOrgPlan(ctx.db, ctx.organizationId)
    const maxBackups = plan?.maxBackups ?? 1

    const backup = await createBackup(ctx.db, ctx.organizationId)
    await enforceRetention(ctx.db, ctx.organizationId, maxBackups)
    return backup
  }),

  planInfo: orgAdminProcedure.query(async ({ ctx }) => {
    const plan = await getOrgPlan(ctx.db, ctx.organizationId)
    const count = await ctx.db.backup.count({
      where: { organizationId: ctx.organizationId },
    })

    return {
      maxBackups: plan?.maxBackups ?? 1,
      backupFrequencyDays: plan?.backupFrequencyDays ?? 7,
      currentCount: count,
      s3Configured: isS3Configured(),
    }
  }),
})
