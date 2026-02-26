import { z } from "zod"
import {
  buildLeagueExport,
  importLeagueData,
  leagueExportSchema,
  validateLeagueData,
} from "../../services/leagueTransfer"
import { platformAdminProcedure, router } from "../init"

export const leagueTransferRouter = router({
  exportLeague: platformAdminProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return buildLeagueExport(ctx.db, input.organizationId)
    }),

  importLeague: platformAdminProcedure
    .input(z.object({ data: leagueExportSchema }))
    .mutation(async ({ ctx, input }) => {
      return importLeagueData(ctx.db, input.data, ctx.user.id)
    }),

  validateImport: platformAdminProcedure
    .input(z.object({ data: leagueExportSchema }))
    .mutation(async ({ ctx, input }) => {
      return validateLeagueData(ctx.db, input.data)
    }),
})
