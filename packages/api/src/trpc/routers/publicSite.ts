import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { sendEmail } from "../../lib/email"
import {
  hashPublicReportEmail,
  hashPublicReportIp,
  maskPublicReportEmail,
  normalizePublicReportEmail,
} from "../../lib/publicReportPrivacy"
import { checkRecapEligibility, generateAndPersistRecap } from "../../services/aiRecapService"
import { publicProcedure, router } from "../init"
import { getEligibleGameIds } from "./_helpers"

export const publicSiteRouter = router({
  listPlans: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        priceYearly: true,
        currency: true,
        maxTeams: true,
        maxPlayers: true,
        maxDivisionsPerSeason: true,
        maxSeasons: true,
        maxNewsArticles: true,
        maxPages: true,
        maxSponsors: true,
        featureCustomDomain: true,
        featureWebsiteBuilder: true,
        featureSponsorMgmt: true,
        featureTrikotDesigner: true,
        featureGameReports: true,
        featurePlayerStats: true,
        featureScheduler: true,
        featureScheduledNews: true,
        featureAdvancedRoles: true,
        featureAdvancedStats: true,
        featurePublicReports: true,
        maxAdmins: true,
        maxDocuments: true,
        storageQuotaMb: true,
        featureAiRecaps: true,
      },
    })
  }),

  resolveByDomain: publicProcedure.input(z.object({ domain: z.string() })).query(async ({ ctx, input }) => {
    const suffix = process.env.SUBDOMAIN_SUFFIX || ".puckhub.eu"

    // Try to match by custom domain on websiteConfig
    let config = await ctx.db.websiteConfig.findFirst({
      where: { isActive: true, domain: input.domain },
      include: { organization: { select: { id: true, name: true, slug: true, logo: true } } },
    })

    // Try to match by organization slug (subdomain prefix)
    if (!config) {
      // Extract slug from subdomain: "demo-league.puckhub.gruesshaber.eu" → "demo-league"
      let slug: string | null = null
      if (input.domain.endsWith(suffix)) {
        slug = input.domain.slice(0, -suffix.length) || null
      }
      if (slug) {
        config = await ctx.db.websiteConfig.findFirst({
          where: { isActive: true, organization: { slug } },
          include: { organization: { select: { id: true, name: true, slug: true, logo: true } } },
        })
      }
    }

    if (!config) return null

    const [settings, subscription] = await Promise.all([
      ctx.db.systemSettings.findUnique({
        where: { organizationId: config.organizationId },
      }),
      ctx.db.orgSubscription.findUnique({
        where: { organizationId: config.organizationId },
        include: { plan: { select: { featureAdvancedStats: true, featurePublicReports: true } } },
      }),
    ])

    const planPublicReports = subscription?.plan?.featurePublicReports ?? false
    const settingsPublicReports = settings?.publicReportsEnabled ?? false

    const features = {
      advancedStats: subscription?.plan?.featureAdvancedStats ?? false,
      publicReports: planPublicReports && settingsPublicReports,
      publicReportsRequireEmail: settings?.publicReportsRequireEmail ?? true,
      publicReportsBotDetection: settings?.publicReportsBotDetection ?? true,
    }

    // Expose org slug as subdomain on config for backward compat
    const configWithSubdomain = { ...config, subdomain: config.organization.slug }
    return { config: configWithSubdomain, settings, organization: config.organization, features }
  }),

  getConfig: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    const config = await ctx.db.websiteConfig.findUnique({
      where: { organizationId: input.organizationId },
      include: {
        organization: { select: { id: true, name: true, slug: true, logo: true } },
      },
    })
    if (!config) return null

    const [settings, subscription] = await Promise.all([
      ctx.db.systemSettings.findUnique({
        where: { organizationId: input.organizationId },
      }),
      ctx.db.orgSubscription.findUnique({
        where: { organizationId: input.organizationId },
        include: { plan: { select: { featureAdvancedStats: true, featurePublicReports: true } } },
      }),
    ])

    const planPublicReports = subscription?.plan?.featurePublicReports ?? false
    const settingsPublicReports = settings?.publicReportsEnabled ?? false

    const features = {
      advancedStats: subscription?.plan?.featureAdvancedStats ?? false,
      publicReports: planPublicReports && settingsPublicReports,
      publicReportsRequireEmail: settings?.publicReportsRequireEmail ?? true,
      publicReportsBotDetection: settings?.publicReportsBotDetection ?? true,
    }

    const configWithSubdomain = { ...config, subdomain: config.organization.slug }
    return { config: configWithSubdomain, settings, organization: config.organization, features }
  }),

  getCurrentSeason: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    const now = new Date()
    // Try to find a season that covers the current date
    const current = await ctx.db.season.findFirst({
      where: {
        organizationId: input.organizationId,
        seasonStart: { lte: now },
        seasonEnd: { gte: now },
      },
      orderBy: { seasonStart: "desc" },
    })
    if (current) return current

    // Fallback: latest season
    return ctx.db.season.findFirst({
      where: { organizationId: input.organizationId },
      orderBy: { seasonStart: "desc" },
    })
  }),

  listSeasons: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.season.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { seasonStart: "desc" },
    })
  }),

  getSeasonStructure: publicProcedure
    .input(z.object({ organizationId: z.string(), seasonId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const divisions = await ctx.db.division.findMany({
        where: { organizationId: input.organizationId, seasonId: input.seasonId },
        orderBy: { sortOrder: "asc" },
        include: {
          rounds: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, roundType: true, sortOrder: true, _count: { select: { games: true } } },
          },
          teamDivisions: {
            select: {
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
          },
        },
      })
      return divisions
    }),

  getHomeData: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    const orgId = input.organizationId

    // Resolve current season
    const now = new Date()
    const currentSeason =
      (await ctx.db.season.findFirst({
        where: { organizationId: orgId, seasonStart: { lte: now }, seasonEnd: { gte: now } },
        orderBy: { seasonStart: "desc" },
      })) ??
      (await ctx.db.season.findFirst({
        where: { organizationId: orgId },
        orderBy: { seasonStart: "desc" },
      }))

    const seasonId = currentSeason?.id

    // Run all queries in parallel
    const [latestResults, upcomingGames, standings, sponsors] = await Promise.all([
      // Latest 5 completed games
      seasonId
        ? ctx.db.game.findMany({
            where: {
              organizationId: orgId,
              status: "completed",
              round: { division: { seasonId } },
            },
            orderBy: { finalizedAt: "desc" },
            take: 5,
            include: {
              homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
              awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
              round: { select: { name: true, division: { select: { name: true } } } },
            },
          })
        : [],

      // Next 5 upcoming games
      seasonId
        ? ctx.db.game.findMany({
            where: {
              organizationId: orgId,
              status: "scheduled",
              scheduledAt: { gte: now },
              round: { division: { seasonId } },
            },
            orderBy: { scheduledAt: "asc" },
            take: 5,
            include: {
              homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
              awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
              round: { select: { name: true, division: { select: { name: true } } } },
            },
          })
        : [],

      // Standings from the first regular round of the first division
      seasonId
        ? (async () => {
            const firstDiv = await ctx.db.division.findFirst({
              where: { seasonId, organizationId: orgId },
              orderBy: { sortOrder: "asc" },
            })
            if (!firstDiv) return []
            const firstRound = await ctx.db.round.findFirst({
              where: { divisionId: firstDiv.id, roundType: "regular" },
              orderBy: { sortOrder: "asc" },
            })
            if (!firstRound) return []
            return ctx.db.standing.findMany({
              where: { roundId: firstRound.id, organizationId: orgId },
              orderBy: [{ totalPoints: "desc" }, { goalDifference: "desc" }, { goalsFor: "desc" }],
              take: 8,
              include: { team: { select: { id: true, name: true, shortName: true, logoUrl: true } } },
            })
          })()
        : [],

      // Active sponsors
      ctx.db.sponsor.findMany({
        where: { organizationId: orgId, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, logoUrl: true, websiteUrl: true, hoverText: true },
      }),
    ])

    return { currentSeason, latestResults, upcomingGames, standings, sponsors }
  }),

  getStandings: publicProcedure
    .input(z.object({ organizationId: z.string(), roundId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.standing.findMany({
        where: { roundId: input.roundId, organizationId: input.organizationId },
        orderBy: [{ totalPoints: "desc" }, { gamesPlayed: "asc" }, { goalDifference: "desc" }, { goalsFor: "desc" }],
        include: {
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              logoUrl: true,
              primaryColor: true,
              city: true,
              homeVenue: true,
              website: true,
            },
          },
        },
      })
    }),

  getTeamForm: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        roundId: z.string().uuid(),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const completedGames = await ctx.db.game.findMany({
        where: { roundId: input.roundId, organizationId: input.organizationId, status: "completed" },
        select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, finalizedAt: true },
        orderBy: { finalizedAt: "desc" },
      })

      type FormEntry = { result: "W" | "D" | "L" }
      const teamResults = new Map<string, FormEntry[]>()

      for (const game of completedGames) {
        const hs = game.homeScore ?? 0
        const as_ = game.awayScore ?? 0

        if (!teamResults.has(game.homeTeamId)) teamResults.set(game.homeTeamId, [])
        const homeForm = teamResults.get(game.homeTeamId)!
        if (homeForm.length < input.limit) {
          homeForm.push({ result: hs > as_ ? "W" : hs < as_ ? "L" : "D" })
        }

        if (!teamResults.has(game.awayTeamId)) teamResults.set(game.awayTeamId, [])
        const awayForm = teamResults.get(game.awayTeamId)!
        if (awayForm.length < input.limit) {
          awayForm.push({ result: as_ > hs ? "W" : as_ < hs ? "L" : "D" })
        }
      }

      return Array.from(teamResults.entries()).map(([teamId, form]) => ({ teamId, form }))
    }),

  listGames: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        seasonId: z.string().uuid().optional(),
        divisionId: z.string().uuid().optional(),
        roundId: z.string().uuid().optional(),
        teamId: z.string().uuid().optional(),
        status: z.enum(["scheduled", "live", "completed", "cancelled"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: input.organizationId }

      if (input.roundId) {
        where.roundId = input.roundId
      } else if (input.divisionId) {
        where.round = { divisionId: input.divisionId }
      } else if (input.seasonId) {
        where.round = { division: { seasonId: input.seasonId } }
      }

      if (input.teamId) {
        where.OR = [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }]
      }
      if (input.status) where.status = input.status
      if (input.dateFrom || input.dateTo) {
        where.scheduledAt = {}
        if (input.dateFrom) where.scheduledAt.gte = new Date(input.dateFrom)
        if (input.dateTo) where.scheduledAt.lte = new Date(input.dateTo)
      }
      if (input.cursor) where.id = { lt: input.cursor }

      const games = await ctx.db.game.findMany({
        where,
        orderBy: [{ scheduledAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          round: { select: { name: true, roundType: true, division: { select: { name: true } } } },
        },
      })

      const hasMore = games.length > input.limit
      if (hasMore) games.pop()

      return { games, nextCursor: hasMore ? games[games.length - 1]?.id : undefined }
    }),

  getGameDetail: publicProcedure
    .input(z.object({ organizationId: z.string(), gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.game.findFirst({
        where: { id: input.gameId, organizationId: input.organizationId },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true } },
          round: { select: { name: true, roundType: true, division: { select: { name: true } } } },
          events: {
            where: { OR: [{ eventType: { not: "note" } }, { notePublic: true }] },
            orderBy: [
              { period: { sort: "asc", nulls: "first" } },
              { timeMinutes: { sort: "asc", nulls: "first" } },
              { timeSeconds: { sort: "asc", nulls: "first" } },
            ],
            include: {
              team: { select: { id: true, shortName: true } },
              scorer: { select: { id: true, firstName: true, lastName: true } },
              assist1: { select: { id: true, firstName: true, lastName: true } },
              assist2: { select: { id: true, firstName: true, lastName: true } },
              penaltyPlayer: { select: { id: true, firstName: true, lastName: true } },
              penaltyType: { select: { name: true } },
            },
          },
          lineups: {
            orderBy: [{ position: "asc" }, { jerseyNumber: "asc" }],
            include: {
              player: { select: { id: true, firstName: true, lastName: true } },
              team: { select: { id: true } },
            },
          },
        },
      })

      if (!game) return game

      // Lazy AI recap generation for completed games
      if (game.status === "completed" && game.recapTitle === null && !game.recapGenerating) {
        const eligibility = await checkRecapEligibility(ctx.db, input.organizationId)

        if (eligibility.eligible) {
          generateAndPersistRecap(ctx.db, game.id, input.organizationId).catch((err) =>
            console.error("[ai-recap] Lazy generation failed:", err),
          )
          // Signal client to poll for result
          ;(game as any).recapGenerating = true
        }
      }

      return game
    }),

  getLatestResults: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        seasonId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.game.findMany({
        where: {
          organizationId: input.organizationId,
          status: "completed",
          ...(input.seasonId ? { round: { division: { seasonId: input.seasonId } } } : {}),
        },
        orderBy: { finalizedAt: "desc" },
        take: input.limit,
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          round: { select: { name: true, division: { select: { name: true } } } },
        },
      })
    }),

  getUpcomingGames: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        seasonId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.game.findMany({
        where: {
          organizationId: input.organizationId,
          status: "scheduled",
          scheduledAt: { gte: new Date() },
          ...(input.seasonId ? { round: { division: { seasonId: input.seasonId } } } : {}),
        },
        orderBy: { scheduledAt: "asc" },
        take: input.limit,
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          round: { select: { name: true, division: { select: { name: true } } } },
        },
      })
    }),

  listTeams: publicProcedure
    .input(z.object({ organizationId: z.string(), seasonId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.seasonId) {
        // Return teams in this season via teamDivisions
        const teamDivisions = await ctx.db.teamDivision.findMany({
          where: { organizationId: input.organizationId, division: { seasonId: input.seasonId } },
          select: {
            team: {
              select: {
                id: true,
                name: true,
                shortName: true,
                city: true,
                logoUrl: true,
                primaryColor: true,
                homeVenue: true,
                website: true,
              },
            },
          },
          distinct: ["teamId"],
        })
        return teamDivisions.map((td) => td.team)
      }
      return ctx.db.team.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          shortName: true,
          city: true,
          logoUrl: true,
          primaryColor: true,
          homeVenue: true,
          website: true,
        },
      })
    }),

  getTeamDetail: publicProcedure
    .input(z.object({ organizationId: z.string(), teamId: z.string().uuid(), seasonId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findFirst({
        where: { id: input.teamId, organizationId: input.organizationId },
        select: {
          id: true,
          name: true,
          shortName: true,
          city: true,
          logoUrl: true,
          teamPhotoUrl: true,
          primaryColor: true,
          contactName: true,
          contactEmail: true,
          website: true,
          homeVenue: true,
        },
      })
      if (!team) return null

      // Get roster for the specified season or current contracts
      const contracts = await ctx.db.contract.findMany({
        where: {
          organizationId: input.organizationId,
          teamId: input.teamId,
          ...(input.seasonId
            ? {
                startSeason: { seasonStart: { lte: new Date() } },
                OR: [{ endSeasonId: null }, { endSeason: { seasonEnd: { gte: new Date() } } }],
              }
            : { endSeasonId: null }),
        },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        },
        orderBy: [{ position: "asc" }, { jerseyNumber: "asc" }],
      })

      return {
        ...team,
        roster: contracts.map((c) => ({
          playerId: c.player.id,
          firstName: c.player.firstName,
          lastName: c.player.lastName,
          photoUrl: c.player.photoUrl,
          position: c.position,
          jerseyNumber: c.jerseyNumber,
        })),
      }
    }),

  listNews: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Auto-publish articles with a scheduled publish date that has passed
      await ctx.db.news.updateMany({
        where: {
          organizationId: input.organizationId,
          status: "draft",
          scheduledPublishAt: { lte: new Date() },
        },
        data: { status: "published", publishedAt: new Date() },
      })

      const where: any = { organizationId: input.organizationId, status: "published" }
      if (input.cursor) where.id = { lt: input.cursor }

      const items = await ctx.db.news.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        select: {
          id: true,
          title: true,
          shortText: true,
          publishedAt: true,
          author: { select: { name: true } },
        },
      })

      const hasMore = items.length > input.limit
      if (hasMore) items.pop()

      return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined }
    }),

  getNewsDetail: publicProcedure
    .input(z.object({ organizationId: z.string(), newsId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.news.findFirst({
        where: { id: input.newsId, organizationId: input.organizationId, status: "published" },
        select: {
          id: true,
          title: true,
          shortText: true,
          content: true,
          publishedAt: true,
          author: { select: { name: true } },
        },
      })
    }),

  listSponsors: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.sponsor.findMany({
      where: { organizationId: input.organizationId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, logoUrl: true, websiteUrl: true, hoverText: true },
    })
  }),

  getPageBySlug: publicProcedure
    .input(z.object({ organizationId: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const parts = input.slug.split("/")

      if (parts.length === 2) {
        // Nested: parentSlug/childSlug
        const parent = await ctx.db.page.findFirst({
          where: { organizationId: input.organizationId, slug: parts[0]!, status: "published", parentId: null },
          select: { id: true },
        })
        if (parent) {
          const child = await ctx.db.page.findFirst({
            where: { organizationId: input.organizationId, slug: parts[1]!, status: "published", parentId: parent.id },
            select: { id: true, title: true, slug: true, content: true, menuLocations: true, updatedAt: true },
          })
          if (child) return child
        }
      }

      // Check direct page first
      const page = await ctx.db.page.findFirst({
        where: { organizationId: input.organizationId, slug: input.slug, status: "published" },
        select: { id: true, title: true, slug: true, content: true, menuLocations: true, updatedAt: true },
      })
      if (page) return page

      // Check aliases
      const alias = await ctx.db.pageAlias.findFirst({
        where: { organizationId: input.organizationId, slug: input.slug },
        include: {
          targetPage: {
            select: {
              id: true,
              title: true,
              slug: true,
              content: true,
              menuLocations: true,
              updatedAt: true,
              status: true,
            },
          },
        },
      })
      if (alias && alias.targetPage.status === "published") {
        const { status, ...page } = alias.targetPage
        return page
      }

      return null
    }),

  getMenuPages: publicProcedure
    .input(z.object({ organizationId: z.string(), location: z.enum(["main_nav", "footer"]) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.page.findMany({
        where: {
          organizationId: input.organizationId,
          status: "published",
          menuLocations: { has: input.location },
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          menuLocations: true,
          sortOrder: true,
          isSystemRoute: true,
          routePath: true,
          parentId: true,
          parent: { select: { slug: true } },
          children: {
            where: { status: "published" },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, slug: true, sortOrder: true, routePath: true, isSystemRoute: true },
          },
        },
      })
    }),

  // ---------------------------------------------------------------------------
  // Public stats endpoints
  // ---------------------------------------------------------------------------

  getPlayerStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
        position: z.enum(["forward", "defense"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        seasonId: input.seasonId,
        organizationId: input.organizationId,
      }
      if (input.teamId) where.teamId = input.teamId

      const stats = await ctx.db.playerSeasonStat.findMany({
        where,
        include: {
          player: true,
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: [{ totalPoints: "desc" }, { goals: "desc" }, { assists: "desc" }],
      })

      if (input.position) {
        const playerIds = [...new Set(stats.map((s: any) => s.playerId))]
        if (playerIds.length === 0) return []
        const contracts = await ctx.db.contract.findMany({
          where: { playerId: { in: playerIds } },
          select: { playerId: true, teamId: true, position: true },
        })
        const positionMap = new Map(contracts.map((c: any) => [`${c.playerId}:${c.teamId}`, c.position]))
        return stats.filter((s: any) => positionMap.get(`${s.playerId}:${s.teamId}`) === input.position)
      }

      return stats
    }),

  getGoalieStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        seasonId: input.seasonId,
        organizationId: input.organizationId,
      }
      if (input.teamId) where.teamId = input.teamId

      const stats = await ctx.db.goalieSeasonStat.findMany({
        where,
        include: {
          player: true,
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: [{ gaa: "asc" }, { gamesPlayed: "desc" }],
      })

      const divisions = await ctx.db.division.findMany({
        where: {
          seasonId: input.seasonId,
          organizationId: input.organizationId,
        },
        select: { goalieMinGames: true },
      })
      const minGames = divisions.length > 0 ? Math.min(...divisions.map((d: any) => d.goalieMinGames)) : 7

      const qualified = stats.filter((s: any) => s.gamesPlayed >= minGames)
      const belowThreshold = stats.filter((s: any) => s.gamesPlayed < minGames)

      return { qualified, belowThreshold, minGames }
    }),

  getPenaltyStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        seasonId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const gameIds = await getEligibleGameIds(ctx.db, input.seasonId, "countsForPlayerStats")
      if (gameIds.length === 0) return []

      const penaltyWhere: any = {
        gameId: { in: gameIds },
        organizationId: input.organizationId,
        eventType: "penalty",
        penaltyPlayerId: { not: null },
      }
      if (input.teamId) penaltyWhere.teamId = input.teamId

      const penaltyAgg = await ctx.db.gameEvent.findMany({
        where: penaltyWhere,
        select: {
          penaltyPlayerId: true,
          teamId: true,
          penaltyMinutes: true,
        },
      })

      type PlayerPenalty = {
        playerId: string
        teamId: string
        totalMinutes: number
        totalCount: number
      }

      const playerMap = new Map<string, PlayerPenalty>()

      for (const row of penaltyAgg) {
        if (!row.penaltyPlayerId || !row.teamId) continue
        const key = `${row.penaltyPlayerId}:${row.teamId}`
        let entry = playerMap.get(key)
        if (!entry) {
          entry = {
            playerId: row.penaltyPlayerId,
            teamId: row.teamId,
            totalMinutes: 0,
            totalCount: 0,
          }
          playerMap.set(key, entry)
        }
        entry.totalMinutes += Number(row.penaltyMinutes ?? 0)
        entry.totalCount++
      }

      const playerIds = [...new Set(Array.from(playerMap.values()).map((p) => p.playerId))]
      const players = playerIds.length > 0 ? await ctx.db.player.findMany({ where: { id: { in: playerIds } } }) : []
      const playerLookup = new Map(players.map((p: any) => [p.id, p]))

      const teamIds = [...new Set(Array.from(playerMap.values()).map((p) => p.teamId))]
      const teams =
        teamIds.length > 0
          ? await ctx.db.team.findMany({
              where: { id: { in: teamIds } },
              select: { id: true, name: true, shortName: true, logoUrl: true },
            })
          : []
      const teamLookup = new Map(teams.map((t: any) => [t.id, t]))

      return Array.from(playerMap.values())
        .map((entry) => ({
          player: playerLookup.get(entry.playerId) ?? null,
          team: teamLookup.get(entry.teamId) ?? null,
          totalMinutes: entry.totalMinutes,
          totalCount: entry.totalCount,
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
    }),

  getTeamPenaltyStats: publicProcedure
    .input(z.object({ organizationId: z.string(), seasonId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const gameIds = await getEligibleGameIds(ctx.db, input.seasonId, "countsForPlayerStats")
      if (gameIds.length === 0) return []

      const penaltyAgg = await ctx.db.gameEvent.findMany({
        where: {
          gameId: { in: gameIds },
          organizationId: input.organizationId,
          eventType: "penalty",
        },
        select: { teamId: true, penaltyMinutes: true, penaltyTypeId: true },
      })

      type TeamPenalty = {
        teamId: string
        totalMinutes: number
        totalCount: number
        byType: Map<string, { count: number; minutes: number }>
      }

      const teamMap = new Map<string, TeamPenalty>()
      for (const row of penaltyAgg) {
        if (!row.teamId) continue
        let entry = teamMap.get(row.teamId)
        if (!entry) {
          entry = { teamId: row.teamId, totalMinutes: 0, totalCount: 0, byType: new Map() }
          teamMap.set(row.teamId, entry)
        }
        const mins = Number(row.penaltyMinutes ?? 0)
        entry.totalMinutes += mins
        entry.totalCount++
        const typeId = row.penaltyTypeId ?? "unknown"
        const typeEntry = entry.byType.get(typeId)
        if (typeEntry) {
          typeEntry.count++
          typeEntry.minutes += mins
        } else {
          entry.byType.set(typeId, { count: 1, minutes: mins })
        }
      }

      const penaltyTypes = await ctx.db.penaltyType.findMany()
      const typeMapLookup = new Map(penaltyTypes.map((pt: any) => [pt.id, pt]))

      const teamIds = Array.from(teamMap.keys())
      const teams =
        teamIds.length > 0
          ? await ctx.db.team.findMany({
              where: { id: { in: teamIds } },
              select: { id: true, name: true, shortName: true, logoUrl: true },
            })
          : []
      const teamLookup = new Map(teams.map((t: any) => [t.id, t]))

      return Array.from(teamMap.values())
        .map((entry) => ({
          team: teamLookup.get(entry.teamId) ?? null,
          totalMinutes: entry.totalMinutes,
          totalCount: entry.totalCount,
          breakdown: Array.from(entry.byType.entries()).map(([typeId, data]) => ({
            penaltyType: typeMapLookup.get(typeId) ?? null,
            count: data.count,
            minutes: data.minutes,
          })),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
    }),

  getSeasonRoundInfo: publicProcedure
    .input(z.object({ organizationId: z.string(), seasonId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.division.findMany({
        where: { seasonId: input.seasonId, organizationId: input.organizationId },
        include: { rounds: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      })
    }),

  getPlayerCareerStats: publicProcedure
    .input(z.object({ organizationId: z.string(), playerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.playerSeasonStat.findMany({
        where: { playerId: input.playerId, organizationId: input.organizationId },
        include: {
          season: { select: { id: true, name: true, seasonStart: true, seasonEnd: true } },
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: { season: { seasonStart: "asc" } },
      })
    }),

  getGoalieCareerStats: publicProcedure
    .input(z.object({ organizationId: z.string(), playerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.goalieSeasonStat.findMany({
        where: { playerId: input.playerId, organizationId: input.organizationId },
        include: {
          season: { select: { id: true, name: true, seasonStart: true, seasonEnd: true } },
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
        orderBy: { season: { seasonStart: "asc" } },
      })
    }),

  getPlayerSuspensions: publicProcedure
    .input(z.object({ organizationId: z.string(), playerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.gameSuspension.findMany({
        where: { playerId: input.playerId, organizationId: input.organizationId },
        include: {
          game: {
            select: {
              id: true,
              scheduledAt: true,
              homeTeam: { select: { id: true, shortName: true, logoUrl: true } },
              awayTeam: { select: { id: true, shortName: true, logoUrl: true } },
              round: {
                select: {
                  name: true,
                  division: { select: { name: true, season: { select: { id: true, name: true } } } },
                },
              },
            },
          },
          gameEvent: { select: { penaltyType: { select: { name: true, shortName: true } } } },
          team: { select: { id: true, shortName: true, logoUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    }),

  getPlayerContracts: publicProcedure
    .input(z.object({ organizationId: z.string(), playerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contract.findMany({
        where: { playerId: input.playerId, organizationId: input.organizationId },
        include: { team: true, startSeason: true, endSeason: true },
        orderBy: { createdAt: "desc" },
      })
    }),

  getPlayerById: publicProcedure
    .input(z.object({ organizationId: z.string(), playerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.player.findFirst({
        where: { id: input.playerId, organizationId: input.organizationId },
      })
    }),

  getTeamHistory: publicProcedure
    .input(z.object({ organizationId: z.string(), teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { teamId } = input
      const orgId = input.organizationId

      const [team, teamDivisions, allScorers, allGoalies, contracts] = await Promise.all([
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
                  include: { standings: { where: { teamId }, take: 1 } },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        }),
        ctx.db.playerSeasonStat.findMany({
          where: { teamId, organizationId: orgId },
          include: { player: { select: { firstName: true, lastName: true } } },
          orderBy: { totalPoints: "desc" },
        }),
        ctx.db.goalieSeasonStat.findMany({
          where: { teamId, organizationId: orgId },
          include: { player: { select: { firstName: true, lastName: true } } },
          orderBy: { gaa: "asc" },
        }),
        ctx.db.contract.findMany({
          where: { teamId, organizationId: orgId },
          select: {
            startSeasonId: true,
            endSeasonId: true,
            playerId: true,
            jerseyNumber: true,
            position: true,
            player: { select: { firstName: true, lastName: true, photoUrl: true } },
          },
        }),
      ])

      if (!team) return null

      // Build roster change maps from contracts
      type RosterChangePlayer = {
        playerId: string
        firstName: string
        lastName: string
        photoUrl: string | null
        jerseyNumber: number | null
        position: string
      }
      const joinedBySeason = new Map<string, RosterChangePlayer[]>()
      const departedBySeason = new Map<string, RosterChangePlayer[]>()
      for (const c of contracts) {
        const p: RosterChangePlayer = {
          playerId: c.playerId,
          firstName: c.player.firstName,
          lastName: c.player.lastName,
          photoUrl: c.player.photoUrl,
          jerseyNumber: c.jerseyNumber,
          position: c.position,
        }
        const j = joinedBySeason.get(c.startSeasonId) ?? []
        j.push(p)
        joinedBySeason.set(c.startSeasonId, j)
        if (c.endSeasonId) {
          const d = departedBySeason.get(c.endSeasonId) ?? []
          d.push(p)
          departedBySeason.set(c.endSeasonId, d)
        }
      }

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
            rosterChanges: {
              joined: joinedBySeason.get(entry.season.id) ?? [],
              departed: departedBySeason.get(entry.season.id) ?? [],
            },
          }
        })
        .sort((a, b) => new Date(b.season.seasonStart).getTime() - new Date(a.season.seasonStart).getTime())

      const scorersBySeason = new Map<string, typeof allScorers>()
      for (const s of allScorers) {
        const arr = scorersBySeason.get(s.seasonId) ?? []
        if (arr.length < 3) {
          arr.push(s)
          scorersBySeason.set(s.seasonId, arr)
        }
      }

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
        topScorers: Array.from(scorersBySeason.values()).flat(),
        topGoalies: Array.from(goaliesBySeason.values()),
      }
    }),

  // ---------------------------------------------------------------------------
  // Public Game Report procedures
  // ---------------------------------------------------------------------------

  reportRequestOtp: publicProcedure
    .input(z.object({ organizationId: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = input
      const normalizedEmail = normalizePublicReportEmail(input.email)
      const identifier = `public-report:${normalizedEmail}:${organizationId}`

      // Rate limit: max 3 OTP requests per email per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentCount = await ctx.db.verification.count({
        where: {
          identifier,
          createdAt: { gte: oneHourAgo },
        },
      })
      if (recentCount >= 3) {
        throw createAppError(
          "TOO_MANY_REQUESTS",
          APP_ERROR_CODES.PUBLIC_REPORT_RATE_LIMITED,
          "Too many OTP requests. Please try again later.",
        )
      }

      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000))

      // Store in verification table (10 min TTL)
      await ctx.db.verification.create({
        data: {
          id: crypto.randomUUID(),
          identifier,
          value: code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      // Send email with code
      const { otpEmail } = await import("../../lib/emailTemplates")
      await sendEmail({
        to: normalizedEmail,
        subject: "Your verification code",
        html: otpEmail(code),
      })

      return { success: true }
    }),

  reportSubmit: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        gameId: z.string().uuid(),
        homeScore: z.number().int().min(0),
        awayScore: z.number().int().min(0),
        comment: z.string().max(500).optional(),
        email: z.string().email(),
        otpCode: z.string().length(6).optional(),
        // Bot detection fields
        _hp: z.string().optional(), // honeypot — must be empty
        _ts: z.number().optional(), // form open timestamp
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, gameId, homeScore, awayScore, comment, otpCode } = input
      const normalizedEmail = normalizePublicReportEmail(input.email)
      const submitterEmailHash = hashPublicReportEmail(normalizedEmail, organizationId)
      const submitterEmailMasked = maskPublicReportEmail(normalizedEmail)

      // Validate feature is enabled + load settings
      const [settings, subscription] = await Promise.all([
        ctx.db.systemSettings.findUnique({ where: { organizationId } }),
        ctx.db.orgSubscription.findUnique({
          where: { organizationId },
          include: { plan: { select: { featurePublicReports: true } } },
        }),
      ])
      const planEnabled = subscription?.plan?.featurePublicReports ?? false
      const settingsEnabled = settings?.publicReportsEnabled ?? false
      if (!planEnabled || !settingsEnabled) {
        throw createAppError(
          "FORBIDDEN",
          APP_ERROR_CODES.PLAN_FEATURE_UNAVAILABLE,
          "Public reports are not enabled for this league.",
        )
      }

      const requireEmail = settings?.publicReportsRequireEmail ?? true
      const botDetection = settings?.publicReportsBotDetection ?? true

      // ── Bot detection ──
      if (botDetection) {
        // Honeypot: must be empty (bots auto-fill hidden fields)
        if (input._hp) {
          // Silently reject — don't reveal detection to bots
          return { success: true }
        }
        // Timing: form must be open for at least 3 seconds
        if (input._ts && Date.now() - input._ts < 3000) {
          return { success: true }
        }
      }

      // ── OTP validation (when email verification is required) ──
      let verification: any = null
      if (requireEmail) {
        if (!otpCode) {
          throw createAppError(
            "BAD_REQUEST",
            APP_ERROR_CODES.PUBLIC_REPORT_INVALID_OTP,
            "Verification code is required.",
          )
        }
        const identifier = `public-report:${normalizedEmail}:${organizationId}`
        verification = await ctx.db.verification.findFirst({
          where: {
            identifier,
            value: otpCode,
            expiresAt: { gte: new Date() },
          },
        })
        if (!verification) {
          throw createAppError(
            "BAD_REQUEST",
            APP_ERROR_CODES.PUBLIC_REPORT_INVALID_OTP,
            "Invalid or expired verification code.",
          )
        }
      }

      // Validate game
      const game = await ctx.db.game.findFirst({
        where: { id: gameId, organizationId },
        select: { id: true, status: true, roundId: true, homeTeamId: true, awayTeamId: true },
      })
      if (!game) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.GAME_NOT_FOUND)
      }
      if (game.status !== "scheduled" && game.status !== "postponed") {
        throw createAppError(
          "BAD_REQUEST",
          APP_ERROR_CODES.GAME_ALREADY_FINALIZED,
          "This game has already been reported.",
        )
      }

      // Duplicate check
      const existingReport = await ctx.db.publicGameReport.findFirst({
        where: { gameId, submitterEmailHash, reverted: false },
      })
      if (existingReport) {
        throw createAppError(
          "BAD_REQUEST",
          APP_ERROR_CODES.PUBLIC_REPORT_DUPLICATE,
          "You have already submitted a report for this game.",
        )
      }

      // Rate limit: max 10 submissions per email per day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const dailyCount = await ctx.db.publicGameReport.count({
        where: { organizationId, submitterEmailHash, createdAt: { gte: oneDayAgo } },
      })
      if (dailyCount >= 10) {
        throw createAppError(
          "TOO_MANY_REQUESTS",
          APP_ERROR_CODES.PUBLIC_REPORT_RATE_LIMITED,
          "Daily submission limit reached.",
        )
      }

      // Get submitter IP from request headers
      const submitterIpHash = hashPublicReportIp((ctx as any).ip ?? null, organizationId)

      // Transaction: create report + update game + recalculate + delete OTP
      await ctx.db.$transaction(async (tx: any) => {
        // Create report
        await tx.publicGameReport.create({
          data: {
            organizationId,
            gameId,
            homeScore,
            awayScore,
            comment: comment ?? null,
            submitterEmailHash,
            submitterEmailMasked,
            submitterIpHash,
          },
        })

        // Update game
        await tx.game.update({
          where: { id: gameId },
          data: {
            homeScore,
            awayScore,
            status: "completed",
            finalizedAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // Recalculate standings
        await recalculateStandings(tx, game.roundId)

        // Delete used OTP (only if email verification was used)
        if (verification) {
          await tx.verification.delete({ where: { id: verification.id } })
        }
      })

      // Recalculate player/goalie stats (outside transaction, fire-and-forget)
      const round = await ctx.db.round.findUnique({
        where: { id: game.roundId },
        select: { division: { select: { seasonId: true } } },
      })
      if (round?.division?.seasonId) {
        recalculatePlayerStats(ctx.db, round.division.seasonId).catch(() => {})
        recalculateGoalieStats(ctx.db, round.division.seasonId).catch(() => {})
      }

      // Send notification to org admins (fire-and-forget)
      const gameData = await ctx.db.game.findFirst({
        where: { id: gameId },
        include: {
          homeTeam: { select: { shortName: true } },
          awayTeam: { select: { shortName: true } },
        },
      })
      if (gameData) {
        const members = await ctx.db.member.findMany({
          where: { organizationId },
          include: {
            memberRoles: { where: { role: { in: ["owner", "admin", "game_manager"] } } },
            user: { select: { email: true } },
          },
        })
        const adminEmails = members.filter((m: any) => m.memberRoles.length > 0).map((m: any) => m.user.email)

        const { adminReportNotificationEmail } = await import("../../lib/emailTemplates")
        for (const adminEmail of adminEmails) {
          sendEmail({
            to: adminEmail,
            subject: `New public game report: ${gameData.homeTeam.shortName} vs ${gameData.awayTeam.shortName}`,
            html: adminReportNotificationEmail({
              homeTeam: gameData.homeTeam.shortName,
              awayTeam: gameData.awayTeam.shortName,
              homeScore,
              awayScore,
              submitterEmailMasked,
              comment,
            }),
          }).catch((err) => console.error("[public-report] Admin notification failed:", err))
        }
      }

      return { success: true }
    }),

  getAllTeamsHistory: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    const orgId = input.organizationId

    const [allTeams, teamDivisions, pimAgg] = await Promise.all([
      ctx.db.team.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true },
        orderBy: { name: "asc" },
      }),
      ctx.db.teamDivision.findMany({
        where: { organizationId: orgId },
        include: {
          division: {
            include: {
              season: { select: { id: true, name: true, seasonStart: true } },
              rounds: {
                include: { standings: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      }),
      ctx.db.playerSeasonStat.groupBy({
        by: ["teamId", "seasonId"],
        where: { organizationId: orgId },
        _sum: { penaltyMinutes: true },
      }),
    ])

    // Build PIM lookup
    const pimMap = new Map<string, number>()
    for (const row of pimAgg) {
      pimMap.set(`${row.teamId}:${row.seasonId}`, row._sum.penaltyMinutes ?? 0)
    }

    // Collect unique seasons
    const seasonMap = new Map<string, { id: string; name: string; seasonStart: Date }>()
    // Build teamSeasons from standings
    const teamSeasons: Array<{
      teamId: string
      seasonId: string
      gamesPlayed: number
      wins: number
      draws: number
      losses: number
      goalsFor: number
      goalsAgainst: number
      goalDifference: number
      bestRank: number | null
      pim: number
    }> = []

    // Aggregate per team per season across all divisions/rounds
    const tsMap = new Map<string, (typeof teamSeasons)[0]>()

    for (const td of teamDivisions) {
      const s = td.division.season
      if (!seasonMap.has(s.id)) {
        seasonMap.set(s.id, { id: s.id, name: s.name, seasonStart: s.seasonStart })
      }

      for (const round of td.division.rounds) {
        for (const st of round.standings) {
          const key = `${st.teamId}:${s.id}`
          let entry = tsMap.get(key)
          if (!entry) {
            entry = {
              teamId: st.teamId,
              seasonId: s.id,
              gamesPlayed: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDifference: 0,
              bestRank: null,
              pim: pimMap.get(key) ?? 0,
            }
            tsMap.set(key, entry)
          }
          entry.gamesPlayed += st.gamesPlayed
          entry.wins += st.wins
          entry.draws += st.draws
          entry.losses += st.losses
          entry.goalsFor += st.goalsFor
          entry.goalsAgainst += st.goalsAgainst
          entry.goalDifference += st.goalsFor - st.goalsAgainst
          if (st.rank != null && (entry.bestRank === null || st.rank < entry.bestRank)) {
            entry.bestRank = st.rank
          }
        }
      }
    }

    teamSeasons.push(...tsMap.values())

    const seasons = Array.from(seasonMap.values()).sort(
      (a, b) => new Date(a.seasonStart).getTime() - new Date(b.seasonStart).getTime(),
    )

    return { teams: allTeams, seasons, teamSeasons }
  }),

  reportHasReport: publicProcedure
    .input(z.object({ organizationId: z.string(), gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.publicGameReport.findFirst({
        where: {
          organizationId: input.organizationId,
          gameId: input.gameId,
          reverted: false,
        },
        select: { id: true },
      })
      return { hasReport: !!report }
    }),
})
