import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { orgAdminProcedure, orgProcedure, router } from '../init'

export const contractRouter = router({
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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Saison nicht gefunden' })
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
      orderBy: { createdAt: 'desc' },
    })
  }),

  /**
   * Sign a player to a team for a given season.
   * Creates a new contract with startSeasonId = the given season.
   */
  signPlayer: orgAdminProcedure
    .input(
      z.object({
        playerId: z.string().uuid(),
        teamId: z.string().uuid(),
        seasonId: z.string().uuid(),
        position: z.enum(['forward', 'defense', 'goalie']),
        jerseyNumber: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetSeason = await ctx.db.season.findFirst({
        where: {
          id: input.seasonId,
          organizationId: ctx.organizationId,
        },
      })
      if (!targetSeason) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Saison nicht gefunden' })
      }

      // Check if player already has an active contract with ANY team for this season
      const existingContracts = await ctx.db.contract.findMany({
        where: {
          organizationId: ctx.organizationId,
          playerId: input.playerId,
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
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Spieler hat bereits einen aktiven Vertrag in dieser Saison',
        })
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
  transferPlayer: orgAdminProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        newTeamId: z.string().uuid(),
        seasonId: z.string().uuid(),
        position: z.enum(['forward', 'defense', 'goalie']).optional(),
        jerseyNumber: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx: any) => {
        const existing = await tx.contract.findFirst({
          where: {
            id: input.contractId,
            organizationId: ctx.organizationId,
          },
        })
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Vertrag nicht gefunden' })
        }

        const transferSeason = await tx.season.findFirst({
          where: {
            id: input.seasonId,
            organizationId: ctx.organizationId,
          },
        })
        if (!transferSeason) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Saison nicht gefunden' })
        }

        // Find the season before this one for closing the old contract
        const previousSeason = await tx.season.findFirst({
          where: {
            organizationId: ctx.organizationId,
            seasonEnd: { lt: transferSeason.seasonStart },
          },
          orderBy: { seasonEnd: 'desc' },
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
  releasePlayer: orgAdminProcedure
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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vertrag nicht gefunden' })
      }
      if (existing.endSeasonId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vertrag ist bereits beendet',
        })
      }

      const updated = await ctx.db.contract.update({
        where: { id: input.contractId },
        data: { endSeasonId: input.seasonId, updatedAt: new Date() },
      })

      return updated
    }),

  /**
   * Update contract details (position, jersey number).
   */
  updateContract: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        position: z.enum(['forward', 'defense', 'goalie']).optional(),
        jerseyNumber: z.number().int().positive().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (data.position !== undefined) updateData.position = data.position
      if (data.jerseyNumber !== undefined) updateData.jerseyNumber = data.jerseyNumber

      const updated = await ctx.db.contract.update({
        where: { id },
        data: updateData,
      })

      return updated
    }),
})
