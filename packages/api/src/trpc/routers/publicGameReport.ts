import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { orgProcedure, requireRole, router } from "../init"

/** Resolve the seasonId from a roundId (round -> division -> season). */
async function getSeasonIdFromRound(db: any, roundId: string): Promise<string | null> {
  const round = await db.round.findUnique({
    where: { id: roundId },
    select: { division: { select: { seasonId: true } } },
  })
  return round?.division?.seasonId ?? null
}

export const publicGameReportRouter = router({
  list: orgProcedure
    .input(
      z.object({
        seasonId: z.string().uuid().optional(),
        reverted: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireRole(ctx, "game_manager")

      const where: any = { organizationId: ctx.organizationId }
      if (input.reverted !== undefined) {
        where.reverted = input.reverted
      }
      if (input.seasonId) {
        where.game = { round: { division: { seasonId: input.seasonId } } }
      }

      const items = await ctx.db.publicGameReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          game: {
            select: {
              id: true,
              scheduledAt: true,
              homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
              awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
              round: { select: { name: true, division: { select: { name: true } } } },
            },
          },
          reverter: { select: { name: true } },
        },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const next = items.pop()!
        nextCursor = next.id
      }

      return { items, nextCursor }
    }),

  revert: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        revertNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx, "game_manager")

      const report = await ctx.db.publicGameReport.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          game: {
            select: {
              id: true,
              roundId: true,
              status: true,
              homeTeam: { select: { shortName: true } },
              awayTeam: { select: { shortName: true } },
            },
          },
        },
      })

      if (!report) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PUBLIC_REPORT_NOT_FOUND)
      }
      if (report.reverted) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PUBLIC_REPORT_ALREADY_REVERTED)
      }

      // Mark report as reverted
      await ctx.db.publicGameReport.update({
        where: { id: input.id },
        data: {
          reverted: true,
          revertedBy: ctx.user.id,
          revertedAt: new Date(),
          revertNote: input.revertNote ?? null,
        },
      })

      // Reopen the game if it's still completed
      if (report.game.status === "completed") {
        await ctx.db.game.update({
          where: { id: report.game.id },
          data: {
            status: "scheduled",
            homeScore: null,
            awayScore: null,
            finalizedAt: null,
            updatedAt: new Date(),
          },
        })

        // Recalculate standings
        await recalculateStandings(ctx.db, report.game.roundId)

        const seasonId = await getSeasonIdFromRound(ctx.db, report.game.roundId)
        if (seasonId) {
          await recalculatePlayerStats(ctx.db, seasonId)
          await recalculateGoalieStats(ctx.db, seasonId)
        }
      }

      return { success: true }
    }),

  count: orgProcedure.input(z.object({ seasonId: z.string().uuid().optional() })).query(async ({ ctx, input }) => {
    const where: any = { organizationId: ctx.organizationId, reverted: false }
    if (input.seasonId) {
      where.game = { round: { division: { seasonId: input.seasonId } } }
    }
    const count = await ctx.db.publicGameReport.count({ where })
    return { count }
  }),
})
