import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { orgProcedure, requireRole, router } from "../init"

export const contractRouter = router({
  /**
   * Get the roster for ALL teams in a specific season.
   * Returns contracts with nested player and team data.
   */
  rosterForSeasonAllTeams: orgProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const targetSeason = await ctx.db.season.findFirst({
        where: {
          id: input.seasonId,
          organizationId: ctx.organizationId,
        },
      })
      if (!targetSeason) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)
      }

      const contracts = await ctx.db.contract.findMany({
        where: {
          organizationId: ctx.organizationId,
          startSeason: {
            seasonStart: { lte: targetSeason.seasonEnd },
          },
          OR: [
            { endSeasonId: null },
            {
              endSeason: {
                seasonEnd: { gte: targetSeason.seasonStart },
              },
            },
          ],
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              nationality: true,
              photoUrl: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              logoUrl: true,
              primaryColor: true,
            },
          },
        },
      })

      return contracts.map((c: any) => ({
        id: c.id,
        playerId: c.playerId,
        teamId: c.teamId,
        position: c.position,
        jerseyNumber: c.jerseyNumber,
        startSeasonId: c.startSeasonId,
        endSeasonId: c.endSeasonId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        player: c.player,
        team: c.team,
      })) as Array<{
        id: string
        playerId: string
        teamId: string
        position: string
        jerseyNumber: number | null
        startSeasonId: string
        endSeasonId: string | null
        createdAt: Date
        updatedAt: Date
        player: {
          id: string
          firstName: string
          lastName: string
          dateOfBirth: Date | null
          nationality: string | null
          photoUrl: string | null
        }
        team: {
          id: string
          name: string
          shortName: string
          logoUrl: string | null
          primaryColor: string | null
        }
      }>
    }),

  /**
   * Get the roster for a specific team in a specific season.
   * Returns contracts where the season falls within the start/end range,
   * with nested player and season data.
   */
  rosterForSeason: orgProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const targetSeason = await ctx.db.season.findFirst({
        where: {
          id: input.seasonId,
          organizationId: ctx.organizationId,
        },
      })
      if (!targetSeason) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)
      }

      // Fetch contracts with their start season, end season, and player included
      const contracts = await ctx.db.contract.findMany({
        where: {
          organizationId: ctx.organizationId,
          teamId: input.teamId,
          startSeason: {
            seasonStart: { lte: targetSeason.seasonEnd },
          },
          OR: [
            { endSeasonId: null },
            {
              endSeason: {
                seasonEnd: { gte: targetSeason.seasonStart },
              },
            },
          ],
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              nationality: true,
              photoUrl: true,
            },
          },
        },
      })

      return contracts.map((c: any) => ({
        id: c.id,
        playerId: c.playerId,
        teamId: c.teamId,
        position: c.position,
        jerseyNumber: c.jerseyNumber,
        startSeasonId: c.startSeasonId,
        endSeasonId: c.endSeasonId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        player: c.player,
      })) as Array<{
        id: string
        playerId: string
        teamId: string
        position: string
        jerseyNumber: number | null
        startSeasonId: string
        endSeasonId: string | null
        createdAt: Date
        updatedAt: Date
        player: {
          id: string
          firstName: string
          lastName: string
          dateOfBirth: Date | null
          nationality: string | null
          photoUrl: string | null
        }
      }>
    }),

  /**
   * Get contract history for a specific player.
   */
  getByPlayer: orgProcedure.input(z.object({ playerId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.contract.findMany({
      where: {
        playerId: input.playerId,
        organizationId: ctx.organizationId,
      },
      include: {
        team: true,
        startSeason: true,
        endSeason: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  /**
   * Sign a player to a team for a given season.
   * Creates a new contract with startSeasonId = the given season.
   */
  signPlayer: orgProcedure
    .input(
      z.object({
        playerId: z.string().uuid(),
        teamId: z.string().uuid(),
        seasonId: z.string().uuid(),
        position: z.enum(["forward", "defense", "goalie"]),
        jerseyNumber: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // team_manager can sign players to their team
      requireRole(ctx, "team_manager", input.teamId)

      const targetSeason = await ctx.db.season.findFirst({
        where: {
          id: input.seasonId,
          organizationId: ctx.organizationId,
        },
      })
      if (!targetSeason) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)
      }

      // Check if player already has an active contract with the SAME team for this season
      const existingContracts = await ctx.db.contract.findMany({
        where: {
          organizationId: ctx.organizationId,
          playerId: input.playerId,
          teamId: input.teamId,
          startSeason: {
            seasonStart: { lte: targetSeason.seasonEnd },
          },
          OR: [
            { endSeasonId: null },
            {
              endSeason: {
                seasonEnd: { gte: targetSeason.seasonStart },
              },
            },
          ],
        },
        select: { id: true },
      })

      if (existingContracts.length > 0) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.CONTRACT_ALREADY_ACTIVE)
      }

      const contract = await ctx.db.contract.create({
        data: {
          organizationId: ctx.organizationId,
          playerId: input.playerId,
          teamId: input.teamId,
          startSeasonId: input.seasonId,
          position: input.position,
          jerseyNumber: input.jerseyNumber,
        },
      })

      return contract
    }),

  /**
   * Transfer a player from one team to another.
   * Closes the old contract and creates a new one in a transaction.
   */
  transferPlayer: orgProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        newTeamId: z.string().uuid(),
        seasonId: z.string().uuid(),
        position: z.enum(["forward", "defense", "goalie"]).optional(),
        jerseyNumber: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // team_manager for the new team
      requireRole(ctx, "team_manager", input.newTeamId)

      return ctx.db.$transaction(async (tx: any) => {
        const existing = await tx.contract.findFirst({
          where: {
            id: input.contractId,
            organizationId: ctx.organizationId,
          },
        })
        if (!existing) {
          throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)
        }

        const transferSeason = await tx.season.findFirst({
          where: {
            id: input.seasonId,
            organizationId: ctx.organizationId,
          },
        })
        if (!transferSeason) {
          throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)
        }

        // Find the season before this one for closing the old contract
        const previousSeason = await tx.season.findFirst({
          where: {
            organizationId: ctx.organizationId,
            seasonEnd: { lt: transferSeason.seasonStart },
          },
          orderBy: { seasonEnd: "desc" },
        })

        // Close old contract
        await tx.contract.update({
          where: { id: input.contractId },
          data: {
            endSeasonId: previousSeason?.id ?? input.seasonId,
            updatedAt: new Date(),
          },
        })

        // Create new contract
        const newContract = await tx.contract.create({
          data: {
            organizationId: ctx.organizationId,
            playerId: existing.playerId,
            teamId: input.newTeamId,
            startSeasonId: input.seasonId,
            position: input.position ?? existing.position,
            jerseyNumber: input.jerseyNumber,
          },
        })

        return newContract
      })
    }),

  /**
   * Release a player by closing their contract.
   */
  releasePlayer: orgProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        seasonId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contract.findFirst({
        where: {
          id: input.contractId,
          organizationId: ctx.organizationId,
        },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)
      }

      // team_manager for the contract's team
      requireRole(ctx, "team_manager", existing.teamId)

      if (existing.endSeasonId) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.CONTRACT_ALREADY_ENDED)
      }

      const updated = await ctx.db.contract.update({
        where: { id: input.contractId },
        data: { endSeasonId: input.seasonId, updatedAt: new Date() },
      })

      return updated
    }),

  /**
   * Reopen a closed contract by removing the endSeasonId.
   */
  reopenContract: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { nextContract: { select: { id: true } } },
    })
    if (!existing) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)
    }
    if (!existing.endSeasonId) {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.CONTRACT_ALREADY_ACTIVE)
    }
    // Reopening the earlier half of a split would put the player on two contracts at the
    // same team at once — the spell continues in the successor contract.
    if (existing.nextContract) {
      throw createAppError("CONFLICT", APP_ERROR_CODES.CONTRACT_ALREADY_ACTIVE)
    }

    requireRole(ctx, "team_manager", existing.teamId)

    return ctx.db.contract.update({
      where: { id: input.id },
      data: { endSeasonId: null, updatedAt: new Date() },
    })
  }),

  /**
   * Update contract details (position, jersey number).
   */
  updateContract: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        position: z.enum(["forward", "defense", "goalie"]).optional(),
        jerseyNumber: z.number().int().positive().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.contract.findFirst({
        where: { id, organizationId: ctx.organizationId },
        select: { teamId: true },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)
      }

      // team_manager for the contract's team
      requireRole(ctx, "team_manager", existing.teamId)

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (data.position !== undefined) updateData.position = data.position
      if (data.jerseyNumber !== undefined) updateData.jerseyNumber = data.jerseyNumber

      const updated = await ctx.db.contract.update({
        where: { id },
        data: updateData,
      })

      return updated
    }),

  /**
   * Split a contract at a season boundary.
   *
   * Used when something that is stored on the contract changed part-way through a
   * player's spell at a team — most often the position (a goalie who moved to
   * forward), or the jersey number. The legacy leagues PuckHub imports from keep no
   * such history, so migrated players carry one contract with today's values for
   * their whole career; splitting restores what was actually true per season.
   *
   * The original contract is closed at the season before `splitAtSeasonId` and a new
   * contract takes over from that season, keeping the original end season. The new
   * contract points back at the old one via `previousContractId`, so roster change
   * lists show one uninterrupted spell instead of a departure and a re-signing.
   */
  splitContract: orgProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        splitAtSeasonId: z.string().uuid(),
        position: z.enum(["forward", "defense", "goalie"]).optional(),
        jerseyNumber: z.number().int().positive().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contract.findFirst({
        where: { id: input.contractId, organizationId: ctx.organizationId },
        include: { startSeason: true, endSeason: true },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)
      }

      requireRole(ctx, "team_manager", existing.teamId)

      const splitSeason = await ctx.db.season.findFirst({
        where: { id: input.splitAtSeasonId, organizationId: ctx.organizationId },
      })
      if (!splitSeason) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)
      }

      // The change has to take effect after the contract started (otherwise there is
      // nothing to keep) and no later than the season it ended in.
      const startsAfterContractStart = splitSeason.seasonStart > existing.startSeason.seasonStart
      const endsWithinContract = !existing.endSeason || splitSeason.seasonStart <= existing.endSeason.seasonStart
      if (!startsAfterContractStart || !endsWithinContract) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.CONTRACT_SPLIT_INVALID_SEASON)
      }

      const previousSeason = await ctx.db.season.findFirst({
        where: {
          organizationId: ctx.organizationId,
          seasonEnd: { lt: splitSeason.seasonStart },
        },
        orderBy: { seasonEnd: "desc" },
      })
      if (!previousSeason) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.CONTRACT_SPLIT_INVALID_SEASON)
      }

      const collision = await ctx.db.contract.findFirst({
        where: {
          organizationId: ctx.organizationId,
          playerId: existing.playerId,
          teamId: existing.teamId,
          startSeasonId: splitSeason.id,
        },
        select: { id: true },
      })
      if (collision) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.CONTRACT_ALREADY_ACTIVE)
      }

      // With overlapping season ranges the season before the split can predate the
      // contract itself; the earlier half then covers its start season alone.
      const earlierEndSeasonId =
        previousSeason.seasonEnd >= existing.startSeason.seasonEnd ? previousSeason.id : existing.startSeasonId

      return ctx.db.$transaction(async (tx: any) => {
        const earlier = await tx.contract.update({
          where: { id: existing.id },
          data: { endSeasonId: earlierEndSeasonId, updatedAt: new Date() },
        })

        const later = await tx.contract.create({
          data: {
            organizationId: ctx.organizationId,
            playerId: existing.playerId,
            teamId: existing.teamId,
            startSeasonId: splitSeason.id,
            endSeasonId: existing.endSeasonId,
            position: input.position ?? existing.position,
            jerseyNumber: input.jerseyNumber === undefined ? existing.jerseyNumber : input.jerseyNumber,
            previousContractId: existing.id,
          },
        })

        return { earlier, later }
      })
    }),

  /**
   * Permanently delete a contract and clean up related game data
   * (lineups, stats, suspensions) for that player+team within the contract's season range.
   */
  deleteContract: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { startSeason: true, endSeason: true },
    })
    if (!existing) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.CONTRACT_NOT_FOUND)
    }

    requireRole(ctx, "team_manager", existing.teamId)

    const { playerId, teamId, organizationId } = existing
    const seasonStart = existing.startSeason.seasonStart
    const seasonEnd = existing.endSeason?.seasonEnd ?? new Date("2099-12-31")

    // Find all games within the contract's season range for this team
    const gamesInRange = await ctx.db.game.findMany({
      where: {
        organizationId,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        round: {
          division: {
            season: {
              seasonStart: { lte: seasonEnd },
              seasonEnd: { gte: seasonStart },
            },
          },
        },
      },
      select: { id: true },
    })
    const gameIds = gamesInRange.map((g) => g.id)

    await ctx.db.$transaction(async (tx: any) => {
      // Remove lineups for this player in these games
      if (gameIds.length > 0) {
        await tx.gameLineup.deleteMany({
          where: { playerId, teamId, gameId: { in: gameIds }, organizationId },
        })
      }

      // Remove season stats for this player+team in overlapping seasons
      const overlappingSeasons = await tx.season.findMany({
        where: {
          organizationId,
          seasonStart: { lte: seasonEnd },
          seasonEnd: { gte: seasonStart },
        },
        select: { id: true },
      })
      const seasonIds = overlappingSeasons.map((s: any) => s.id)

      if (seasonIds.length > 0) {
        await tx.playerSeasonStat.deleteMany({
          where: { playerId, teamId, seasonId: { in: seasonIds }, organizationId },
        })
        await tx.goalieSeasonStat.deleteMany({
          where: { playerId, teamId, seasonId: { in: seasonIds }, organizationId },
        })
      }

      // Delete the contract
      await tx.contract.delete({ where: { id: input.id } })
    })
  }),
})
