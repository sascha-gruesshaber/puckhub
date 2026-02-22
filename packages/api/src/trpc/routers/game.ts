import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
import { generateRoundRobin } from "../../services/schedulerService"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgProcedure, requireRole, router } from "../init"

const gameStatusValues = ["scheduled", "completed", "cancelled"] as const

/** Resolve the seasonId from a roundId (round -> division -> season). */
async function getSeasonIdFromRound(db: any, roundId: string): Promise<string | null> {
  const round = await db.round.findUnique({
    where: { id: roundId },
    select: { divisionId: true },
  })
  if (!round) return null
  const division = await db.division.findUnique({
    where: { id: round.divisionId },
    select: { seasonId: true },
  })
  return division?.seasonId ?? null
}

async function assertTeamsAllowedForRound(ctx: { db: any }, roundId: string, homeTeamId: string, awayTeamId: string) {
  if (homeTeamId === awayTeamId) {
    throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_TEAMS_IDENTICAL)
  }

  const round = await ctx.db.round.findUnique({
    where: { id: roundId },
  })

  if (!round) {
    throw createAppError("NOT_FOUND", APP_ERROR_CODES.ROUND_NOT_FOUND)
  }

  const rows = await ctx.db.teamDivision.findMany({
    where: {
      divisionId: round.divisionId,
      teamId: { in: [homeTeamId, awayTeamId] },
    },
    select: { teamId: true },
  })

  const teamIds = new Set(rows.map((r: any) => r.teamId))
  if (!teamIds.has(homeTeamId) || !teamIds.has(awayTeamId)) {
    throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_TEAMS_NOT_IN_DIVISION)
  }
}

export const gameRouter = router({
  listByRound: orgProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.game.findMany({
      where: {
        roundId: input.roundId,
        organizationId: ctx.organizationId,
      },
      orderBy: [{ scheduledAt: "asc" }, { gameNumber: "asc" }],
    })
  }),

  listForSeason: orgProcedure
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
      const divisionWhere: any = {
        seasonId: input.seasonId,
        organizationId: ctx.organizationId,
      }
      if (input.divisionId) divisionWhere.id = input.divisionId

      const divisions = await ctx.db.division.findMany({
        where: divisionWhere,
      })

      const divisionIds = divisions.map((d: any) => d.id)
      if (divisionIds.length === 0) return []

      const roundWhere: any = {
        divisionId: { in: divisionIds },
      }
      if (input.roundId) roundWhere.id = input.roundId

      const rounds = await ctx.db.round.findMany({
        where: roundWhere,
      })
      const roundIds = rounds.map((r: any) => r.id)
      if (roundIds.length === 0) return []

      const gameWhere: any = {
        roundId: { in: roundIds },
        organizationId: ctx.organizationId,
      }

      if (input.teamId) {
        gameWhere.OR = [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }]
      }
      if (input.status) gameWhere.status = input.status
      if (input.unscheduledOnly) gameWhere.scheduledAt = null
      if (input.from || input.to) {
        gameWhere.scheduledAt = {}
        if (input.from) gameWhere.scheduledAt.gte = new Date(input.from)
        if (input.to) gameWhere.scheduledAt.lte = new Date(input.to)
      }

      const games = await ctx.db.game.findMany({
        where: gameWhere,
        include: {
          round: {
            select: {
              id: true,
              name: true,
              roundType: true,
              sortOrder: true,
              divisionId: true,
              division: { select: { id: true, name: true, sortOrder: true } },
            },
          },
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          venue: { select: { id: true, name: true, city: true } },
        },
        orderBy: [{ scheduledAt: "asc" }, { gameNumber: "asc" }, { createdAt: "asc" }],
      })

      return games
    }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.game.findFirst({
      where: {
        id: input.id,
        organizationId: ctx.organizationId,
      },
      include: {
        round: {
          include: {
            division: true,
          },
        },
        homeTeam: true,
        awayTeam: true,
        venue: true,
      },
    })
  }),

  create: orgProcedure
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
      // game_manager: check for both teams
      requireRole(ctx, "game_manager", input.homeTeamId)
      await assertTeamsAllowedForRound(ctx, input.roundId, input.homeTeamId, input.awayTeamId)
      const homeTeam = await ctx.db.team.findUnique({
        where: { id: input.homeTeamId },
        select: { defaultVenueId: true },
      })

      const game = await ctx.db.game.create({
        data: {
          organizationId: ctx.organizationId,
          roundId: input.roundId,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          venueId: input.venueId ?? homeTeam?.defaultVenueId ?? undefined,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          gameNumber: input.gameNumber,
          notes: input.notes,
        },
      })

      return game
    }),

  update: orgProcedure
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

      const existing = await ctx.db.game.findUnique({
        where: { id },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
      }

      // game_manager: check for both teams of the game
      if (
        !ctx.hasRole("game_manager", existing.homeTeamId) &&
        !ctx.hasRole("game_manager", existing.awayTeamId)
      ) {
        requireRole(ctx, "game_manager")
      }

      if (existing.status === "completed" || existing.status === "cancelled") {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_NOT_EDITABLE)
      }

      const nextRoundId = data.roundId ?? existing.roundId
      const nextHomeTeamId = data.homeTeamId ?? existing.homeTeamId
      const nextAwayTeamId = data.awayTeamId ?? existing.awayTeamId
      await assertTeamsAllowedForRound(ctx, nextRoundId, nextHomeTeamId, nextAwayTeamId)

      const game = await ctx.db.game.update({
        where: { id },
        data: {
          ...data,
          scheduledAt:
            data.scheduledAt === undefined ? undefined : data.scheduledAt ? new Date(data.scheduledAt) : null,
          updatedAt: new Date(),
        },
      })

      return game
    }),

  complete: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const game = await ctx.db.game.findUnique({
      where: { id: input.id },
    })
    if (!game) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
    }

    // game_manager: check for either team
    if (!ctx.hasRole("game_manager", game.homeTeamId) && !ctx.hasRole("game_manager", game.awayTeamId)) {
      requireRole(ctx, "game_manager")
    }

    if (game.status === "completed" || game.status === "cancelled") {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_ALREADY_FINALIZED)
    }

    // Validate both teams have at least 1 player in lineups
    const lineups = await ctx.db.gameLineup.findMany({
      where: { gameId: input.id },
    })
    const homeLineup = lineups.filter((l: any) => l.teamId === game.homeTeamId)
    const awayLineup = lineups.filter((l: any) => l.teamId === game.awayTeamId)
    if (homeLineup.length === 0 || awayLineup.length === 0) {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_LINEUPS_MISSING)
    }

    const updated = await ctx.db.game.update({
      where: { id: input.id },
      data: {
        status: "completed",
        finalizedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Increment servedGames for active suspensions
    // Exclude suspensions from THIS game (they count starting from the next game)
    await ctx.db.$executeRaw`
      UPDATE game_suspensions
      SET served_games = served_games + 1
      WHERE game_id != ${input.id}
        AND served_games < suspended_games
        AND (team_id = ${game.homeTeamId} OR team_id = ${game.awayTeamId})
    `

    // Generate goalie game stats from lineups + goals
    const goalieLineups = lineups.filter((l: any) => l.isStartingGoalie)
    if (goalieLineups.length > 0) {
      // Count goals per team from game events
      const goalEvents = await ctx.db.gameEvent.findMany({
        where: { gameId: input.id, eventType: "goal" },
        select: { teamId: true },
      })
      const goalsByTeam = new Map<string, number>()
      for (const e of goalEvents) {
        goalsByTeam.set(e.teamId, (goalsByTeam.get(e.teamId) ?? 0) + 1)
      }

      // Delete existing goalie stats for this game (in case of re-complete after reopen)
      await ctx.db.goalieGameStat.deleteMany({ where: { gameId: input.id } })

      const goalieStatsValues = goalieLineups.map((gl: any) => {
        // Goals against = goals scored by the OTHER team
        const opponentTeamId = gl.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId
        return {
          organizationId: ctx.organizationId,
          gameId: input.id,
          playerId: gl.playerId,
          teamId: gl.teamId,
          goalsAgainst: goalsByTeam.get(opponentTeamId) ?? 0,
        }
      })
      if (goalieStatsValues.length > 0) {
        await ctx.db.goalieGameStat.createMany({ data: goalieStatsValues })
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

  cancel: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const game = await ctx.db.game.findUnique({
      where: { id: input.id },
    })
    if (!game) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
    }

    // game_manager: check for either team
    if (!ctx.hasRole("game_manager", game.homeTeamId) && !ctx.hasRole("game_manager", game.awayTeamId)) {
      requireRole(ctx, "game_manager")
    }

    if (game.status !== "scheduled") {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_CANNOT_CANCEL)
    }

    // Remove all game report data (lineups, events, suspensions) and reset scores
    await ctx.db.gameSuspension.deleteMany({ where: { gameId: input.id } })
    await ctx.db.gameEvent.deleteMany({ where: { gameId: input.id } })
    await ctx.db.gameLineup.deleteMany({ where: { gameId: input.id } })

    const updated = await ctx.db.game.update({
      where: { id: input.id },
      data: {
        status: "cancelled",
        homeScore: null,
        awayScore: null,
        finalizedAt: null,
        updatedAt: new Date(),
      },
    })

    return updated
  }),

  reopen: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const game = await ctx.db.game.findUnique({
      where: { id: input.id },
    })
    if (!game) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
    }

    // game_manager: check for either team
    if (!ctx.hasRole("game_manager", game.homeTeamId) && !ctx.hasRole("game_manager", game.awayTeamId)) {
      requireRole(ctx, "game_manager")
    }

    if (game.status !== "completed" && game.status !== "cancelled") {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_CANNOT_REOPEN)
    }

    const wasCompleted = game.status === "completed"

    // Only decrement suspensions if we're reopening a completed game
    if (wasCompleted) {
      await ctx.db.$executeRaw`
        UPDATE game_suspensions
        SET served_games = GREATEST(served_games - 1, 0)
        WHERE game_id != ${input.id}
          AND served_games > 0
          AND (team_id = ${game.homeTeamId} OR team_id = ${game.awayTeamId})
      `
    }

    const updated = await ctx.db.game.update({
      where: { id: input.id },
      data: {
        status: "scheduled",
        finalizedAt: null,
        updatedAt: new Date(),
      },
    })

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

  generateDoubleRoundRobin: orgProcedure
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
      requireRole(ctx, "game_manager")

      const division = await ctx.db.division.findUnique({
        where: { id: input.divisionId },
      })

      if (!division || division.seasonId !== input.seasonId) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_DIVISION_SEASON_MISMATCH)
      }

      const round = await ctx.db.round.findUnique({
        where: { id: input.roundId },
      })
      if (!round || round.divisionId !== input.divisionId) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_ROUND_DIVISION_MISMATCH)
      }

      const assignments = await ctx.db.teamDivision.findMany({
        where: { divisionId: input.divisionId },
        select: { teamId: true },
      })

      const teamIds = Array.from(new Set(assignments.map((a: any) => a.teamId)))
      if (teamIds.length < 2) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.GAME_INSUFFICIENT_TEAMS)
      }

      const fixtures = generateRoundRobin(teamIds)

      const existingGames = await ctx.db.game.findMany({
        where: {
          roundId: input.roundId,
          organizationId: ctx.organizationId,
        },
      })
      const existingPairs = new Set(existingGames.map((g: any) => `${g.homeTeamId}::${g.awayTeamId}`))

      const startAt = input.schedulingTemplate?.startAt ? new Date(input.schedulingTemplate.startAt) : null
      const cadenceDays = input.schedulingTemplate?.cadenceDays ?? 7

      const values: Array<any> = []
      let skippedExisting = 0

      for (let i = 0; i < fixtures.length; i++) {
        const fixture = fixtures[i]!
        const key = `${fixture.homeTeamId}::${fixture.awayTeamId}`
        if (existingPairs.has(key)) {
          skippedExisting++
          continue
        }

        values.push({
          organizationId: ctx.organizationId,
          roundId: input.roundId,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          gameNumber: i + 1,
          scheduledAt: startAt != null ? new Date(startAt.getTime() + i * cadenceDays * 24 * 60 * 60 * 1000) : null,
        })
      }

      // Prisma createMany doesn't return created records, so we use a transaction with individual creates
      let created: any[] = []
      if (values.length > 0) {
        created = await ctx.db.$transaction(values.map((v: any) => ctx.db.game.create({ data: v })))
      }

      return {
        totalFixtures: fixtures.length,
        createdCount: created.length,
        skippedExisting,
        created,
      }
    }),

  deleteMany: orgProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx, "game_manager")
      await ctx.db.game.deleteMany({ where: { id: { in: input.ids } } })
      return { success: true }
    }),

  delete: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    requireRole(ctx, "game_manager")
    await ctx.db.game.delete({ where: { id: input.id } })
  }),
})
