import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { sendEmail } from "../../lib/email"
import { inviteEmail } from "../../lib/emailTemplates"
import { ensureSystemPages } from "../../services/ensureSystemPages"
import { checkLimit, getOrgPlan } from "../../services/planLimits"
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, protectedProcedure, router } from "../init"

const ORG_ROLE_VALUES = ["owner", "admin", "game_manager", "game_reporter", "team_manager", "editor"] as const

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export const organizationRouter = router({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.member.findMany({
      where: { userId: ctx.user.id },
      include: {
        organization: true,
      },
    })
    return memberships.map((m: any) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role,
    }))
  }),

  getActive: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findFirst({
      where: { id: ctx.organizationId },
    })
    if (!org) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.ORG_NOT_FOUND)
    }
    return org
  }),

  getActiveOrNull: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeOrganizationId
    if (!organizationId) return null

    const org = await ctx.db.organization.findFirst({
      where: { id: organizationId },
    })
    return org ?? null
  }),

  clearActive: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.session.updateMany({
      where: { userId: ctx.user.id },
      data: { activeOrganizationId: null },
    })
    return { ok: true }
  }),

  setActive: protectedProcedure.input(z.object({ organizationId: z.string() })).mutation(async ({ ctx, input }) => {
    const membership = await ctx.db.member.findFirst({
      where: { userId: ctx.user.id, organizationId: input.organizationId },
    })
    if (!membership) {
      throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_MEMBER)
    }

    await ctx.db.session.updateMany({
      where: { userId: ctx.user.id },
      data: { activeOrganizationId: input.organizationId },
    })

    return { organizationId: input.organizationId }
  }),

  listAll: platformAdminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        subscription: {
          include: {
            plan: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    const memberCounts = await ctx.db.member.groupBy({
      by: ["organizationId"],
      _count: { id: true },
    })

    const countMap = new Map<string, number>()
    for (const row of memberCounts) {
      countMap.set(row.organizationId, row._count.id)
    }

    return orgs.map((o: any) => ({
      ...o,
      memberCount: countMap.get(o.id) ?? 0,
    }))
  }),

  create: platformAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        logo: z.string().nullish(),
        ownerEmail: z.string().email().optional(),
        ownerName: z.string().min(1).optional(),
        planId: z.string().uuid().optional(),
        leagueSettings: z.object({
          leagueName: z.string().min(1),
          leagueShortName: z.string().min(1),
          locale: z.string().default("de-DE"),
          timezone: z.string().default("Europe/Berlin"),
          pointsWin: z.number().int().default(2),
          pointsDraw: z.number().int().default(1),
          pointsLoss: z.number().int().default(0),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = crypto.randomUUID()
      let isNewUser = false

      // Generate or validate slug
      let orgSlug = input.slug || slugify(input.name)
      if (!orgSlug) orgSlug = orgId.slice(0, 8)

      // Ensure uniqueness
      const baseSlug = orgSlug
      let counter = 1
      while (await ctx.db.organization.findFirst({ where: { slug: orgSlug } })) {
        orgSlug = `${baseSlug}-${counter++}`
      }

      // Resolve plan (default to Free)
      let planId = input.planId
      if (!planId) {
        const freePlan = await ctx.db.plan.findUnique({ where: { slug: "free" } })
        if (freePlan) planId = freePlan.id
      }

      // Look up or create user (only if owner email provided)
      let ownerUserId: string | null = null

      if (input.ownerEmail) {
        const existingUser = await ctx.db.user.findFirst({ where: { email: input.ownerEmail } })

        if (existingUser) {
          ownerUserId = existingUser.id
        } else {
          isNewUser = true
          ownerUserId = crypto.randomUUID()
        }
      }

      const result = await ctx.db.$transaction(async (tx: any) => {
        // Create user if new (no password — they'll use magic link)
        if (isNewUser && ownerUserId) {
          await tx.user.create({
            data: {
              id: ownerUserId,
              email: input.ownerEmail!,
              name: input.ownerName || input.ownerEmail!.split("@")[0],
              emailVerified: true,
            },
          })
        }

        const org = await tx.organization.create({
          data: {
            id: orgId,
            name: input.name,
            slug: orgSlug,
            logo: input.logo ?? null,
          },
        })

        // Create member + owner role only if owner specified
        if (ownerUserId) {
          const ownerMemberId = crypto.randomUUID()
          await tx.member.create({
            data: {
              id: ownerMemberId,
              userId: ownerUserId,
              organizationId: orgId,
              role: "member",
            },
          })

          await tx.memberRole.create({
            data: {
              memberId: ownerMemberId,
              role: "owner",
            },
          })
        }

        await tx.systemSettings.create({
          data: {
            organizationId: orgId,
            ...input.leagueSettings,
          },
        })

        // Create website config (subdomain derived from organization.slug)
        await tx.websiteConfig.create({
          data: {
            organizationId: orgId,
            isActive: true,
            templatePreset: "classic",
          },
        })

        // Create default pages based on locale
        const isGerman = input.leagueSettings.locale?.startsWith("de") ?? true

        const defaultPages = isGerman
          ? [
              {
                title: "Impressum",
                slug: "impressum",
                content: "<h2>Impressum</h2><p>Hier steht Ihr Impressum.</p>",
                menuLocations: ["footer"],
                sortOrder: 100,
              },
              {
                title: "Datenschutz",
                slug: "datenschutz",
                content: "<h2>Datenschutzerklärung</h2><p>Hier steht Ihre Datenschutzerklärung.</p>",
                menuLocations: ["footer"],
                sortOrder: 101,
              },
              {
                title: "Kontakt",
                slug: "kontakt",
                content: "<h2>Kontakt</h2><p>Hier stehen Ihre Kontaktdaten.</p>",
                menuLocations: ["footer", "main_nav"],
                sortOrder: 102,
              },
            ]
          : [
              {
                title: "Legal Notice",
                slug: "legal-notice",
                content: "<h2>Legal Notice</h2><p>Your legal notice goes here.</p>",
                menuLocations: ["footer"],
                sortOrder: 100,
              },
              {
                title: "Privacy Policy",
                slug: "privacy-policy",
                content: "<h2>Privacy Policy</h2><p>Your privacy policy goes here.</p>",
                menuLocations: ["footer"],
                sortOrder: 101,
              },
              {
                title: "Contact",
                slug: "contact",
                content: "<h2>Contact</h2><p>Your contact information goes here.</p>",
                menuLocations: ["footer", "main_nav"],
                sortOrder: 102,
              },
            ]

        await tx.page.createMany({
          data: defaultPages.map((p) => ({ organizationId: orgId, ...p, status: "published" as const })),
        })

        // Create system route pages for navigation
        await ensureSystemPages(tx as any, orgId, input.leagueSettings.locale)

        // Create default jerseys based on locale
        const templates = await tx.trikotTemplate.findMany()
        const oneColor = templates.find((t: any) => t.templateType === "one_color")
        const twoColor = templates.find((t: any) => t.templateType === "two_color")

        if (oneColor && twoColor) {
          const defaultTrikots = isGerman
            ? [
                { name: "Weiß", templateId: oneColor.id, primaryColor: "#FFFFFF", secondaryColor: null },
                { name: "Schwarz", templateId: oneColor.id, primaryColor: "#000000", secondaryColor: null },
                { name: "Schwarz-Weiß", templateId: twoColor.id, primaryColor: "#000000", secondaryColor: "#FFFFFF" },
                { name: "Grün-Weiß", templateId: twoColor.id, primaryColor: "#228B22", secondaryColor: "#FFFFFF" },
                { name: "Blau-Weiß", templateId: twoColor.id, primaryColor: "#1E90FF", secondaryColor: "#FFFFFF" },
              ]
            : [
                { name: "White", templateId: oneColor.id, primaryColor: "#FFFFFF", secondaryColor: null },
                { name: "Black", templateId: oneColor.id, primaryColor: "#000000", secondaryColor: null },
                {
                  name: "Black and White",
                  templateId: twoColor.id,
                  primaryColor: "#000000",
                  secondaryColor: "#FFFFFF",
                },
                {
                  name: "Green and White",
                  templateId: twoColor.id,
                  primaryColor: "#228B22",
                  secondaryColor: "#FFFFFF",
                },
                { name: "Blue and White", templateId: twoColor.id, primaryColor: "#1E90FF", secondaryColor: "#FFFFFF" },
              ]

          await tx.trikot.createMany({
            data: defaultTrikots.map((t) => ({ organizationId: orgId, ...t })),
          })
        }

        // Assign plan subscription
        if (planId) {
          const now = new Date()
          const periodEnd = new Date(now)
          periodEnd.setFullYear(periodEnd.getFullYear() + 100)
          await tx.orgSubscription.create({
            data: {
              organizationId: orgId,
              planId,
              interval: "yearly",
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          })
        }

        return org
      })

      // Send invite email to owner if new user
      if (isNewUser && input.ownerEmail) {
        const adminUrl = process.env.TRUSTED_ORIGINS?.split(",")[0]?.trim() ?? "http://admin.puckhub.localhost"
        const loginUrl = `${adminUrl}/login`
        await sendEmail({
          to: input.ownerEmail,
          subject: `Welcome to PuckHub — ${input.name}`,
          html: inviteEmail(loginUrl, input.name),
        })
      }

      return { organization: result, isNewUser }
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        logo: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.update({
        where: { id: ctx.organizationId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.logo !== undefined ? { logo: input.logo ?? null } : {}),
        },
      })

      return org
    }),

  /** Platform admin: update any organization's details */
  platformUpdate: platformAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findFirst({ where: { id: input.id } })
      if (!org) throw createAppError("NOT_FOUND", APP_ERROR_CODES.ORG_NOT_FOUND)

      // Check slug uniqueness if changed
      if (input.slug && input.slug !== org.slug) {
        const existing = await ctx.db.organization.findFirst({ where: { slug: input.slug } })
        if (existing) throw createAppError("CONFLICT", APP_ERROR_CODES.ORG_SLUG_CONFLICT)
      }

      // Ensure websiteConfig exists when slug changes (subdomain is derived from org.slug)
      if (input.slug && input.slug !== org.slug) {
        const existing = await ctx.db.websiteConfig.findUnique({ where: { organizationId: input.id } })
        if (!existing) {
          await ctx.db.websiteConfig.create({
            data: {
              organizationId: input.id,
              isActive: true,
              templatePreset: "classic",
            },
          })
        }
      }

      return ctx.db.organization.update({
        where: { id: input.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.slug ? { slug: input.slug } : {}),
        },
      })
    }),

  listMembers: orgProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.member.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })
    return members
  }),

  inviteMember: orgAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "member"]).default("member"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check admin limit when inviting with admin role
      if (input.role === "admin") {
        const plan = await getOrgPlan(ctx.db, ctx.organizationId)
        const adminCount = await ctx.db.member.count({
          where: {
            organizationId: ctx.organizationId,
            role: { in: ["owner", "admin"] },
          },
        })
        checkLimit(plan, "maxAdmins", adminCount)
      }

      const existing = await ctx.db.invitation.findFirst({
        where: {
          email: input.email,
          organizationId: ctx.organizationId,
          status: "pending",
        },
      })
      if (existing) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.ORG_INVITATION_ALREADY_SENT)
      }

      const inv = await ctx.db.invitation.create({
        data: {
          id: crypto.randomUUID(),
          email: input.email,
          organizationId: ctx.organizationId,
          role: input.role,
          inviterId: ctx.user.id,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return inv
    }),

  removeMember: orgAdminProcedure.input(z.object({ memberId: z.string() })).mutation(async ({ ctx, input }) => {
    const memberRecord = await ctx.db.member.findFirst({
      where: { id: input.memberId, organizationId: ctx.organizationId },
    })
    if (!memberRecord) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_NOT_FOUND)
    }
    if (memberRecord.userId === ctx.user.id) {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.MEMBER_CANNOT_REMOVE_SELF)
    }

    await ctx.db.member.delete({ where: { id: input.memberId } })
  }),

  delete: platformAdminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const org = await ctx.db.organization.findFirst({
      where: { id: input.id },
    })
    if (!org) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.ORG_NOT_FOUND)
    }

    // Get members before deleting (to find orphaned users afterwards)
    const members = await ctx.db.member.findMany({
      where: { organizationId: input.id },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    // Delete the organization (cascades member records)
    await ctx.db.organization.delete({ where: { id: input.id } })

    // Clean up orphaned users: users who now have zero memberships and are not platform admins
    if (memberUserIds.length > 0) {
      const remainingMemberships = await ctx.db.member.findMany({
        where: { userId: { in: memberUserIds } },
        select: { userId: true },
      })
      const usersWithMemberships = new Set(remainingMemberships.map((m) => m.userId))

      const orphanedUserIds = memberUserIds.filter((id) => !usersWithMemberships.has(id))

      if (orphanedUserIds.length > 0) {
        // Don't delete platform admins
        const platformAdmins = await ctx.db.user.findMany({
          where: { id: { in: orphanedUserIds }, role: "admin" },
          select: { id: true },
        })
        const platformAdminIds = new Set(platformAdmins.map((u) => u.id))

        const toDelete = orphanedUserIds.filter((id) => !platformAdminIds.has(id))
        if (toDelete.length > 0) {
          await ctx.db.user.deleteMany({ where: { id: { in: toDelete } } })
        }
      }
    }

    return { id: input.id }
  }),

  setActiveForAdmin: platformAdminProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findFirst({
        where: { id: input.organizationId },
      })
      if (!org) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.ORG_NOT_FOUND)
      }

      // Directly update session's activeOrganizationId (bypasses Better Auth membership check)
      await ctx.db.session.updateMany({
        where: { userId: ctx.user.id },
        data: { activeOrganizationId: input.organizationId },
      })

      return { organizationId: input.organizationId }
    }),

  updateMemberRole: orgAdminProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(["owner", "admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const memberRecord = await ctx.db.member.findFirst({
        where: { id: input.memberId, organizationId: ctx.organizationId },
      })
      if (!memberRecord) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_NOT_FOUND)
      }

      const updated = await ctx.db.member.update({
        where: { id: input.memberId },
        data: { role: input.role },
      })

      return updated
    }),

  // --- Fine-grained role management ---

  getMyRoles: orgProcedure.query(async ({ ctx }) => {
    const membership = await ctx.db.member.findFirst({
      where: { userId: ctx.user.id, organizationId: ctx.organizationId },
      select: {
        id: true,
        memberRoles: {
          select: {
            id: true,
            role: true,
            teamId: true,
            team: { select: { id: true, name: true, shortName: true } },
          },
        },
      },
    })

    if (!membership) return []

    return membership.memberRoles
  }),

  getMemberRoles: orgAdminProcedure.input(z.object({ memberId: z.string() })).query(async ({ ctx, input }) => {
    const memberRecord = await ctx.db.member.findFirst({
      where: { id: input.memberId, organizationId: ctx.organizationId },
    })
    if (!memberRecord) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_NOT_FOUND)
    }

    return ctx.db.memberRole.findMany({
      where: { memberId: input.memberId },
      include: {
        team: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }),

  addMemberRole: orgAdminProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(ORG_ROLE_VALUES),
        teamId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.organizationId === "demo-league") {
        throw createAppError(
          "FORBIDDEN",
          APP_ERROR_CODES.DEMO_ORG_RESTRICTED,
          "User management is disabled for the demo league",
        )
      }

      const memberRecord = await ctx.db.member.findFirst({
        where: { id: input.memberId, organizationId: ctx.organizationId },
      })
      if (!memberRecord) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_NOT_FOUND)
      }

      // Validate team belongs to this org (if provided)
      if (input.teamId) {
        const team = await ctx.db.team.findFirst({
          where: { id: input.teamId, organizationId: ctx.organizationId },
        })
        if (!team) {
          throw createAppError("NOT_FOUND", APP_ERROR_CODES.TEAM_NOT_FOUND)
        }
      }

      // Check for duplicate
      const existing = await ctx.db.memberRole.findFirst({
        where: {
          memberId: input.memberId,
          role: input.role,
          teamId: input.teamId ?? null,
        },
      })
      if (existing) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.USER_ROLE_ALREADY_ASSIGNED)
      }

      return ctx.db.memberRole.create({
        data: {
          memberId: input.memberId,
          role: input.role,
          teamId: input.teamId ?? null,
        },
        include: {
          team: { select: { id: true, name: true, shortName: true } },
        },
      })
    }),

  setAiEnabled: orgAdminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (ctx.organizationId === "demo-league") {
      throw createAppError(
        "FORBIDDEN",
        APP_ERROR_CODES.DEMO_ORG_RESTRICTED,
        "AI features cannot be enabled for demo organizations",
      )
    }
    await ctx.db.organization.update({
      where: { id: ctx.organizationId },
      data: { aiEnabled: input.enabled },
    })
    return { success: true }
  }),

  removeMemberRole: orgAdminProcedure
    .input(z.object({ memberRoleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.organizationId === "demo-league") {
        throw createAppError(
          "FORBIDDEN",
          APP_ERROR_CODES.DEMO_ORG_RESTRICTED,
          "User management is disabled for the demo league",
        )
      }

      const memberRole = await ctx.db.memberRole.findUnique({
        where: { id: input.memberRoleId },
        include: {
          member: { select: { organizationId: true } },
        },
      })

      if (!memberRole || memberRole.member.organizationId !== ctx.organizationId) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_ROLE_NOT_FOUND)
      }

      // Prevent removing the last owner role in the organization
      if (memberRole.role === "owner") {
        const ownerCount = await ctx.db.memberRole.count({
          where: {
            role: "owner",
            member: { organizationId: ctx.organizationId },
          },
        })
        if (ownerCount <= 1) {
          throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_LAST_OWNER)
        }
      }

      await ctx.db.memberRole.delete({ where: { id: input.memberRoleId } })
      return { success: true }
    }),
})
