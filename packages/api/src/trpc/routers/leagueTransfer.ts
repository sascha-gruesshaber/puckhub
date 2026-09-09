import { z } from "zod"
import { MAX_ID_LENGTH, MAX_NAME_LENGTH } from "../../lib/validation"
import {
  buildLeagueExport,
  importLeagueData,
  leagueExportSchema,
  validateLeagueData,
} from "../../services/leagueTransfer"
import { platformAdminProcedure, router } from "../init"

export const leagueTransferRouter = router({
  exportLeague: platformAdminProcedure
    .input(z.object({ organizationId: z.string().max(MAX_ID_LENGTH).min(1) }))
    .query(async ({ ctx, input }) => {
      return buildLeagueExport(ctx.db, input.organizationId)
    }),

  importLeague: platformAdminProcedure
    .input(z.object({ data: leagueExportSchema, name: z.string().max(MAX_NAME_LENGTH).min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      return importLeagueData(ctx.db, input.data, ctx.user.id, { name: input.name })
    }),

  validateImport: platformAdminProcedure
    .input(z.object({ data: leagueExportSchema }))
    .mutation(async ({ ctx, input }) => {
      return validateLeagueData(ctx.db, input.data)
    }),
})
