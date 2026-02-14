import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm"
import { z } from "zod"
import { generateRoundRobin } from "../../services/schedulerService"
import { adminProcedure, publicProcedure, router } from "../init"

const gameStatusValues = ["scheduled", "in_progress", "completed", "postponed", "cancelled"] as const

async function assertTeamsAllowedForRound(ctx: { db: any }, roundId: string, homeTeamId: string, awayTeamId: string) {
  if (homeTeamId === awayTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Home and away team must be different.",
    })
  }

  const round = await ctx.db.query.rounds.findFirst({
    where: eq(schema.rounds.id, roundId),
  })

  if (!round) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Runde nicht gefunden." })
  }

  const rows: Array<{ teamId: string }> = await ctx.db
    .select({ teamId: schema.teamDivisions.teamId })
    .from(schema.teamDivisions)
    .where(
      and(
        eq(schema.teamDivisions.divisionId, round.divisionId),
        inArray(schema.teamDivisions.teamId, [homeTeamId, awayTeamId]),
      ),
    )

  const teamIds = new Set(rows.map((r) => r.teamId))
  if (!teamIds.has(homeTeamId) || !teamIds.has(awayTeamId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Both teams must belong to the selected round division.",
    })
  }
}

export const gameRouter = router({
  listByRound: publicProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.games.findMany({
      where: eq(schema.games.roundId, input.roundId),
      orderBy: (games, { asc }) => [asc(games.scheduledAt), asc(games.gameNumber)],
    })
  }),

  listForSeason: publicProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        divisionId: z.string().uuid().optional(),
        roundId: z.string().uuid().optional(),
        teamId: z.string().uuid().optional(),
        status: z.enum(gameStatusValues).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        unscheduledOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const divisions = await ctx.db.query.divisions.findMany({
        where: and(
          eq(schema.divisions.seasonId, input.seasonId),
          input.divisionId ? eq(schema.divisions.id, input.divisionId) : undefined,
        ),
      })

      const divisionIds = divisions.map((d) => d.id)
      if (divisionIds.length === 0) return []

      const rounds = await ctx.db.query.rounds.findMany({
        where: and(
          inArray(schema.rounds.divisionId, divisionIds),
          input.roundId ? eq(schema.rounds.id, input.roundId) : undefined,
        ),
      })
      const roundIds = rounds.map((r) => r.id)
      if (roundIds.length === 0) return []

      const games = await ctx.db.query.games.findMany({
        where: and(
          inArray(schema.games.roundId, roundIds),
          input.teamId
            ? or(eq(schema.games.homeTeamId, input.teamId), eq(schema.games.awayTeamId, input.teamId))
            : undefined,
          input.status ? eq(schema.games.status, input.status) : undefined,
          input.unscheduledOnly ? isNull(schema.games.scheduledAt) : undefined,
          input.from ? gte(schema.games.scheduledAt, new Date(input.from)) : undefined,
          input.to ? lte(schema.games.scheduledAt, new Date(input.to)) : undefined,
        ),
        with: {
          round: {
            with: {
              division: true,
            },
          },
          homeTeam: true,
          awayTeam: true,
          venue: true,
        },
        orderBy: (game, { asc }) => [asc(game.scheduledAt), asc(game.gameNumber), asc(game.createdAt)],
      })

      return games
    }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.games.findFirst({
      where: eq(schema.games.id, input.id),
      with: {
        round: {
          with: {
            division: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
        venue: true,
      },
    })
  }),

  create: adminProcedure
    .input(
      z.object({
        roundId: z.string().uuid(),
        homeTeamId: z.string().uuid(),
        awayTeamId: z.string().uuid(),
        venueId: z.string().uuid().optional(),
        scheduledAt: z.string().datetime().optional(),
        gameNumber: z.number().int().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTeamsAllowedForRound(ctx, input.roundId, input.homeTeamId, input.awayTeamId)
      const homeTeam = await ctx.db.query.teams.findFirst({
        where: eq(schema.teams.id, input.homeTeamId),
        columns: { defaultVenueId: true },
      })

      const [game] = await ctx.db
        .insert(schema.games)
        .values({
          roundId: input.roundId,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          venueId: input.venueId ?? homeTeam?.defaultVenueId ?? undefined,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          gameNumber: input.gameNumber,
          notes: input.notes,
        })
        .returning()

      return game
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        roundId: z.string().uuid().optional(),
        homeTeamId: z.string().uuid().optional(),
        awayTeamId: z.string().uuid().optional(),
        venueId: z.string().uuid().nullable().optional(),
        scheduledAt: z.string().datetime().nullable().optional(),
        gameNumber: z.number().int().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.enum(gameStatusValues).optional(),
        homeScore: z.number().int().min(0).nullable().optional(),
        awayScore: z.number().int().min(0).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.query.games.findFirst({
        where: eq(schema.games.id, id),
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spiel nicht gefunden." })
      }

      const nextRoundId = data.roundId ?? existing.roundId
      const nextHomeTeamId = data.homeTeamId ?? existing.homeTeamId
      const nextAwayTeamId = data.awayTeamId ?? existing.awayTeamId
      await assertTeamsAllowedForRound(ctx, nextRoundId, nextHomeTeamId, nextAwayTeamId)

      const nextStatus = data.status ?? existing.status
      const nextHomeScore = data.homeScore === undefined ? existing.homeScore : data.homeScore
      const nextAwayScore = data.awayScore === undefined ? existing.awayScore : data.awayScore

      if (nextStatus === "completed" && (nextHomeScore == null || nextAwayScore == null)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Both scores are required when setting status to completed.",
        })
      }

      const wasCompleted = existing.status === "completed"

      const [game] = await ctx.db
        .update(schema.games)
        .set({
          ...data,
          scheduledAt:
            data.scheduledAt === undefined ? undefined : data.scheduledAt ? new Date(data.scheduledAt) : null,
          finalizedAt: data.status === undefined ? undefined : data.status === "completed" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.games.id, id))
        .returning()

      // When transitioning to completed: increment servedGames for active suspensions
      // Exclude suspensions from THIS game (they count starting from the next game)
      if (data.status === "completed" && !wasCompleted) {
        await ctx.db
          .update(schema.gameSuspensions)
          .set({
            servedGames: sql`${schema.gameSuspensions.servedGames} + 1`,
          })
          .where(
            and(
              ne(schema.gameSuspensions.gameId, id),
              sql`${schema.gameSuspensions.servedGames} < ${schema.gameSuspensions.suspendedGames}`,
              or(
                eq(schema.gameSuspensions.teamId, existing.homeTeamId),
                eq(schema.gameSuspensions.teamId, existing.awayTeamId),
              ),
            ),
          )
      }

      return game
    }),

  updateScore: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        homeScore: z.number().int().min(0),
        awayScore: z.number().int().min(0),
        status: z.enum(gameStatusValues).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [game] = await ctx.db
        .update(schema.games)
        .set({
          ...data,
          updatedAt: new Date(),
          ...(data.status === "completed" ? { finalizedAt: new Date() } : {}),
        })
        .where(eq(schema.games.id, id))
        .returning()
      return game
    }),

  generateDoubleRoundRobin: adminProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        divisionId: z.string().uuid(),
        roundId: z.string().uuid(),
        schedulingTemplate: z
          .object({
            startAt: z.string().datetime(),
            cadenceDays: z.number().int().min(1).default(7),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const division = await ctx.db.query.divisions.findFirst({
        where: eq(schema.divisions.id, input.divisionId),
      })

      if (!division || division.seasonId !== input.seasonId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Division does not belong to the selected season.",
        })
      }

      const round = await ctx.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, input.roundId),
      })
      if (!round || round.divisionId !== input.divisionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Round does not belong to the selected division.",
        })
      }

      const assignments = await ctx.db
        .select({ teamId: schema.teamDivisions.teamId })
        .from(schema.teamDivisions)
        .where(eq(schema.teamDivisions.divisionId, input.divisionId))

      const teamIds = Array.from(new Set(assignments.map((a) => a.teamId)))
      if (teamIds.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least two teams are required to generate fixtures.",
        })
      }

      const fixtures = generateRoundRobin(teamIds)

      const existingGames = await ctx.db.query.games.findMany({
        where: eq(schema.games.roundId, input.roundId),
      })
      const existingPairs = new Set(existingGames.map((g) => `${g.homeTeamId}::${g.awayTeamId}`))

      const startAt = input.schedulingTemplate?.startAt ? new Date(input.schedulingTemplate.startAt) : null
      const cadenceDays = input.schedulingTemplate?.cadenceDays ?? 7

      const values: Array<typeof schema.games.$inferInsert> = []
      let skippedExisting = 0

      for (let i = 0; i < fixtures.length; i++) {
        const fixture = fixtures[i]!
        const key = `${fixture.homeTeamId}::${fixture.awayTeamId}`
        if (existingPairs.has(key)) {
          skippedExisting++
          continue
        }

        values.push({
          roundId: input.roundId,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          gameNumber: i + 1,
          scheduledAt: startAt != null ? new Date(startAt.getTime() + i * cadenceDays * 24 * 60 * 60 * 1000) : null,
        })
      }

      const created = values.length > 0 ? await ctx.db.insert(schema.games).values(values).returning() : []

      return {
        totalFixtures: fixtures.length,
        createdCount: created.length,
        skippedExisting,
        created,
      }
    }),

  deleteMany: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(schema.games).where(inArray(schema.games.id, input.ids))
      return { success: true }
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.games).where(eq(schema.games.id, input.id))
  }),
})
