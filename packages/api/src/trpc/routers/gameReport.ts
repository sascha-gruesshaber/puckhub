import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq, or, sql } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

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

    // Active suspensions for both teams (from OTHER games)
    const activeSuspensions = await ctx.db
      .select({
        id: schema.gameSuspensions.id,
        playerId: schema.gameSuspensions.playerId,
        teamId: schema.gameSuspensions.teamId,
        suspensionType: schema.gameSuspensions.suspensionType,
        suspendedGames: schema.gameSuspensions.suspendedGames,
        servedGames: schema.gameSuspensions.servedGames,
        reason: schema.gameSuspensions.reason,
        playerFirstName: schema.players.firstName,
        playerLastName: schema.players.lastName,
      })
      .from(schema.gameSuspensions)
      .innerJoin(schema.players, eq(schema.gameSuspensions.playerId, schema.players.id))
      .where(
        and(
          sql`${schema.gameSuspensions.servedGames} < ${schema.gameSuspensions.suspendedGames}`,
          sql`${schema.gameSuspensions.gameId} != ${input.gameId}`,
        ),
      )

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
      const [updated] = await ctx.db
        .update(schema.gameSuspensions)
        .set(data)
        .where(eq(schema.gameSuspensions.id, id))
        .returning()

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sperre nicht gefunden." })
      }

      return updated
    }),

  deleteSuspension: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.gameSuspensions).where(eq(schema.gameSuspensions.id, input.id))

    return { success: true }
  }),
})
