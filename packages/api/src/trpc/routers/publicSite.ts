import { z } from "zod"
import { publicProcedure, router } from "../init"
import { checkRecapEligibility, generateAndPersistRecap } from "../../services/aiRecapService"
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
        description: true,
        sortOrder: true,
        priceMonthly: true,
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
        featureExportImport: true,
        featureGameReports: true,
        featurePlayerStats: true,
        featureScheduler: true,
        featureScheduledNews: true,
        featureAdvancedRoles: true,
        featureAdvancedStats: true,
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
        include: { plan: { select: { featureAdvancedStats: true } } },
      }),
    ])

    const features = {
      advancedStats: subscription?.plan?.featureAdvancedStats ?? false,
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
        include: { plan: { select: { featureAdvancedStats: true } } },
      }),
    ])

    const features = {
      advancedStats: subscription?.plan?.featureAdvancedStats ?? false,
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
          rounds: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, roundType: true, sortOrder: true } },
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
        include: { team: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true, city: true, homeVenue: true, website: true } } },
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
            orderBy: [{ period: "asc" }, { timeMinutes: "asc" }, { timeSeconds: "asc" }],
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
      if (
        game.status === "completed" &&
        game.recapTitle === null &&
        !game.recapGenerating
      ) {
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
    .input(z.object({ organizationId: z.string(), seasonId: z.string().uuid().optional(), limit: z.number().int().min(1).max(20).default(5) }))
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
    .input(z.object({ organizationId: z.string(), seasonId: z.string().uuid().optional(), limit: z.number().int().min(1).max(20).default(5) }))
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
          select: { team: { select: { id: true, name: true, shortName: true, city: true, logoUrl: true, primaryColor: true, homeVenue: true, website: true } } },
          distinct: ["teamId"],
        })
        return teamDivisions.map((td) => td.team)
      }
      return ctx.db.team.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, shortName: true, city: true, logoUrl: true, primaryColor: true, homeVenue: true, website: true },
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
            select: { id: true, title: true, slug: true, content: true, menuLocations: true, updatedAt: true, status: true },
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
        if (!row.penaltyPlayerId) continue
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
                  division: { select: { name: true, season: { select: { name: true } } } },
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

      const [team, teamDivisions, allScorers, allGoalies] = await Promise.all([
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
      ])

      if (!team) return null

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
          let gp = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0
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
            totals: { gamesPlayed: gp, wins: w, draws: d, losses: l, goalsFor: gf, goalsAgainst: ga, goalDifference: gf - ga },
            bestRank,
            bestRankRoundType,
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
})
