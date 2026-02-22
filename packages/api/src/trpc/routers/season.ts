import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { orgAdminProcedure, orgProcedure, router } from '../init'

const dateInputRegex = /^\d{4}-\d{2}-\d{2}$/
const seasonDateSchema = z.string().regex(dateInputRegex)

function toSeasonStart(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function toSeasonEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`)
}

function validateSeasonRange(start: string, end: string) {
  return toSeasonStart(start).getTime() <= toSeasonEnd(end).getTime()
}

async function resolveCurrentSeason(db: any, organizationId: string) {
  const now = new Date()

  const inRange = await db.season.findFirst({
    where: {
      organizationId,
      seasonStart: { lte: now },
      seasonEnd: { gte: now },
    },
    orderBy: { seasonStart: 'desc' },
  })
  if (inRange) return inRange

  const latestPast = await db.season.findFirst({
    where: {
      organizationId,
      seasonEnd: { lte: now },
    },
    orderBy: { seasonEnd: 'desc' },
  })
  if (latestPast) return latestPast

  return db.season.findFirst({
    where: { organizationId },
    orderBy: { seasonStart: 'asc' },
  })
}

export const seasonRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.season.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { seasonStart: 'desc' },
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.season.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  getCurrent: orgProcedure.query(async ({ ctx }) => {
    return resolveCurrentSeason(ctx.db, ctx.organizationId)
  }),

  create: orgAdminProcedure
    .input(
      z
        .object({
          name: z.string().min(1),
          seasonStart: seasonDateSchema,
          seasonEnd: seasonDateSchema,
        })
        .refine((v) => validateSeasonRange(v.seasonStart, v.seasonEnd), {
          message: 'seasonStart must be before or equal to seasonEnd',
          path: ['seasonEnd'],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.season.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          seasonStart: toSeasonStart(input.seasonStart),
          seasonEnd: toSeasonEnd(input.seasonEnd),
        },
      })
      return season
    }),

  update: orgAdminProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          name: z.string().min(1).optional(),
          seasonStart: seasonDateSchema.optional(),
          seasonEnd: seasonDateSchema.optional(),
        })
        .refine(
          (v) => {
            if (!v.seasonStart || !v.seasonEnd) return true
            return validateSeasonRange(v.seasonStart, v.seasonEnd)
          },
          {
            message: 'seasonStart must be before or equal to seasonEnd',
            path: ['seasonEnd'],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (data.name !== undefined) updateData.name = data.name
      if (data.seasonStart !== undefined) updateData.seasonStart = toSeasonStart(data.seasonStart)
      if (data.seasonEnd !== undefined) updateData.seasonEnd = toSeasonEnd(data.seasonEnd)

      if (data.seasonStart !== undefined || data.seasonEnd !== undefined) {
        const existing = await ctx.db.season.findFirst({
          where: { id, organizationId: ctx.organizationId },
        })
        if (!existing) return undefined
        const start = data.seasonStart ? toSeasonStart(data.seasonStart) : existing.seasonStart
        const end = data.seasonEnd ? toSeasonEnd(data.seasonEnd) : existing.seasonEnd
        if (start.getTime() > end.getTime()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'seasonStart must be before or equal to seasonEnd',
          })
        }
      }

      const season = await ctx.db.season.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: updateData,
      })

      // Return the updated record if it was found
      if (season.count === 0) return undefined
      return ctx.db.season.findFirst({ where: { id, organizationId: ctx.organizationId } })
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.season.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  structureCounts: orgProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.division.groupBy({
      by: ['seasonId'],
      where: { organizationId: ctx.organizationId },
      _count: { id: true },
    })
    const map: Record<string, number> = {}
    for (const row of rows) {
      map[row.seasonId] = row._count.id
    }
    return map
  }),

  scaffoldFromTemplate: orgAdminProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        template: z.enum(['standard', 'copy']),
        sourceSeasonId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.template === 'standard') {
        // Create one division "Hauptrunde" with one regular round, assign all teams
        const division = await ctx.db.division.create({
          data: {
            organizationId: ctx.organizationId,
            seasonId: input.seasonId,
            name: 'Liga',
            sortOrder: 0,
          },
        })

        await ctx.db.round.create({
          data: {
            organizationId: ctx.organizationId,
            divisionId: division.id,
            name: 'Hauptrunde',
            roundType: 'regular',
            sortOrder: 0,
            pointsWin: 2,
            pointsDraw: 1,
            pointsLoss: 0,
          },
        })

        // Assign all teams belonging to this org
        const allTeams = await ctx.db.team.findMany({
          where: { organizationId: ctx.organizationId },
        })
        if (allTeams.length > 0) {
          await ctx.db.teamDivision.createMany({
            data: allTeams.map((t: any) => ({
              organizationId: ctx.organizationId,
              teamId: t.id,
              divisionId: division.id,
            })),
          })
        }

        return { divisionsCreated: 1, roundsCreated: 1, teamsAssigned: allTeams.length }
      }

      if (input.template === 'copy' && input.sourceSeasonId) {
        // Copy structure from another season
        const sourceDivisions = await ctx.db.division.findMany({
          where: {
            seasonId: input.sourceSeasonId,
            organizationId: ctx.organizationId,
          },
          orderBy: { sortOrder: 'asc' },
        })

        let divisionsCreated = 0
        let roundsCreated = 0
        let teamsAssigned = 0

        for (const srcDiv of sourceDivisions) {
          const newDiv = await ctx.db.division.create({
            data: {
              organizationId: ctx.organizationId,
              seasonId: input.seasonId,
              name: srcDiv.name,
              sortOrder: srcDiv.sortOrder,
            },
          })
          divisionsCreated++

          // Copy rounds
          const srcRounds = await ctx.db.round.findMany({
            where: {
              divisionId: srcDiv.id,
              organizationId: ctx.organizationId,
            },
            orderBy: { sortOrder: 'asc' },
          })

          for (const srcRound of srcRounds) {
            await ctx.db.round.create({
              data: {
                organizationId: ctx.organizationId,
                divisionId: newDiv.id,
                name: srcRound.name,
                roundType: srcRound.roundType,
                sortOrder: srcRound.sortOrder,
                pointsWin: srcRound.pointsWin,
                pointsDraw: srcRound.pointsDraw,
                pointsLoss: srcRound.pointsLoss,
              },
            })
            roundsCreated++
          }

          // Copy team assignments
          const srcAssignments = await ctx.db.teamDivision.findMany({
            where: {
              divisionId: srcDiv.id,
              organizationId: ctx.organizationId,
            },
            select: { teamId: true },
          })

          if (srcAssignments.length > 0) {
            await ctx.db.teamDivision.createMany({
              data: srcAssignments.map((a: any) => ({
                organizationId: ctx.organizationId,
                teamId: a.teamId,
                divisionId: newDiv.id,
              })),
            })
            teamsAssigned += srcAssignments.length
          }
        }

        return { divisionsCreated, roundsCreated, teamsAssigned }
      }

      return { divisionsCreated: 0, roundsCreated: 0, teamsAssigned: 0 }
    }),

  getFullStructure: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const season = await ctx.db.season.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
    if (!season) return null

    const divisions = await ctx.db.division.findMany({
      where: {
        seasonId: input.id,
        organizationId: ctx.organizationId,
      },
      orderBy: { sortOrder: 'asc' },
    })

    const divisionIds = divisions.map((d: any) => d.id)

    let rounds: any[] = []
    let teamAssignments: {
      id: string
      teamId: string
      divisionId: string
      createdAt: Date
      team: {
        id: string
        name: string
        shortName: string
        city: string | null
        logoUrl: string | null
        primaryColor: string | null
        contactName: string | null
        website: string | null
        defaultVenueId: string | null
      }
    }[] = []

    if (divisionIds.length > 0) {
      rounds = await ctx.db.round.findMany({
        where: {
          divisionId: { in: divisionIds },
          organizationId: ctx.organizationId,
        },
        orderBy: { sortOrder: 'asc' },
      })

      const rawAssignments = await ctx.db.teamDivision.findMany({
        where: {
          divisionId: { in: divisionIds },
          organizationId: ctx.organizationId,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              city: true,
              logoUrl: true,
              primaryColor: true,
              contactName: true,
              website: true,
              defaultVenueId: true,
            },
          },
        },
      })

      teamAssignments = rawAssignments.map((a: any) => ({
        id: a.id,
        teamId: a.teamId,
        divisionId: a.divisionId,
        createdAt: a.createdAt,
        team: a.team,
      }))
    }

    return { season, divisions, rounds, teamAssignments }
  }),
})
