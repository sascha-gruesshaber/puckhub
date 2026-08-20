import type { PrismaClient } from "@puckhub/db"
import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { collectContinuedContractIds, resolveTeamNameForSeason } from "../../services/contractHistory"
import { checkLimit, getOrgPlan } from "../../services/planLimits"
import { TEAM_SCOPED_MERGE_MODELS } from "../../services/teamMerge"
import { orgAdminProcedure, orgProcedure, requireRole, router } from "../init"

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

    const [team, teamDivisions, contracts, allScorers, allGoalies, nameHistory] = await Promise.all([
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
      ctx.db.teamNameHistory.findMany({
        where: { teamId, organizationId: orgId },
        include: { untilSeason: { select: { seasonStart: true, seasonEnd: true } } },
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
          teamName: resolveTeamNameForSeason(team, nameHistory, entry.season),
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
      // Contracts that are continued by a later one — the seam of a split spell, not a
      // departure from the team.
      continuedContractIds: Array.from(collectContinuedContractIds(contracts)),
      formerNames: [...nameHistory]
        .sort((a, b) => b.untilSeason.seasonEnd.getTime() - a.untilSeason.seasonEnd.getTime())
        .map((entry) => ({
          name: entry.name,
          shortName: entry.shortName,
          logoUrl: entry.logoUrl,
          untilSeasonId: entry.untilSeasonId,
        })),
      topScorers: Array.from(scorersBySeason.values()).flat(),
      topGoalies: Array.from(goaliesBySeason.values()),
    }
  }),

  /**
   * Everything the merge of `source` into `target` would touch, plus the reasons it
   * must not happen. Shared by the preview query and the merge itself.
   */
  mergePreview: orgAdminProcedure
    .input(z.object({ sourceTeamId: z.string().uuid(), targetTeamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return collectMergeFacts(ctx.db, ctx.organizationId, input.sourceTeamId, input.targetTeamId)
    }),

  /**
   * Merge one team record into another — the same club under a new name.
   *
   * Legacy systems have no notion of a renamed team: the old club is left behind and a
   * new one is created, with the players moved over by hand. That splits a single
   * franchise into two unrelated rows, so all-time tables, player careers and team
   * history stop at the rename. Merging moves every row that references the source
   * team onto the target, records the old name in `team_name_history` so past seasons
   * still render under it, links the handed-over contracts as continuations, and
   * deletes the now-empty source team.
   *
   * Irreversible — take a backup first.
   */
  merge: orgAdminProcedure
    .input(
      z.object({
        sourceTeamId: z.string().uuid(),
        targetTeamId: z.string().uuid(),
        /** Last season the source name was in use. Defaults to the source team's final season. */
        nameChangeUntilSeasonId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId
      const facts = await collectMergeFacts(ctx.db, orgId, input.sourceTeamId, input.targetTeamId)
      if (!facts.canMerge) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.TEAM_MERGE_CONFLICT)
      }

      const untilSeasonId = input.nameChangeUntilSeasonId ?? facts.suggestedNameChangeSeasonId
      if (input.nameChangeUntilSeasonId) {
        const season = await ctx.db.season.findFirst({
          where: { id: input.nameChangeUntilSeasonId, organizationId: orgId },
          select: { id: true },
        })
        if (!season) throw createAppError("NOT_FOUND", APP_ERROR_CODES.SEASON_NOT_FOUND)
      }

      const { sourceTeamId, targetTeamId } = input

      // Contracts on both sides before anything moves — needed to link the handover.
      const [sourceContracts, targetContracts, seasons] = await Promise.all([
        ctx.db.contract.findMany({
          where: { teamId: sourceTeamId, organizationId: orgId },
          select: { id: true, playerId: true, startSeasonId: true, endSeasonId: true },
        }),
        ctx.db.contract.findMany({
          where: { teamId: targetTeamId, organizationId: orgId },
          select: { id: true, playerId: true, startSeasonId: true, previousContractId: true },
        }),
        ctx.db.season.findMany({
          where: { organizationId: orgId },
          select: { id: true },
          orderBy: { seasonStart: "asc" },
        }),
      ])

      const seasonOrder = new Map(seasons.map((s, index) => [s.id, index]))
      const handovers = planContractHandovers(sourceContracts, targetContracts, seasonOrder)

      const result = await ctx.db.$transaction(async (tx: any) => {
        const scope = { teamId: sourceTeamId, organizationId: orgId }
        const moveTo = { teamId: targetTeamId }

        // Rows the target already owns under a constraint the source would violate.
        // These are configuration, not history — the target's own row wins.
        const targetTrikots = await tx.teamTrikot.findMany({
          where: { teamId: targetTeamId, organizationId: orgId },
          select: { trikotId: true, name: true },
        })
        const takenTrikots = new Set(targetTrikots.map((t: any) => `${t.trikotId}:${t.name}`))
        const sourceTrikots = await tx.teamTrikot.findMany({
          where: scope,
          select: { id: true, trikotId: true, name: true },
        })
        const duplicateTrikotIds = sourceTrikots
          .filter((t: any) => takenTrikots.has(`${t.trikotId}:${t.name}`))
          .map((t: any) => t.id)
        if (duplicateTrikotIds.length > 0) {
          await tx.teamTrikot.deleteMany({ where: { id: { in: duplicateTrikotIds } } })
        }

        const targetRoles = await tx.memberRole.findMany({
          where: { teamId: targetTeamId },
          select: { memberId: true, role: true },
        })
        const takenRoles = new Set(targetRoles.map((r: any) => `${r.memberId}:${r.role}`))
        const sourceRoles = await tx.memberRole.findMany({
          where: { teamId: sourceTeamId },
          select: { id: true, memberId: true, role: true },
        })
        const duplicateRoleIds = sourceRoles
          .filter((r: any) => takenRoles.has(`${r.memberId}:${r.role}`))
          .map((r: any) => r.id)
        if (duplicateRoleIds.length > 0) {
          await tx.memberRole.deleteMany({ where: { id: { in: duplicateRoleIds } } })
        }

        // Move every row that points at the source team. Anything left behind would be
        // cascade-deleted with the team, so the models come from one registry that a
        // test keeps in sync with the schema.
        const moved: Record<string, number> = {}
        for (const model of TEAM_SCOPED_MERGE_MODELS) {
          moved[model] = (await tx[model].updateMany({ where: scope, data: moveTo })).count
        }
        moved.game = (
          await tx.game.updateMany({
            where: { homeTeamId: sourceTeamId, organizationId: orgId },
            data: { homeTeamId: targetTeamId },
          })
        ).count
        moved.game += (
          await tx.game.updateMany({
            where: { awayTeamId: sourceTeamId, organizationId: orgId },
            data: { awayTeamId: targetTeamId },
          })
        ).count
        moved.memberRole = (await tx.memberRole.updateMany({ where: { teamId: sourceTeamId }, data: moveTo })).count

        // The players who were "moved" by hand in the legacy system are one spell now.
        for (const handover of handovers) {
          await tx.contract.update({
            where: { id: handover.laterContractId },
            data: { previousContractId: handover.earlierContractId },
          })
        }

        // Remember the name the club played under until the rename.
        if (untilSeasonId && facts.source.name !== facts.target.name) {
          await tx.teamNameHistory.upsert({
            where: { teamId_untilSeasonId: { teamId: targetTeamId, untilSeasonId } },
            create: {
              organizationId: orgId,
              teamId: targetTeamId,
              name: facts.source.name,
              shortName: facts.source.shortName,
              logoUrl: facts.source.logoUrl,
              untilSeasonId,
            },
            update: {
              name: facts.source.name,
              shortName: facts.source.shortName,
              logoUrl: facts.source.logoUrl,
            },
          })
        }

        await tx.team.delete({ where: { id: sourceTeamId } })

        return moved
      })

      return {
        moved: result,
        linkedContracts: handovers.length,
        nameHistoryUntilSeasonId: facts.source.name !== facts.target.name ? (untilSeasonId ?? null) : null,
      }
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.team.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})

// ─── Team merge helpers ──────────────────────────────────────────────────────

interface MergeContractSource {
  id: string
  playerId: string
  startSeasonId: string
  endSeasonId: string | null
}

interface MergeContractTarget {
  id: string
  playerId: string
  startSeasonId: string
  previousContractId: string | null
}

/**
 * Pair up the contracts of a player who was carried over by hand when the club was
 * re-created under a new name: a contract at the old team that ended, and one at the
 * new team that picks up in the same or the very next season.
 */
function planContractHandovers(
  sourceContracts: MergeContractSource[],
  targetContracts: MergeContractTarget[],
  seasonOrder: Map<string, number>,
): Array<{ earlierContractId: string; laterContractId: string }> {
  const handovers: Array<{ earlierContractId: string; laterContractId: string }> = []
  const claimed = new Set<string>()

  const byPlayer = new Map<string, MergeContractTarget[]>()
  for (const c of targetContracts) {
    if (c.previousContractId) continue
    const list = byPlayer.get(c.playerId) ?? []
    list.push(c)
    byPlayer.set(c.playerId, list)
  }

  const ordered = [...sourceContracts].sort(
    (a, b) => (seasonOrder.get(a.startSeasonId) ?? 0) - (seasonOrder.get(b.startSeasonId) ?? 0),
  )

  for (const earlier of ordered) {
    if (!earlier.endSeasonId) continue
    const endIndex = seasonOrder.get(earlier.endSeasonId)
    if (endIndex === undefined) continue

    const candidates = (byPlayer.get(earlier.playerId) ?? [])
      .filter((c) => !claimed.has(c.id))
      .map((c) => ({ contract: c, index: seasonOrder.get(c.startSeasonId) }))
      .filter((c): c is { contract: MergeContractTarget; index: number } => c.index !== undefined)
      .sort((a, b) => a.index - b.index)

    // Same season (handover mid-season) or the season right after — anything later is a
    // player who came back on their own, not the club changing its name.
    const successor = candidates.find(({ index }) => index === endIndex || index === endIndex + 1)
    if (!successor) continue

    claimed.add(successor.contract.id)
    handovers.push({ earlierContractId: earlier.id, laterContractId: successor.contract.id })
  }

  return handovers
}

/**
 * Row counts a merge would move and the conditions that block it. Two teams that were
 * ever in the same season, or that played each other, are two real clubs — merging
 * them would fabricate a team that faced itself.
 */
async function collectMergeFacts(db: PrismaClient, organizationId: string, sourceTeamId: string, targetTeamId: string) {
  if (sourceTeamId === targetTeamId) {
    throw createAppError("BAD_REQUEST", APP_ERROR_CODES.TEAM_MERGE_SAME_TEAM)
  }

  const [source, target] = await Promise.all([
    db.team.findFirst({ where: { id: sourceTeamId, organizationId } }),
    db.team.findFirst({ where: { id: targetTeamId, organizationId } }),
  ])
  if (!source || !target) throw createAppError("NOT_FOUND", APP_ERROR_CODES.TEAM_NOT_FOUND)

  const scope = { organizationId, teamId: sourceTeamId }

  const moves: Record<string, number> = {}
  await Promise.all(
    TEAM_SCOPED_MERGE_MODELS.map(async (model) => {
      moves[model] = await (db[model] as { count: (args: unknown) => Promise<number> }).count({ where: scope })
    }),
  )
  const [homeGames, awayGames, memberRoles] = await Promise.all([
    db.game.count({ where: { organizationId, homeTeamId: sourceTeamId } }),
    db.game.count({ where: { organizationId, awayTeamId: sourceTeamId } }),
    db.memberRole.count({ where: { teamId: sourceTeamId } }),
  ])
  moves.game = homeGames + awayGames
  moves.memberRole = memberRoles

  // Seasons both teams took part in
  const [sourceDivisions, targetDivisions] = await Promise.all([
    db.teamDivision.findMany({
      where: { organizationId, teamId: sourceTeamId },
      select: { division: { select: { season: { select: { id: true, name: true, seasonEnd: true } } } } },
    }),
    db.teamDivision.findMany({
      where: { organizationId, teamId: targetTeamId },
      select: { division: { select: { season: { select: { id: true } } } } },
    }),
  ])
  const targetSeasonIds = new Set(targetDivisions.map((td: any) => td.division.season.id))
  const sharedSeasons = new Map<string, { id: string; name: string }>()
  for (const td of sourceDivisions) {
    const season = td.division.season
    if (targetSeasonIds.has(season.id)) sharedSeasons.set(season.id, { id: season.id, name: season.name })
  }

  const headToHeadGames = await db.game.count({
    where: {
      organizationId,
      OR: [
        { homeTeamId: sourceTeamId, awayTeamId: targetTeamId },
        { homeTeamId: targetTeamId, awayTeamId: sourceTeamId },
      ],
    },
  })

  // Two contracts for one player at the same team starting in the same season cannot
  // coexist (unique constraint), so they have to be sorted out before merging.
  const [sourceContracts, targetContracts] = await Promise.all([
    db.contract.findMany({
      where: { organizationId, teamId: sourceTeamId },
      select: {
        playerId: true,
        startSeasonId: true,
        player: { select: { firstName: true, lastName: true } },
        startSeason: { select: { name: true } },
      },
    }),
    db.contract.findMany({
      where: { organizationId, teamId: targetTeamId },
      select: { playerId: true, startSeasonId: true },
    }),
  ])
  const targetKeys = new Set(targetContracts.map((c: any) => `${c.playerId}:${c.startSeasonId}`))
  const contractCollisions = sourceContracts
    .filter((c: any) => targetKeys.has(`${c.playerId}:${c.startSeasonId}`))
    .map((c: any) => ({
      playerId: c.playerId,
      playerName: `${c.player.firstName} ${c.player.lastName}`,
      seasonName: c.startSeason.name,
    }))

  // Last season the source team was active — where its name stops applying.
  const sourceSeasonEnds = sourceDivisions
    .map((td: any) => td.division.season)
    .sort((a: any, b: any) => b.seasonEnd.getTime() - a.seasonEnd.getTime())
  const suggestedNameChangeSeasonId: string | null = sourceSeasonEnds[0]?.id ?? null

  const conflicts = {
    sharedSeasons: Array.from(sharedSeasons.values()),
    headToHeadGames,
    contractCollisions,
  }

  return {
    source: {
      id: source.id,
      name: source.name,
      shortName: source.shortName,
      logoUrl: source.logoUrl,
    },
    target: {
      id: target.id,
      name: target.name,
      shortName: target.shortName,
      logoUrl: target.logoUrl,
    },
    moves,
    conflicts,
    canMerge:
      conflicts.sharedSeasons.length === 0 &&
      conflicts.headToHeadGames === 0 &&
      conflicts.contractCollisions.length === 0,
    suggestedNameChangeSeasonId,
  }
}
