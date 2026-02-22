import { hashPassword } from "better-auth/crypto"
import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, protectedProcedure, router } from "../init"

const ORG_ROLE_VALUES = ["owner", "admin", "game_manager", "game_reporter", "team_manager", "editor"] as const

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
        logo: z.string().nullish(),
        ownerEmail: z.string().email(),
        ownerName: z.string().min(1),
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
      let generatedPassword: string | undefined

      // Look up or create user
      const existingUser = await ctx.db.user.findFirst({ where: { email: input.ownerEmail } })
      let ownerUserId: string

      if (existingUser) {
        ownerUserId = existingUser.id
      } else {
        // Generate secure random password
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        generatedPassword = Array.from(bytes, (b) => chars[b % chars.length]).join("")
        isNewUser = true
        ownerUserId = crypto.randomUUID()
      }

      const result = await ctx.db.$transaction(async (tx: any) => {
        // Create user + account if new
        if (isNewUser) {
          await tx.user.create({
            data: {
              id: ownerUserId,
              email: input.ownerEmail,
              name: input.ownerName,
              emailVerified: true,
            },
          })

          const hashedPw = await hashPassword(generatedPassword!)
          await tx.account.create({
            data: {
              id: crypto.randomUUID(),
              accountId: ownerUserId,
              providerId: "credential",
              password: hashedPw,
              userId: ownerUserId,
            },
          })
        }

        const org = await tx.organization.create({
          data: {
            id: orgId,
            name: input.name,
            logo: input.logo ?? null,
          },
        })

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

        await tx.systemSettings.create({
          data: {
            organizationId: orgId,
            ...input.leagueSettings,
          },
        })

        return org
      })

      return { organization: result, isNewUser, generatedPassword }
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

  getMemberRoles: orgAdminProcedure
    .input(z.object({ memberId: z.string() }))
    .query(async ({ ctx, input }) => {
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

  removeMemberRole: orgAdminProcedure
    .input(z.object({ memberRoleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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
