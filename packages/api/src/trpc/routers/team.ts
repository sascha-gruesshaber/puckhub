import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgAdminProcedure, orgProcedure, requireRole, router } from "../init"
import { checkLimit, getOrgPlan } from "../../services/planLimits"

export const teamRouter = router({
  list: orgProcedure
    .input(z.object({ seasonId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const seasonId = input?.seasonId
      return ctx.db.team.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(seasonId ? { teamDivisions: { some: { division: { seasonId } } } } : {}),
        },
        include: {
          teamTrikots: {
            include: { trikot: { include: { template: true } } },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      })
    }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.team.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        shortName: z.string().min(1),
        city: z.string().optional(),
        logoUrl: z.string().optional(),
        teamPhotoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        website: z.string().url().optional(),
        homeVenue: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await getOrgPlan(ctx.db, ctx.organizationId)
      const count = await ctx.db.team.count({ where: { organizationId: ctx.organizationId } })
      checkLimit(plan, "maxTeams", count)

      const team = await ctx.db.team.create({
        data: { ...input, organizationId: ctx.organizationId },
      })
      return team
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        city: z.string().nullish(),
        logoUrl: z.string().nullish(),
        teamPhotoUrl: z.string().nullish(),
        primaryColor: z.string().nullish(),
        contactName: z.string().nullish(),
        contactEmail: z.string().email().nullish(),
        contactPhone: z.string().nullish(),
        website: z.string().url().nullish(),
        homeVenue: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // team_manager can update their own team
      requireRole(ctx, "team_manager", id)

      const updateResult = await ctx.db.team.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, updatedAt: new Date() },
      })

      if (updateResult.count === 0) return undefined
      return ctx.db.team.findFirst({ where: { id, organizationId: ctx.organizationId } })
    }),

  /**
   * Remove a team from all divisions in a specific season.
   * The team stays in the system but is no longer part of the season structure.
   */
  removeFromSeason: orgAdminProcedure
    .input(z.object({ teamId: z.string().uuid(), seasonId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const season = await ctx.db.season.findFirst({
        where: { id: input.seasonId, organizationId: ctx.organizationId },
      })
      if (!season) throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)

      const divisions = await ctx.db.division.findMany({
        where: { seasonId: input.seasonId, organizationId: ctx.organizationId },
        select: { id: true },
      })

      if (divisions.length > 0) {
        await ctx.db.teamDivision.deleteMany({
          where: {
            teamId: input.teamId,
            divisionId: { in: divisions.map((d) => d.id) },
            organizationId: ctx.organizationId,
          },
        })
      }
    }),

  history: orgProcedure.input(z.object({ teamId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { teamId } = input
    const orgId = ctx.organizationId

    const [team, teamDivisions, contracts, allScorers, allGoalies] = await Promise.all([
      ctx.db.team.findFirst({
        where: { id: teamId, organizationId: orgId },
      }),
      ctx.db.teamDivision.findMany({
        where: { teamId, organizationId: orgId },
        include: {
          division: {
            include: {
              season: true,
              rounds: {
                include: {
                  standings: { where: { teamId }, take: 1 },
                },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      }),
      ctx.db.contract.findMany({
        where: { teamId, organizationId: orgId },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          startSeason: true,
          endSeason: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.playerSeasonStat.findMany({
        where: { teamId, organizationId: orgId },
        include: {
          player: { select: { firstName: true, lastName: true } },
        },
        orderBy: { totalPoints: "desc" },
      }),
      ctx.db.goalieSeasonStat.findMany({
        where: { teamId, organizationId: orgId },
        include: {
          player: { select: { firstName: true, lastName: true } },
        },
        orderBy: { gaa: "asc" },
      }),
    ])

    if (!team) return null

    // Group teamDivisions by season
    const seasonMap = new Map<
      string,
      {
        season: { id: string; name: string; seasonStart: Date; seasonEnd: Date }
        divisions: Array<{
          id: string
          name: string
          rounds: Array<{
            id: string
            name: string
            roundType: string
            standing: {
              gamesPlayed: number
              wins: number
              draws: number
              losses: number
              goalsFor: number
              goalsAgainst: number
              goalDifference: number
              points: number
              totalPoints: number
              rank: number | null
            } | null
          }>
        }>
      }
    >()

    for (const td of teamDivisions) {
      const s = td.division.season
      if (!seasonMap.has(s.id)) {
        seasonMap.set(s.id, {
          season: { id: s.id, name: s.name, seasonStart: s.seasonStart, seasonEnd: s.seasonEnd },
          divisions: [],
        })
      }
      seasonMap.get(s.id)!.divisions.push({
        id: td.division.id,
        name: td.division.name,
        rounds: td.division.rounds.map((r) => ({
          id: r.id,
          name: r.name,
          roundType: r.roundType,
          standing: r.standings[0]
            ? {
                gamesPlayed: r.standings[0].gamesPlayed,
                wins: r.standings[0].wins,
                draws: r.standings[0].draws,
                losses: r.standings[0].losses,
                goalsFor: r.standings[0].goalsFor,
                goalsAgainst: r.standings[0].goalsAgainst,
                goalDifference: r.standings[0].goalDifference,
                points: r.standings[0].points,
                totalPoints: r.standings[0].totalPoints,
                rank: r.standings[0].rank,
              }
            : null,
        })),
      })
    }

    // Compute totals + best rank per season
    const seasons = Array.from(seasonMap.values())
      .map((entry) => {
        let gp = 0,
          w = 0,
          d = 0,
          l = 0,
          gf = 0,
          ga = 0
        let bestRank: number | null = null
        let bestRankRoundType: string | null = null

        for (const div of entry.divisions) {
          for (const round of div.rounds) {
            if (round.standing) {
              gp += round.standing.gamesPlayed
              w += round.standing.wins
              d += round.standing.draws
              l += round.standing.losses
              gf += round.standing.goalsFor
              ga += round.standing.goalsAgainst
              if (round.standing.rank != null && (bestRank === null || round.standing.rank < bestRank)) {
                bestRank = round.standing.rank
                bestRankRoundType = round.roundType
              }
            }
          }
        }

        return {
          ...entry,
          totals: {
            gamesPlayed: gp,
            wins: w,
            draws: d,
            losses: l,
            goalsFor: gf,
            goalsAgainst: ga,
            goalDifference: gf - ga,
          },
          bestRank,
          bestRankRoundType,
        }
      })
      .sort((a, b) => new Date(b.season.seasonStart).getTime() - new Date(a.season.seasonStart).getTime())

    // Top 3 scorers per season
    const scorersBySeason = new Map<string, typeof allScorers>()
    for (const s of allScorers) {
      const arr = scorersBySeason.get(s.seasonId) ?? []
      if (arr.length < 3) {
        arr.push(s)
        scorersBySeason.set(s.seasonId, arr)
      }
    }

    // Best goalie per season (lowest GAA)
    const goaliesBySeason = new Map<string, (typeof allGoalies)[0]>()
    for (const g of allGoalies) {
      if (!goaliesBySeason.has(g.seasonId)) {
        goaliesBySeason.set(g.seasonId, g)
      }
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        city: team.city,
        logoUrl: team.logoUrl,
        teamPhotoUrl: team.teamPhotoUrl,
        homeVenue: team.homeVenue,
        primaryColor: team.primaryColor,
      },
      seasons,
      contracts,
      topScorers: Array.from(scorersBySeason.values()).flat(),
      topGoalies: Array.from(goaliesBySeason.values()),
    }
  }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.team.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
