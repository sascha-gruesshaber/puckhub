import * as schema from "@puckhub/db/schema"
import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import { TRPCError } from "@trpc/server"
import { and, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm"
import { z } from "zod"
import { generateRoundRobin } from "../../services/schedulerService"
import { adminProcedure, publicProcedure, router } from "../init"

const gameStatusValues = ["scheduled", "completed", "cancelled"] as const

/** Resolve the seasonId from a roundId (round -> division -> season). */
async function getSeasonIdFromRound(db: any, roundId: string): Promise<string | null> {
  const round = await db.query.rounds.findFirst({
    where: eq(schema.rounds.id, roundId),
    columns: { divisionId: true },
  })
  if (!round) return null
  const division = await db.query.divisions.findFirst({
    where: eq(schema.divisions.id, round.divisionId),
    columns: { seasonId: true },
  })
  return division?.seasonId ?? null
}

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
            columns: { id: true, name: true, roundType: true, sortOrder: true, divisionId: true },
            with: {
              division: { columns: { id: true, name: true, sortOrder: true } },
            },
          },
          homeTeam: { columns: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { columns: { id: true, name: true, shortName: true, logoUrl: true } },
          venue: { columns: { id: true, name: true, city: true } },
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
      if (existing.status === "completed" || existing.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Abgeschlossene oder abgesagte Spiele können nicht bearbeitet werden.",
        })
      }

      const nextRoundId = data.roundId ?? existing.roundId
      const nextHomeTeamId = data.homeTeamId ?? existing.homeTeamId
      const nextAwayTeamId = data.awayTeamId ?? existing.awayTeamId
      await assertTeamsAllowedForRound(ctx, nextRoundId, nextHomeTeamId, nextAwayTeamId)

      const [game] = await ctx.db
        .update(schema.games)
        .set({
          ...data,
          scheduledAt:
            data.scheduledAt === undefined ? undefined : data.scheduledAt ? new Date(data.scheduledAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.games.id, id))
        .returning()

      return game
    }),

  complete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const game = await ctx.db.query.games.findFirst({
      where: eq(schema.games.id, input.id),
    })
    if (!game) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Spiel nicht gefunden." })
    }
    if (game.status === "completed" || game.status === "cancelled") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Spiel ist bereits abgeschlossen oder abgesagt.",
      })
    }

    // Validate both teams have at least 1 player in lineups
    const lineups = await ctx.db.query.gameLineups.findMany({
      where: eq(schema.gameLineups.gameId, input.id),
    })
    const homeLineup = lineups.filter((l) => l.teamId === game.homeTeamId)
    const awayLineup = lineups.filter((l) => l.teamId === game.awayTeamId)
    if (homeLineup.length === 0 || awayLineup.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Beide Teams müssen eine Aufstellung haben.",
      })
    }

    const [updated] = await ctx.db
      .update(schema.games)
      .set({
        status: "completed",
        finalizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.games.id, input.id))
      .returning()

    // Increment servedGames for active suspensions
    // Exclude suspensions from THIS game (they count starting from the next game)
    await ctx.db
      .update(schema.gameSuspensions)
      .set({
        servedGames: sql`${schema.gameSuspensions.servedGames} + 1`,
      })
      .where(
        and(
          ne(schema.gameSuspensions.gameId, input.id),
          sql`${schema.gameSuspensions.servedGames} < ${schema.gameSuspensions.suspendedGames}`,
          or(eq(schema.gameSuspensions.teamId, game.homeTeamId), eq(schema.gameSuspensions.teamId, game.awayTeamId)),
        ),
      )

    // Generate goalie game stats from lineups + goals
    const goalieLineups = lineups.filter((l) => l.isStartingGoalie)
    if (goalieLineups.length > 0) {
      // Count goals per team from game events
      const goalEvents = await ctx.db.query.gameEvents.findMany({
        where: and(eq(schema.gameEvents.gameId, input.id), eq(schema.gameEvents.eventType, "goal")),
        columns: { teamId: true },
      })
      const goalsByTeam = new Map<string, number>()
      for (const e of goalEvents) {
        goalsByTeam.set(e.teamId, (goalsByTeam.get(e.teamId) ?? 0) + 1)
      }

      // Delete existing goalie stats for this game (in case of re-complete after reopen)
      await ctx.db.delete(schema.goalieGameStats).where(eq(schema.goalieGameStats.gameId, input.id))

      const goalieStatsValues = goalieLineups.map((gl) => {
        // Goals against = goals scored by the OTHER team
        const opponentTeamId = gl.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId
        return {
          gameId: input.id,
          playerId: gl.playerId,
          teamId: gl.teamId,
          goalsAgainst: goalsByTeam.get(opponentTeamId) ?? 0,
        }
      })
      if (goalieStatsValues.length > 0) {
        await ctx.db.insert(schema.goalieGameStats).values(goalieStatsValues)
      }
    }

    // Recalculate standings for the round
    await recalculateStandings(ctx.db, game.roundId)

    // Recalculate player and goalie stats for the season
    const seasonId = await getSeasonIdFromRound(ctx.db, game.roundId)
    if (seasonId) {
      await recalculatePlayerStats(ctx.db, seasonId)
      await recalculateGoalieStats(ctx.db, seasonId)
    }

    return updated
  }),

  cancel: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const game = await ctx.db.query.games.findFirst({
      where: eq(schema.games.id, input.id),
    })
    if (!game) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Spiel nicht gefunden." })
    }
    if (game.status !== "scheduled") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nur geplante Spiele können abgesagt werden.",
      })
    }

    // Remove all game report data (lineups, events, suspensions) and reset scores
    await ctx.db.delete(schema.gameSuspensions).where(eq(schema.gameSuspensions.gameId, input.id))
    await ctx.db.delete(schema.gameEvents).where(eq(schema.gameEvents.gameId, input.id))
    await ctx.db.delete(schema.gameLineups).where(eq(schema.gameLineups.gameId, input.id))

    const [updated] = await ctx.db
      .update(schema.games)
      .set({
        status: "cancelled",
        homeScore: null,
        awayScore: null,
        finalizedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.games.id, input.id))
      .returning()

    return updated
  }),

  reopen: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const game = await ctx.db.query.games.findFirst({
      where: eq(schema.games.id, input.id),
    })
    if (!game) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Spiel nicht gefunden." })
    }
    if (game.status !== "completed" && game.status !== "cancelled") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nur abgeschlossene oder abgesagte Spiele können wieder geöffnet werden.",
      })
    }

    const wasCompleted = game.status === "completed"

    // Only decrement suspensions if we're reopening a completed game
    if (wasCompleted) {
      await ctx.db
        .update(schema.gameSuspensions)
        .set({
          servedGames: sql`GREATEST(${schema.gameSuspensions.servedGames} - 1, 0)`,
        })
        .where(
          and(
            ne(schema.gameSuspensions.gameId, input.id),
            sql`${schema.gameSuspensions.servedGames} > 0`,
            or(eq(schema.gameSuspensions.teamId, game.homeTeamId), eq(schema.gameSuspensions.teamId, game.awayTeamId)),
          ),
        )
    }

    const [updated] = await ctx.db
      .update(schema.games)
      .set({
        status: "scheduled",
        finalizedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.games.id, input.id))
      .returning()

    // Recalculate standings and stats if reopening from completed
    if (wasCompleted) {
      await recalculateStandings(ctx.db, game.roundId)
      const seasonId = await getSeasonIdFromRound(ctx.db, game.roundId)
      if (seasonId) {
        await recalculatePlayerStats(ctx.db, seasonId)
        await recalculateGoalieStats(ctx.db, seasonId)
      }
    }

    return updated
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
