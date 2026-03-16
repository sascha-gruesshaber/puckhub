import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgAdminProcedure, orgProcedure, router } from "../init"
import { checkLimit, getOrgPlan } from "../../services/planLimits"

async function resolveCurrentSeason(db: any, organizationId: string) {
  const now = new Date()

  const inRange = await db.season.findFirst({
    where: {
      organizationId,
      seasonStart: { lte: now },
      seasonEnd: { gte: now },
    },
    orderBy: { seasonStart: "desc" },
  })
  if (inRange) return inRange

  const latestPast = await db.season.findFirst({
    where: {
      organizationId,
      seasonEnd: { lte: now },
    },
    orderBy: { seasonEnd: "desc" },
  })
  if (latestPast) return latestPast

  return db.season.findFirst({
    where: { organizationId },
    orderBy: { seasonStart: "asc" },
  })
}

export const playerRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.player.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })
  }),

  /**
   * List all players with their current team assignment for a given season.
   * When seasonId is provided, only players with an active contract are returned.
   * When omitted, falls back to resolveCurrentSeason() and returns all players.
   */
  listWithCurrentTeam: orgProcedure
    .input(z.object({ seasonId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const seasonId = input?.seasonId

      const currentSeason = seasonId
        ? await ctx.db.season.findFirst({ where: { id: seasonId, organizationId: ctx.organizationId } })
        : await resolveCurrentSeason(ctx.db, ctx.organizationId)

      const players = await ctx.db.player.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          contracts: {
            include: { team: true, startSeason: true, endSeason: true },
          },
        },
      })

      if (!currentSeason) {
        return {
          players: players.map(({ contracts: _, ...p }) => ({ ...p, currentTeam: null })),
          currentSeason: null,
        }
      }

      const mapped = players.map(({ contracts, ...p }) => {
        // Find the active contract for the current season
        const active = contracts.find((c) => {
          const startsBeforeOrInSeason = c.startSeason.seasonStart <= currentSeason.seasonEnd
          const endsAfterOrInSeason = c.endSeason == null || c.endSeason.seasonEnd >= currentSeason.seasonStart
          return startsBeforeOrInSeason && endsAfterOrInSeason
        })

        return {
          ...p,
          currentTeam: active
            ? {
                id: active.team.id,
                name: active.team.name,
                shortName: active.team.shortName,
                logoUrl: active.team.logoUrl,
                position: active.position,
                jerseyNumber: active.jerseyNumber,
              }
            : null,
        }
      })

      return {
        players: mapped,
        currentSeason,
      }
    }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.player.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  getByIdWithHistory: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const player = await ctx.db.player.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: {
        contracts: {
          include: {
            team: true,
            startSeason: true,
            endSeason: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    if (!player) throw createAppError("NOT_FOUND", APP_ERROR_CODES.PLAYER_NOT_FOUND)
    return player
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        nationality: z.string().optional(),
        photoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await getOrgPlan(ctx.db, ctx.organizationId)
      const count = await ctx.db.player.count({ where: { organizationId: ctx.organizationId } })
      checkLimit(plan, "maxPlayers", count)

      const { dateOfBirth, ...rest } = input
      const player = await ctx.db.player.create({
        data: {
          ...rest,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          organizationId: ctx.organizationId,
        },
      })
      return player
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.string().optional(),
        nationality: z.string().optional(),
        photoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, dateOfBirth, ...data } = input
      await ctx.db.player.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: {
          ...data,
          ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
          updatedAt: new Date(),
        },
      })
      const player = await ctx.db.player.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      return player
    }),

  /**
   * Deactivate a player by ending their active contract for the given season.
   * The player remains in the system but is no longer assigned to a team.
   */
  deactivate: orgAdminProcedure
    .input(z.object({ playerId: z.string().uuid(), seasonId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.season.findFirst({
        where: { id: input.seasonId, organizationId: ctx.organizationId },
      })
      if (!season) throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)

      const activeContract = await ctx.db.contract.findFirst({
        where: {
          playerId: input.playerId,
          organizationId: ctx.organizationId,
          startSeason: { seasonStart: { lte: season.seasonEnd } },
          OR: [{ endSeasonId: null }, { endSeason: { seasonEnd: { gte: season.seasonStart } } }],
        },
      })
      if (!activeContract) throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)

      await ctx.db.contract.update({
        where: { id: activeContract.id },
        data: { endSeasonId: input.seasonId, updatedAt: new Date() },
      })
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.player.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
