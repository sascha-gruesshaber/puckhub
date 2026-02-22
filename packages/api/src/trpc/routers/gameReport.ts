import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { type OrgContext, orgProcedure, requireRole, router } from "../init"

/** Verify the game is not completed or cancelled before allowing report modifications */
async function assertGameEditable(db: any, gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: { status: true },
  })
  if (!game) {
    throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
  }
  if (game.status === "completed" || game.status === "cancelled") {
    throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_NOT_EDITABLE)
  }
}

/** Check game_reporter role for a game (either team). */
async function assertGameReporter(ctx: OrgContext & { db: any }, gameId: string) {
  const game = await ctx.db.game.findUnique({
    where: { id: gameId },
    select: { homeTeamId: true, awayTeamId: true },
  })
  if (!game) {
    throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
  }
  if (!ctx.hasRole("game_reporter", game.homeTeamId) && !ctx.hasRole("game_reporter", game.awayTeamId)) {
    requireRole(ctx, "game_reporter")
  }
}

/** Recalculate homeScore/awayScore from goal events */
async function recalculateScore(db: any, gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: { homeTeamId: true, awayTeamId: true },
  })
  if (!game) return

  const goals = await db.gameEvent.findMany({
    where: { gameId, eventType: "goal" },
    select: { teamId: true },
  })

  let homeScore = 0
  let awayScore = 0
  for (const g of goals) {
    if (g.teamId === game.homeTeamId) homeScore++
    else awayScore++
  }

  await db.game.update({
    where: { id: gameId },
    data: { homeScore, awayScore, updatedAt: new Date() },
  })
}

export const gameReportRouter = router({
  getPenaltyTypes: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.penaltyType.findMany({
      orderBy: { code: "asc" },
    })
  }),

  getReport: orgProcedure.input(z.object({ gameId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const game = await ctx.db.game.findFirst({
      where: {
        id: input.gameId,
        organizationId: ctx.organizationId,
      },
      include: {
        round: { include: { division: true } },
        homeTeam: true,
        awayTeam: true,
        venue: true,
        events: {
          include: {
            team: true,
            scorer: true,
            assist1: true,
            assist2: true,
            goalie: true,
            penaltyPlayer: true,
            penaltyType: true,
            suspension: true,
          },
          orderBy: [{ period: "asc" }, { timeMinutes: "asc" }, { timeSeconds: "asc" }],
        },
        lineups: {
          include: { player: true, team: true },
        },
        suspensions: {
          include: { player: true, team: true, gameEvent: true },
        },
      },
    })

    if (!game) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
    }

    // Active suspensions for both teams (from OTHER games, same season only)
    const currentSeasonId = game.round.division.seasonId

    const rawSuspensions = await ctx.db.gameSuspension.findMany({
      where: {
        gameId: { not: input.gameId },
        organizationId: ctx.organizationId,
        OR: [{ teamId: game.homeTeamId }, { teamId: game.awayTeamId }],
        game: {
          round: {
            division: {
              seasonId: currentSeasonId,
            },
          },
        },
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
        game: {
          select: {
            scheduledAt: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
    })

    // Compute served games: count completed games between suspension origin and current game
    const activeSuspensions: Array<{
      id: string
      playerId: string
      teamId: string
      suspensionType: string
      suspendedGames: number
      reason: string | null
      gameId: string
      playerFirstName: string
      playerLastName: string
      gameScheduledAt: Date | null
      gameHomeTeamName: string
      gameAwayTeamName: string
      servedGames: number
    }> = []

    for (const suspension of rawSuspensions) {
      const originDate = suspension.game.scheduledAt
      const currentDate = game.scheduledAt
      if (!originDate || !currentDate) {
        // Can't compute without dates — assume 0 served
        if (suspension.suspendedGames > 0) {
          activeSuspensions.push({
            id: suspension.id,
            playerId: suspension.playerId,
            teamId: suspension.teamId,
            suspensionType: suspension.suspensionType,
            suspendedGames: suspension.suspendedGames,
            reason: suspension.reason,
            gameId: suspension.gameId,
            playerFirstName: suspension.player.firstName,
            playerLastName: suspension.player.lastName,
            gameScheduledAt: suspension.game.scheduledAt,
            gameHomeTeamName: suspension.game.homeTeam.name,
            gameAwayTeamName: suspension.game.awayTeam.name,
            servedGames: 0,
          })
        }
        continue
      }

      const result = await ctx.db.game.count({
        where: {
          round: {
            division: {
              seasonId: currentSeasonId,
            },
          },
          OR: [{ homeTeamId: suspension.teamId }, { awayTeamId: suspension.teamId }],
          scheduledAt: {
            gt: originDate,
            lt: currentDate,
          },
          homeScore: { not: null },
          id: { notIn: [suspension.gameId, input.gameId] },
        },
      })

      const servedGames = result ?? 0
      if (servedGames < suspension.suspendedGames) {
        activeSuspensions.push({
          id: suspension.id,
          playerId: suspension.playerId,
          teamId: suspension.teamId,
          suspensionType: suspension.suspensionType,
          suspendedGames: suspension.suspendedGames,
          reason: suspension.reason,
          gameId: suspension.gameId,
          playerFirstName: suspension.player.firstName,
          playerLastName: suspension.player.lastName,
          gameScheduledAt: suspension.game.scheduledAt,
          gameHomeTeamName: suspension.game.homeTeam.name,
          gameAwayTeamName: suspension.game.awayTeam.name,
          servedGames,
        })
      }
    }

    return { ...game, activeSuspensions }
  }),

  getRosters: orgProcedure
    .input(
      z.object({
        homeTeamId: z.string().uuid(),
        awayTeamId: z.string().uuid(),
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const season = await ctx.db.season.findFirst({
        where: {
          id: input.seasonId,
          organizationId: ctx.organizationId,
        },
      })
      if (!season) return { home: [], away: [] }

      // Get contracts active for this season, filtered to the two teams
      const seasonEnd = season.seasonEnd.toISOString()
      const seasonStart = season.seasonStart.toISOString()

      const allContracts = (await ctx.db.$queryRaw`
        SELECT c.*, row_to_json(p) as player
        FROM contracts c
        JOIN players p ON p.id = c.player_id
        WHERE c.organization_id = ${ctx.organizationId}
          AND (c.team_id = ${input.homeTeamId} OR c.team_id = ${input.awayTeamId})
          AND c.start_season_id IN (
            SELECT id FROM seasons WHERE season_start <= ${seasonEnd}::timestamptz
          )
          AND (c.end_season_id IS NULL OR c.end_season_id IN (
            SELECT id FROM seasons WHERE season_end >= ${seasonStart}::timestamptz
          ))
      `) as any[]

      // Normalize the raw results - parse the player JSON
      const contracts = allContracts.map((c: any) => ({
        ...c,
        player: typeof c.player === "string" ? JSON.parse(c.player) : c.player,
      }))

      const home = contracts.filter((c: any) => c.team_id === input.homeTeamId || c.teamId === input.homeTeamId)
      const away = contracts.filter((c: any) => c.team_id === input.awayTeamId || c.teamId === input.awayTeamId)

      return { home, away }
    }),

  setLineup: orgProcedure
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
      await assertGameReporter(ctx, input.gameId)
      await assertGameEditable(ctx.db, input.gameId)
      await ctx.db.$transaction(async (tx: any) => {
        await tx.gameLineup.deleteMany({ where: { gameId: input.gameId } })

        if (input.players.length > 0) {
          await tx.gameLineup.createMany({
            data: input.players.map((p) => ({
              organizationId: ctx.organizationId,
              gameId: input.gameId,
              playerId: p.playerId,
              teamId: p.teamId,
              position: p.position,
              jerseyNumber: p.jerseyNumber ?? null,
              isStartingGoalie: p.isStartingGoalie ?? false,
            })),
          })
        }
      })

      return { success: true }
    }),

  addEvent: orgProcedure
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
      await assertGameReporter(ctx, input.gameId)
      await assertGameEditable(ctx.db, input.gameId)
      const { suspension, ...eventData } = input

      const event = await ctx.db.gameEvent.create({
        data: {
          organizationId: ctx.organizationId,
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
        },
      })

      // Create suspension if included
      if (suspension && eventData.penaltyPlayerId && event) {
        await ctx.db.gameSuspension.create({
          data: {
            organizationId: ctx.organizationId,
            gameId: eventData.gameId,
            gameEventId: event.id,
            playerId: eventData.penaltyPlayerId,
            teamId: eventData.teamId,
            suspensionType: suspension.suspensionType,
            suspendedGames: suspension.suspendedGames,
            reason: suspension.reason ?? null,
          },
        })
      }

      // Recalculate score for goals
      if (eventData.eventType === "goal") {
        await recalculateScore(ctx.db, eventData.gameId)
      }

      return event
    }),

  updateEvent: orgProcedure
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

      const existing = await ctx.db.gameEvent.findUnique({
        where: { id },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_EVENT_NOT_FOUND)
      }
      await assertGameReporter(ctx, existing.gameId)
      await assertGameEditable(ctx.db, existing.gameId)

      const updated = await ctx.db.gameEvent.update({
        where: { id },
        data,
      })

      if (existing.eventType === "goal") {
        await recalculateScore(ctx.db, existing.gameId)
      }

      return updated
    }),

  deleteEvent: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.gameEvent.findUnique({
      where: { id: input.id },
    })
    if (!existing) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_EVENT_NOT_FOUND)
    }
    await assertGameReporter(ctx, existing.gameId)
    await assertGameEditable(ctx.db, existing.gameId)

    // Cascade: delete linked suspension first
    await ctx.db.gameSuspension.deleteMany({ where: { gameEventId: input.id } })

    await ctx.db.gameEvent.delete({ where: { id: input.id } })

    if (existing.eventType === "goal") {
      await recalculateScore(ctx.db, existing.gameId)
    }

    return { success: true }
  }),

  addSuspension: orgProcedure
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
      await assertGameReporter(ctx, input.gameId)
      await assertGameEditable(ctx.db, input.gameId)
      const suspension = await ctx.db.gameSuspension.create({
        data: {
          organizationId: ctx.organizationId,
          gameId: input.gameId,
          playerId: input.playerId,
          teamId: input.teamId,
          suspensionType: input.suspensionType,
          suspendedGames: input.suspendedGames,
          reason: input.reason ?? null,
        },
      })

      return suspension
    }),

  updateSuspension: orgProcedure
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

      const existing = await ctx.db.gameSuspension.findUnique({
        where: { id },
        select: { gameId: true },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_SUSPENSION_NOT_FOUND)
      }
      await assertGameReporter(ctx, existing.gameId)
      await assertGameEditable(ctx.db, existing.gameId)

      const updated = await ctx.db.gameSuspension.update({
        where: { id },
        data,
      })

      return updated
    }),

  deleteSuspension: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.gameSuspension.findUnique({
      where: { id: input.id },
      select: { gameId: true },
    })
    if (existing) {
      await assertGameReporter(ctx, existing.gameId)
      await assertGameEditable(ctx.db, existing.gameId)
    }

    await ctx.db.gameSuspension.deleteMany({ where: { id: input.id } })

    return { success: true }
  }),
})
