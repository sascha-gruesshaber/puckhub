import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const venueRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const venues = await ctx.db.venue.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        defaultForTeams: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
          orderBy: { name: "asc" },
          take: 1,
        },
      },
      orderBy: [{ name: "asc" }, { city: "asc" }],
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
      return ctx.db.$transaction(async (tx) => {
        const venue = await tx.venue.create({
          data: {
            organizationId: ctx.organizationId,
            name: input.name.trim(),
            city: input.city?.trim() || null,
            address: input.address?.trim() || null,
          },
        })

        if (!venue) {
          throw createAppError("INTERNAL_SERVER_ERROR", APP_ERROR_CODES.VENUE_CREATE_FAILED)
        }

        if (input.defaultTeamId) {
          await tx.team.update({
            where: { id: input.defaultTeamId },
            data: { defaultVenueId: venue.id, updatedAt: new Date() },
          })
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
      return ctx.db.$transaction(async (tx) => {
        const { id, defaultTeamId, ...rest } = input
        const venue = await tx.venue.updateMany({
          where: { id, organizationId: ctx.organizationId },
          data: {
            ...rest,
            name: rest.name?.trim(),
            city: rest.city === undefined ? undefined : rest.city?.trim() || null,
            address: rest.address === undefined ? undefined : rest.address?.trim() || null,
            updatedAt: new Date(),
          },
        })

        if (defaultTeamId !== undefined) {
          if (defaultTeamId === null) {
            await tx.team.updateMany({
              where: { defaultVenueId: id },
              data: { defaultVenueId: null, updatedAt: new Date() },
            })
          } else {
            await tx.team.updateMany({
              where: { defaultVenueId: id, id: { not: defaultTeamId } },
              data: { defaultVenueId: null, updatedAt: new Date() },
            })

            await tx.team.update({
              where: { id: defaultTeamId },
              data: { defaultVenueId: id, updatedAt: new Date() },
            })
          }
        }

        return tx.venue.findFirst({ where: { id, organizationId: ctx.organizationId } })
      })
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const usageCount = await ctx.db.game.count({
      where: { venueId: input.id },
    })

    if (usageCount > 0) {
      throw createAppError("CONFLICT", APP_ERROR_CODES.VENUE_IN_USE)
    }

    await ctx.db.team.updateMany({
      where: { defaultVenueId: input.id },
      data: { defaultVenueId: null, updatedAt: new Date() },
    })

    await ctx.db.venue.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
    return { success: true }
  }),
})
