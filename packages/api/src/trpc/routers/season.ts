import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

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

async function resolveCurrentSeason(db: any) {
  const now = new Date()

  const inRange = await db.query.seasons.findFirst({
    where: and(lte(schema.seasons.seasonStart, now), gte(schema.seasons.seasonEnd, now)),
    orderBy: [desc(schema.seasons.seasonStart)],
  })
  if (inRange) return inRange

  const latestPast = await db.query.seasons.findFirst({
    where: lte(schema.seasons.seasonEnd, now),
    orderBy: [desc(schema.seasons.seasonEnd)],
  })
  if (latestPast) return latestPast

  return db.query.seasons.findFirst({
    orderBy: [asc(schema.seasons.seasonStart)],
  })
}

export const seasonRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.seasons.findMany({
      orderBy: (seasons, { desc }) => [desc(seasons.seasonStart)],
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.seasons.findFirst({
      where: eq(schema.seasons.id, input.id),
    })
  }),

  getCurrent: publicProcedure.query(async ({ ctx }) => {
    return resolveCurrentSeason(ctx.db)
  }),

  create: adminProcedure
    .input(
      z
        .object({
          name: z.string().min(1),
          seasonStart: seasonDateSchema,
          seasonEnd: seasonDateSchema,
        })
        .refine((v) => validateSeasonRange(v.seasonStart, v.seasonEnd), {
          message: "seasonStart must be before or equal to seasonEnd",
          path: ["seasonEnd"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const [season] = await ctx.db
        .insert(schema.seasons)
        .values({
          name: input.name,
          seasonStart: toSeasonStart(input.seasonStart),
          seasonEnd: toSeasonEnd(input.seasonEnd),
        })
        .returning()
      return season
    }),

  update: adminProcedure
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
            message: "seasonStart must be before or equal to seasonEnd",
            path: ["seasonEnd"],
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
        const existing = await ctx.db.query.seasons.findFirst({
          where: eq(schema.seasons.id, id),
        })
        if (!existing) return undefined
        const start = data.seasonStart ? toSeasonStart(data.seasonStart) : existing.seasonStart
        const end = data.seasonEnd ? toSeasonEnd(data.seasonEnd) : existing.seasonEnd
        if (start.getTime() > end.getTime()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "seasonStart must be before or equal to seasonEnd",
          })
        }
      }

      const [season] = await ctx.db.update(schema.seasons).set(updateData).where(eq(schema.seasons.id, id)).returning()
      return season
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.seasons).where(eq(schema.seasons.id, input.id))
  }),

  structureCounts: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        seasonId: schema.divisions.seasonId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.divisions)
      .groupBy(schema.divisions.seasonId)
    const map: Record<string, number> = {}
    for (const row of rows) {
      map[row.seasonId] = row.count
    }
    return map
  }),

  scaffoldFromTemplate: adminProcedure
    .input(
      z.object({
        seasonId: z.string().uuid(),
        template: z.enum(["standard", "copy"]),
        sourceSeasonId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.template === "standard") {
        // Create one division "Hauptrunde" with one regular round, assign all teams
        const [division] = await ctx.db
          .insert(schema.divisions)
          .values({
            seasonId: input.seasonId,
            name: "Liga",
            sortOrder: 0,
          })
          .returning()

        await ctx.db.insert(schema.rounds).values({
          divisionId: division!.id,
          name: "Hauptrunde",
          roundType: "regular",
          sortOrder: 0,
          pointsWin: 2,
          pointsDraw: 1,
          pointsLoss: 0,
        })

        // Assign all teams
        const allTeams = await ctx.db.query.teams.findMany()
        if (allTeams.length > 0) {
          await ctx.db.insert(schema.teamDivisions).values(
            allTeams.map((t) => ({
              teamId: t.id,
              divisionId: division!.id,
            })),
          )
        }

        return { divisionsCreated: 1, roundsCreated: 1, teamsAssigned: allTeams.length }
      }

      if (input.template === "copy" && input.sourceSeasonId) {
        // Copy structure from another season
        const sourceDivisions = await ctx.db.query.divisions.findMany({
          where: eq(schema.divisions.seasonId, input.sourceSeasonId),
          orderBy: [asc(schema.divisions.sortOrder)],
        })

        let divisionsCreated = 0
        let roundsCreated = 0
        let teamsAssigned = 0

        for (const srcDiv of sourceDivisions) {
          const [newDiv] = await ctx.db
            .insert(schema.divisions)
            .values({
              seasonId: input.seasonId,
              name: srcDiv.name,
              sortOrder: srcDiv.sortOrder,
            })
            .returning()
          divisionsCreated++

          // Copy rounds
          const srcRounds = await ctx.db.query.rounds.findMany({
            where: eq(schema.rounds.divisionId, srcDiv.id),
            orderBy: [asc(schema.rounds.sortOrder)],
          })

          for (const srcRound of srcRounds) {
            await ctx.db.insert(schema.rounds).values({
              divisionId: newDiv!.id,
              name: srcRound.name,
              roundType: srcRound.roundType,
              sortOrder: srcRound.sortOrder,
              pointsWin: srcRound.pointsWin,
              pointsDraw: srcRound.pointsDraw,
              pointsLoss: srcRound.pointsLoss,
            })
            roundsCreated++
          }

          // Copy team assignments
          const srcAssignments = await ctx.db
            .select({ teamId: schema.teamDivisions.teamId })
            .from(schema.teamDivisions)
            .where(eq(schema.teamDivisions.divisionId, srcDiv.id))

          if (srcAssignments.length > 0) {
            await ctx.db.insert(schema.teamDivisions).values(
              srcAssignments.map((a) => ({
                teamId: a.teamId,
                divisionId: newDiv!.id,
              })),
            )
            teamsAssigned += srcAssignments.length
          }
        }

        return { divisionsCreated, roundsCreated, teamsAssigned }
      }

      return { divisionsCreated: 0, roundsCreated: 0, teamsAssigned: 0 }
    }),

  getFullStructure: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const season = await ctx.db.query.seasons.findFirst({
      where: eq(schema.seasons.id, input.id),
    })
    if (!season) return null

    const divisions = await ctx.db.query.divisions.findMany({
      where: eq(schema.divisions.seasonId, input.id),
      orderBy: [asc(schema.divisions.sortOrder)],
    })

    const divisionIds = divisions.map((d) => d.id)

    let rounds: (typeof schema.rounds.$inferSelect)[] = []
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
      const allRounds = await Promise.all(
        divisionIds.map((divId) =>
          ctx.db.query.rounds.findMany({
            where: eq(schema.rounds.divisionId, divId),
            orderBy: [asc(schema.rounds.sortOrder)],
          }),
        ),
      )
      rounds = allRounds.flat()

      const allAssignments = await Promise.all(
        divisionIds.map((divId) =>
          ctx.db
            .select({
              id: schema.teamDivisions.id,
              teamId: schema.teamDivisions.teamId,
              divisionId: schema.teamDivisions.divisionId,
              createdAt: schema.teamDivisions.createdAt,
              team: {
                id: schema.teams.id,
                name: schema.teams.name,
                shortName: schema.teams.shortName,
                city: schema.teams.city,
                logoUrl: schema.teams.logoUrl,
                primaryColor: schema.teams.primaryColor,
                contactName: schema.teams.contactName,
                website: schema.teams.website,
                defaultVenueId: schema.teams.defaultVenueId,
              },
            })
            .from(schema.teamDivisions)
            .innerJoin(schema.teams, eq(schema.teamDivisions.teamId, schema.teams.id))
            .where(eq(schema.teamDivisions.divisionId, divId)),
        ),
      )
      teamAssignments = allAssignments.flat()
    }

    return { season, divisions, rounds, teamAssignments }
  }),
})
