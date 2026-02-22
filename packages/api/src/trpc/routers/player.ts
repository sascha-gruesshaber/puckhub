import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

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
   * List all players with their current team assignment for the current season.
   */
  listWithCurrentTeam: orgProcedure.query(async ({ ctx }) => {
    const currentSeason = await resolveCurrentSeason(ctx.db, ctx.organizationId)

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

    return {
      players: players.map(({ contracts, ...p }) => {
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
      }),
      currentSeason,
    }
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.player.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
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

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.player.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
