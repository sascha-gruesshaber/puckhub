import * as schema from "@puckhub/db/schema"
import { and, asc, desc, eq, gte, lte } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

async function resolveCurrentSeason(db: any) {
  const now = new Date()

  const inRange = await db.query.seasons.findFirst({
    where: and(lte(schema.seasons.seasonStart, now), gte(schema.seasons.seasonEnd, now)),
    orderBy: [desc(schema.seasons.seasonStart)],
  })
  if (inRange) return inRange

  const latestPast = await db.query.seasons.findFirst({
    where: lte(schema.seasons.seasonEnd, now),
    orderBy: [desc(schema.seasons.seasonEnd)],
  })
  if (latestPast) return latestPast

  return db.query.seasons.findFirst({
    orderBy: [asc(schema.seasons.seasonStart)],
  })
}

export const playerRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.players.findMany({
      orderBy: (players, { asc }) => [asc(players.lastName), asc(players.firstName)],
    })
  }),

  /**
   * List all players with their current team assignment for the current season.
   */
  listWithCurrentTeam: publicProcedure.query(async ({ ctx }) => {
    const currentSeason = await resolveCurrentSeason(ctx.db)

    const players = await ctx.db.query.players.findMany({
      orderBy: (p, { asc }) => [asc(p.lastName), asc(p.firstName)],
      with: {
        contracts: {
          with: { team: true, startSeason: true, endSeason: true },
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

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.players.findFirst({
      where: eq(schema.players.id, input.id),
    })
  }),

  create: adminProcedure
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
      const [player] = await ctx.db.insert(schema.players).values(input).returning()
      return player
    }),

  update: adminProcedure
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
      const { id, ...data } = input
      const [player] = await ctx.db
        .update(schema.players)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.players.id, id))
        .returning()
      return player
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.players).where(eq(schema.players.id, input.id))
  }),
})
