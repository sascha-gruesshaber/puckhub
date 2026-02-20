import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, count, eq, ne } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const venueRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const venues = await ctx.db.query.venues.findMany({
      with: {
        defaultForTeams: {
          columns: {
            id: true,
            name: true,
            shortName: true,
          },
          orderBy: (teams, { asc }) => [asc(teams.name)],
          limit: 1,
        },
      },
      where: eq(schema.venues.organizationId, ctx.organizationId),
      orderBy: (venues, { asc }) => [asc(venues.name), asc(venues.city)],
    })

    return venues.map((venue) => ({
      ...venue,
      defaultTeam: venue.defaultForTeams[0] ?? null,
    }))
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        city: z.string().nullish(),
        address: z.string().nullish(),
        defaultTeamId: z.string().uuid().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [venue] = await tx
          .insert(schema.venues)
          .values({
            organizationId: ctx.organizationId,
            name: input.name.trim(),
            city: input.city?.trim() || null,
            address: input.address?.trim() || null,
          })
          .returning()

        if (!venue) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create venue." })
        }

        if (input.defaultTeamId) {
          await tx
            .update(schema.teams)
            .set({ defaultVenueId: venue.id, updatedAt: new Date() })
            .where(eq(schema.teams.id, input.defaultTeamId))
        }

        return venue
      })
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        city: z.string().nullish(),
        address: z.string().nullish(),
        defaultTeamId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const { id, defaultTeamId, ...rest } = input
        const [venue] = await tx
          .update(schema.venues)
          .set({
            ...rest,
            name: rest.name?.trim(),
            city: rest.city === undefined ? undefined : rest.city?.trim() || null,
            address: rest.address === undefined ? undefined : rest.address?.trim() || null,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.venues.id, id), eq(schema.venues.organizationId, ctx.organizationId)))
          .returning()

        if (defaultTeamId !== undefined) {
          if (defaultTeamId === null) {
            await tx
              .update(schema.teams)
              .set({ defaultVenueId: null, updatedAt: new Date() })
              .where(eq(schema.teams.defaultVenueId, id))
          } else {
            await tx
              .update(schema.teams)
              .set({ defaultVenueId: null, updatedAt: new Date() })
              .where(and(eq(schema.teams.defaultVenueId, id), ne(schema.teams.id, defaultTeamId)))

            await tx
              .update(schema.teams)
              .set({ defaultVenueId: id, updatedAt: new Date() })
              .where(eq(schema.teams.id, defaultTeamId))
          }
        }

        return venue
      })
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({ usageCount: count() })
      .from(schema.games)
      .where(eq(schema.games.venueId, input.id))
    const usageCount = rows[0]?.usageCount ?? 0

    if (usageCount > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Venue cannot be deleted (${usageCount} assigned games).`,
      })
    }

    await ctx.db
      .update(schema.teams)
      .set({ defaultVenueId: null, updatedAt: new Date() })
      .where(eq(schema.teams.defaultVenueId, input.id))

    await ctx.db
      .delete(schema.venues)
      .where(and(eq(schema.venues.id, input.id), eq(schema.venues.organizationId, ctx.organizationId)))
    return { success: true }
  }),
})
