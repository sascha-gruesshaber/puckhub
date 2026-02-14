import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm"
import { aliasedTable } from "drizzle-orm/alias"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

// Alias for the end_season self-join on the seasons table
const endSeason = aliasedTable(schema.seasons, "end_season")

export const contractRouter = router({
  /**
   * Get the roster for a specific team in a specific season.
   * Returns contracts where the season falls within the start/end range,
   * with nested player and season data.
   */
  rosterForSeason: publicProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        seasonId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const targetSeason = await ctx.db.query.seasons.findFirst({
        where: eq(schema.seasons.id, input.seasonId),
      })
      if (!targetSeason) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saison nicht gefunden" })
      }

      const rows = await ctx.db
        .select({
          id: schema.contracts.id,
          playerId: schema.contracts.playerId,
          teamId: schema.contracts.teamId,
          position: schema.contracts.position,
          jerseyNumber: schema.contracts.jerseyNumber,
          startSeasonId: schema.contracts.startSeasonId,
          endSeasonId: schema.contracts.endSeasonId,
          createdAt: schema.contracts.createdAt,
          updatedAt: schema.contracts.updatedAt,
          player: {
            id: schema.players.id,
            firstName: schema.players.firstName,
            lastName: schema.players.lastName,
            dateOfBirth: schema.players.dateOfBirth,
            nationality: schema.players.nationality,
            photoUrl: schema.players.photoUrl,
          },
        })
        .from(schema.contracts)
        .innerJoin(schema.players, eq(schema.contracts.playerId, schema.players.id))
        .innerJoin(schema.seasons, eq(schema.contracts.startSeasonId, schema.seasons.id))
        .leftJoin(endSeason, eq(schema.contracts.endSeasonId, endSeason.id))
        .where(
          and(
            eq(schema.contracts.teamId, input.teamId),
            lte(schema.seasons.seasonStart, targetSeason.seasonEnd),
            or(isNull(schema.contracts.endSeasonId), gte(endSeason.seasonEnd, targetSeason.seasonStart)),
          ),
        )

      // Drizzle can't infer return type through aliasedTable leftJoin — cast explicitly
      return rows as Array<{
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
  getByPlayer: publicProcedure.input(z.object({ playerId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.contracts.findMany({
      where: eq(schema.contracts.playerId, input.playerId),
      with: {
        team: true,
        startSeason: true,
        endSeason: true,
      },
      orderBy: (contracts, { desc }) => [desc(contracts.createdAt)],
    })
  }),

  /**
   * Sign a player to a team for a given season.
   * Creates a new contract with startSeasonId = the given season.
   */
  signPlayer: adminProcedure
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
      const targetSeason = await ctx.db.query.seasons.findFirst({
        where: eq(schema.seasons.id, input.seasonId),
      })
      if (!targetSeason) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saison nicht gefunden" })
      }

      // Check if player already has an active contract with ANY team for this season
      const existingContracts = await ctx.db
        .select({ id: schema.contracts.id })
        .from(schema.contracts)
        .innerJoin(schema.seasons, eq(schema.contracts.startSeasonId, schema.seasons.id))
        .leftJoin(endSeason, eq(schema.contracts.endSeasonId, endSeason.id))
        .where(
          and(
            eq(schema.contracts.playerId, input.playerId),
            lte(schema.seasons.seasonStart, targetSeason.seasonEnd),
            or(isNull(schema.contracts.endSeasonId), gte(endSeason.seasonEnd, targetSeason.seasonStart)),
          ),
        )

      if (existingContracts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Spieler hat bereits einen aktiven Vertrag in dieser Saison",
        })
      }

      const [contract] = await ctx.db
        .insert(schema.contracts)
        .values({
          playerId: input.playerId,
          teamId: input.teamId,
          startSeasonId: input.seasonId,
          position: input.position,
          jerseyNumber: input.jerseyNumber,
        })
        .returning()

      return contract
    }),

  /**
   * Transfer a player from one team to another.
   * Closes the old contract and creates a new one in a transaction.
   */
  transferPlayer: adminProcedure
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
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.contracts.findFirst({
          where: eq(schema.contracts.id, input.contractId),
        })
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vertrag nicht gefunden" })
        }

        const transferSeason = await tx.query.seasons.findFirst({
          where: eq(schema.seasons.id, input.seasonId),
        })
        if (!transferSeason) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Saison nicht gefunden" })
        }

        // Find the season before this one for closing the old contract
        const previousSeason = await tx.query.seasons.findFirst({
          where: lt(schema.seasons.seasonEnd, transferSeason.seasonStart),
          orderBy: (seasons, { desc }) => [desc(seasons.seasonEnd)],
        })

        // Close old contract
        await tx
          .update(schema.contracts)
          .set({
            endSeasonId: previousSeason?.id ?? input.seasonId,
            updatedAt: new Date(),
          })
          .where(eq(schema.contracts.id, input.contractId))

        // Create new contract
        const [newContract] = await tx
          .insert(schema.contracts)
          .values({
            playerId: existing.playerId,
            teamId: input.newTeamId,
            startSeasonId: input.seasonId,
            position: input.position ?? existing.position,
            jerseyNumber: input.jerseyNumber,
          })
          .returning()

        return newContract
      })
    }),

  /**
   * Release a player by closing their contract.
   */
  releasePlayer: adminProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        seasonId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.contracts.findFirst({
        where: eq(schema.contracts.id, input.contractId),
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vertrag nicht gefunden" })
      }
      if (existing.endSeasonId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vertrag ist bereits beendet",
        })
      }

      const [updated] = await ctx.db
        .update(schema.contracts)
        .set({ endSeasonId: input.seasonId, updatedAt: new Date() })
        .where(eq(schema.contracts.id, input.contractId))
        .returning()

      return updated
    }),

  /**
   * Update contract details (position, jersey number).
   */
  updateContract: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        position: z.enum(["forward", "defense", "goalie"]).optional(),
        jerseyNumber: z.number().int().positive().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (data.position !== undefined) updateData.position = data.position
      if (data.jerseyNumber !== undefined) updateData.jerseyNumber = data.jerseyNumber

      const [updated] = await ctx.db
        .update(schema.contracts)
        .set(updateData)
        .where(eq(schema.contracts.id, id))
        .returning()

      return updated
    }),
})
