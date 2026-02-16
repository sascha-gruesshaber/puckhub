import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq, or, sql } from "drizzle-orm"
import { aliasedTable } from "drizzle-orm/alias"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

/** Verify the game is not completed or cancelled before allowing report modifications */
async function assertGameEditable(db: any, gameId: string) {
  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
    columns: { status: true },
  })
  if (!game) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Spiel nicht gefunden." })
  }
  if (game.status === "completed" || game.status === "cancelled") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Abgeschlossene oder abgesagte Spiele können nicht bearbeitet werden.",
    })
  }
}

/** Recalculate homeScore/awayScore from goal events */
async function recalculateScore(db: any, gameId: string) {
  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, gameId),
    columns: { homeTeamId: true, awayTeamId: true },
  })
  if (!game) return

  const goals = await db.query.gameEvents.findMany({
    where: and(eq(schema.gameEvents.gameId, gameId), eq(schema.gameEvents.eventType, "goal")),
    columns: { teamId: true },
  })

  let homeScore = 0
  let awayScore = 0
  for (const g of goals) {
    if (g.teamId === game.homeTeamId) homeScore++
    else awayScore++
  }

  await db.update(schema.games).set({ homeScore, awayScore, updatedAt: new Date() }).where(eq(schema.games.id, gameId))
}

export const gameReportRouter = router({
  getPenaltyTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.penaltyTypes.findMany({
      orderBy: (pt: any, { asc }: any) => [asc(pt.code)],
    })
  }),

  getReport: publicProcedure.input(z.object({ gameId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const game = await ctx.db.query.games.findFirst({
      where: eq(schema.games.id, input.gameId),
      with: {
        round: { with: { division: true } },
        homeTeam: true,
        awayTeam: true,
        venue: true,
        events: {
          with: {
            team: true,
            scorer: true,
            assist1: true,
            assist2: true,
            goalie: true,
            penaltyPlayer: true,
            penaltyType: true,
            suspension: true,
          },
          orderBy: (e: any, { asc }: any) => [asc(e.period), asc(e.timeMinutes), asc(e.timeSeconds)],
        },
        lineups: {
          with: { player: true, team: true },
        },
        suspensions: {
          with: { player: true, team: true, gameEvent: true },
        },
      },
    })

    if (!game) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Spiel nicht gefunden." })
    }

    // Active suspensions for both teams (from OTHER games, same season only)
    const currentSeasonId = game.round.division.seasonId
    const originHomeTeam = aliasedTable(schema.teams, "origin_home_team")
    const originAwayTeam = aliasedTable(schema.teams, "origin_away_team")

    const rawSuspensions = await ctx.db
      .select({
        id: schema.gameSuspensions.id,
        playerId: schema.gameSuspensions.playerId,
        teamId: schema.gameSuspensions.teamId,
        suspensionType: schema.gameSuspensions.suspensionType,
        suspendedGames: schema.gameSuspensions.suspendedGames,
        reason: schema.gameSuspensions.reason,
        gameId: schema.gameSuspensions.gameId,
        playerFirstName: schema.players.firstName,
        playerLastName: schema.players.lastName,
        gameScheduledAt: schema.games.scheduledAt,
        gameHomeTeamName: originHomeTeam.name,
        gameAwayTeamName: originAwayTeam.name,
      })
      .from(schema.gameSuspensions)
      .innerJoin(schema.players, eq(schema.gameSuspensions.playerId, schema.players.id))
      .innerJoin(schema.games, eq(schema.gameSuspensions.gameId, schema.games.id))
      .innerJoin(schema.rounds, eq(schema.games.roundId, schema.rounds.id))
      .innerJoin(schema.divisions, eq(schema.rounds.divisionId, schema.divisions.id))
      .innerJoin(originHomeTeam, eq(schema.games.homeTeamId, originHomeTeam.id))
      .innerJoin(originAwayTeam, eq(schema.games.awayTeamId, originAwayTeam.id))
      .where(
        and(
          sql`${schema.gameSuspensions.gameId} != ${input.gameId}`,
          eq(schema.divisions.seasonId, currentSeasonId),
          or(eq(schema.gameSuspensions.teamId, game.homeTeamId), eq(schema.gameSuspensions.teamId, game.awayTeamId)),
        ),
      )

    // Compute served games: count completed games between suspension origin and current game
    const activeSuspensions: Array<(typeof rawSuspensions)[number] & { servedGames: number }> = []
    for (const suspension of rawSuspensions) {
      const originDate = suspension.gameScheduledAt
      const currentDate = game.scheduledAt
      if (!originDate || !currentDate) {
        // Can't compute without dates — assume 0 served
        if (suspension.suspendedGames > 0) {
          activeSuspensions.push({ ...suspension, servedGames: 0 })
        }
        continue
      }

      const [result] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.games)
        .innerJoin(schema.rounds, eq(schema.games.roundId, schema.rounds.id))
        .innerJoin(schema.divisions, eq(schema.rounds.divisionId, schema.divisions.id))
        .where(
          and(
            eq(schema.divisions.seasonId, currentSeasonId),
            or(eq(schema.games.homeTeamId, suspension.teamId), eq(schema.games.awayTeamId, suspension.teamId)),
            sql`${schema.games.scheduledAt} > ${originDate.toISOString()}::timestamptz`,
            sql`${schema.games.scheduledAt} < ${currentDate.toISOString()}::timestamptz`,
            sql`${schema.games.homeScore} IS NOT NULL`,
            sql`${schema.games.id} != ${suspension.gameId}`,
            sql`${schema.games.id} != ${input.gameId}`,
          ),
        )

      const servedGames = result?.count ?? 0
      if (servedGames < suspension.suspendedGames) {
        activeSuspensions.push({ ...suspension, servedGames })
      }
    }

    return { ...game, activeSuspensions }
  }),

  getRosters: publicProcedure
    .input(
      z.object({
        homeTeamId: z.string().uuid(),
        awayTeamId: z.string().uuid(),
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const season = await ctx.db.query.seasons.findFirst({
        where: eq(schema.seasons.id, input.seasonId),
      })
      if (!season) return { home: [], away: [] }

      // Get contracts active for this season, filtered to the two teams
      const seasonEnd = season.seasonEnd.toISOString()
      const seasonStart = season.seasonStart.toISOString()

      const allContracts = await ctx.db.query.contracts.findMany({
        where: and(
          or(eq(schema.contracts.teamId, input.homeTeamId), eq(schema.contracts.teamId, input.awayTeamId)),
          sql`${schema.contracts.startSeasonId} IN (
            SELECT id FROM seasons WHERE season_start <= ${seasonEnd}::timestamptz
          )`,
          sql`(${schema.contracts.endSeasonId} IS NULL OR ${schema.contracts.endSeasonId} IN (
            SELECT id FROM seasons WHERE season_end >= ${seasonStart}::timestamptz
          ))`,
        ),
        with: { player: true },
      })

      const home = allContracts.filter((c) => c.teamId === input.homeTeamId)
      const away = allContracts.filter((c) => c.teamId === input.awayTeamId)

      return { home, away }
    }),

  setLineup: adminProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        players: z.array(
          z.object({
            playerId: z.string().uuid(),
            teamId: z.string().uuid(),
            position: z.enum(["forward", "defense", "goalie"]),
            jerseyNumber: z.number().int().nullable().optional(),
            isStartingGoalie: z.boolean().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertGameEditable(ctx.db, input.gameId)
      await ctx.db.transaction(async (tx: any) => {
        await tx.delete(schema.gameLineups).where(eq(schema.gameLineups.gameId, input.gameId))

        if (input.players.length > 0) {
          await tx.insert(schema.gameLineups).values(
            input.players.map((p) => ({
              gameId: input.gameId,
              playerId: p.playerId,
              teamId: p.teamId,
              position: p.position,
              jerseyNumber: p.jerseyNumber ?? null,
              isStartingGoalie: p.isStartingGoalie ?? false,
            })),
          )
        }
      })

      return { success: true }
    }),

  addEvent: adminProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        eventType: z.enum(["goal", "penalty"]),
        teamId: z.string().uuid(),
        period: z.number().int().min(1),
        timeMinutes: z.number().int().min(0).max(20),
        timeSeconds: z.number().int().min(0).max(59),
        // Goal fields
        scorerId: z.string().uuid().optional(),
        assist1Id: z.string().uuid().optional(),
        assist2Id: z.string().uuid().optional(),
        goalieId: z.string().uuid().optional(),
        // Penalty fields
        penaltyPlayerId: z.string().uuid().optional(),
        penaltyTypeId: z.string().uuid().optional(),
        penaltyMinutes: z.number().int().optional(),
        penaltyDescription: z.string().optional(),
        // Suspension (optional, for penalties)
        suspension: z
          .object({
            suspensionType: z.enum(["match_penalty", "game_misconduct"]),
            suspendedGames: z.number().int().min(1).default(1),
            reason: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertGameEditable(ctx.db, input.gameId)
      const { suspension, ...eventData } = input

      const [event] = await ctx.db
        .insert(schema.gameEvents)
        .values({
          gameId: eventData.gameId,
          eventType: eventData.eventType,
          teamId: eventData.teamId,
          period: eventData.period,
          timeMinutes: eventData.timeMinutes,
          timeSeconds: eventData.timeSeconds,
          scorerId: eventData.scorerId ?? null,
          assist1Id: eventData.assist1Id ?? null,
          assist2Id: eventData.assist2Id ?? null,
          goalieId: eventData.goalieId ?? null,
          penaltyPlayerId: eventData.penaltyPlayerId ?? null,
          penaltyTypeId: eventData.penaltyTypeId ?? null,
          penaltyMinutes: eventData.penaltyMinutes ?? null,
          penaltyDescription: eventData.penaltyDescription ?? null,
        })
        .returning()

      // Create suspension if included
      if (suspension && eventData.penaltyPlayerId && event) {
        await ctx.db.insert(schema.gameSuspensions).values({
          gameId: eventData.gameId,
          gameEventId: event.id,
          playerId: eventData.penaltyPlayerId,
          teamId: eventData.teamId,
          suspensionType: suspension.suspensionType,
          suspendedGames: suspension.suspendedGames,
          reason: suspension.reason ?? null,
        })
      }

      // Recalculate score for goals
      if (eventData.eventType === "goal") {
        await recalculateScore(ctx.db, eventData.gameId)
      }

      return event
    }),

  updateEvent: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        teamId: z.string().uuid().optional(),
        period: z.number().int().min(1).optional(),
        timeMinutes: z.number().int().min(0).max(20).optional(),
        timeSeconds: z.number().int().min(0).max(59).optional(),
        scorerId: z.string().uuid().nullable().optional(),
        assist1Id: z.string().uuid().nullable().optional(),
        assist2Id: z.string().uuid().nullable().optional(),
        goalieId: z.string().uuid().nullable().optional(),
        penaltyPlayerId: z.string().uuid().nullable().optional(),
        penaltyTypeId: z.string().uuid().nullable().optional(),
        penaltyMinutes: z.number().int().nullable().optional(),
        penaltyDescription: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.query.gameEvents.findFirst({
        where: eq(schema.gameEvents.id, id),
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ereignis nicht gefunden." })
      }
      await assertGameEditable(ctx.db, existing.gameId)

      const [updated] = await ctx.db.update(schema.gameEvents).set(data).where(eq(schema.gameEvents.id, id)).returning()

      if (existing.eventType === "goal") {
        await recalculateScore(ctx.db, existing.gameId)
      }

      return updated
    }),

  deleteEvent: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.gameEvents.findFirst({
      where: eq(schema.gameEvents.id, input.id),
    })
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Ereignis nicht gefunden." })
    }
    await assertGameEditable(ctx.db, existing.gameId)

    // Cascade: delete linked suspension first
    await ctx.db.delete(schema.gameSuspensions).where(eq(schema.gameSuspensions.gameEventId, input.id))

    await ctx.db.delete(schema.gameEvents).where(eq(schema.gameEvents.id, input.id))

    if (existing.eventType === "goal") {
      await recalculateScore(ctx.db, existing.gameId)
    }

    return { success: true }
  }),

  addSuspension: adminProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        playerId: z.string().uuid(),
        teamId: z.string().uuid(),
        suspensionType: z.enum(["match_penalty", "game_misconduct"]),
        suspendedGames: z.number().int().min(1).default(1),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertGameEditable(ctx.db, input.gameId)
      const [suspension] = await ctx.db
        .insert(schema.gameSuspensions)
        .values({
          gameId: input.gameId,
          playerId: input.playerId,
          teamId: input.teamId,
          suspensionType: input.suspensionType,
          suspendedGames: input.suspendedGames,
          reason: input.reason ?? null,
        })
        .returning()

      return suspension
    }),

  updateSuspension: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        suspensionType: z.enum(["match_penalty", "game_misconduct"]).optional(),
        suspendedGames: z.number().int().min(1).optional(),
        reason: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.query.gameSuspensions.findFirst({
        where: eq(schema.gameSuspensions.id, id),
        columns: { gameId: true },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sperre nicht gefunden." })
      }
      await assertGameEditable(ctx.db, existing.gameId)

      const [updated] = await ctx.db
        .update(schema.gameSuspensions)
        .set(data)
        .where(eq(schema.gameSuspensions.id, id))
        .returning()

      return updated
    }),

  deleteSuspension: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.gameSuspensions.findFirst({
      where: eq(schema.gameSuspensions.id, input.id),
      columns: { gameId: true },
    })
    if (existing) {
      await assertGameEditable(ctx.db, existing.gameId)
    }

    await ctx.db.delete(schema.gameSuspensions).where(eq(schema.gameSuspensions.id, input.id))

    return { success: true }
  }),
})
