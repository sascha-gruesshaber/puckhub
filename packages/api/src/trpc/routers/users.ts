import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { sendEmail } from "../../lib/email"
import { inviteEmail } from "../../lib/emailTemplates"
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, protectedProcedure, router } from "../init"

const ORG_ROLE_VALUES = ["owner", "admin", "game_manager", "game_reporter", "team_manager", "editor"] as const

export const usersRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.member.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            createdAt: true,
          },
        },
        memberRoles: {
          select: { id: true, role: true, teamId: true },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return members.map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      emailVerified: m.user.emailVerified,
      image: m.user.image,
      createdAt: m.user.createdAt,
      memberId: m.id,
      role: m.role,
      memberSince: m.createdAt,
      memberRoles: m.memberRoles,
    }))
  }),

  listAll: platformAdminProcedure.query(async ({ ctx }) => {
    const allUsers = await ctx.db.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        banned: true,
        createdAt: true,
      },
    })

    const allMembers = await ctx.db.member.findMany({
      include: {
        organization: {
          select: { id: true, name: true },
        },
        memberRoles: {
          select: { role: true, teamId: true },
        },
      },
    })

    const membersByUser = new Map<
      string,
      {
        organizationId: string
        organizationName: string
        role: string
        memberRoles: { role: string; teamId: string | null }[]
      }[]
    >()
    for (const m of allMembers) {
      const list = membersByUser.get(m.userId) ?? []
      list.push({
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        role: m.role,
        memberRoles: m.memberRoles,
      })
      membersByUser.set(m.userId, list)
    }

    return allUsers.map((u: any) => ({
      ...u,
      organizations: membersByUser.get(u.id) ?? [],
    }))
  }),

  getById: orgAdminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const memberRecord = await ctx.db.member.findFirst({
      where: {
        userId: input.id,
        organizationId: ctx.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            createdAt: true,
          },
        },
        memberRoles: {
          select: { id: true, role: true, teamId: true },
        },
      },
    })

    if (!memberRecord) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND)
    }

    return {
      ...memberRecord.user,
      memberId: memberRecord.id,
      role: memberRecord.role,
      memberSince: memberRecord.createdAt,
      memberRoles: memberRecord.memberRoles,
    }
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(ORG_ROLE_VALUES).default("admin"),
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

      // Better Auth stores and looks up emails in lowercase
      const normalizedEmail = input.email.toLowerCase()

      const existing = await ctx.db.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true },
      })

      let userId: string
      let isNewUser = false

      if (existing) {
        // User exists — check if already a member of this org
        const existingMember = await ctx.db.member.findFirst({
          where: { userId: existing.id, organizationId: ctx.organizationId },
        })
        if (existingMember) {
          throw createAppError("CONFLICT", APP_ERROR_CODES.USER_ALREADY_MEMBER)
        }
        userId = existing.id
      } else {
        // Create new user (no password — they'll use magic link)
        userId = crypto.randomUUID()
        isNewUser = true
        await ctx.db.user.create({
          data: {
            id: userId,
            email: normalizedEmail,
            name: input.name,
            emailVerified: true,
          },
        })
      }

      // Add as member to org
      const memberId = crypto.randomUUID()
      await ctx.db.member.create({
        data: {
          id: memberId,
          userId,
          organizationId: ctx.organizationId,
          role: "member",
        },
      })

      // Create the initial MemberRole
      await ctx.db.memberRole.create({
        data: {
          memberId,
          role: input.role,
        },
      })

      // Send invite email to the new user
      const org = await ctx.db.organization.findFirst({
        where: { id: ctx.organizationId },
        select: { name: true },
      })
      const adminUrl = process.env.TRUSTED_ORIGINS?.split(",")[0]?.trim() ?? "http://admin.puckhub.localhost"
      const loginUrl = `${adminUrl}/login`
      await sendEmail({
        to: normalizedEmail,
        subject: `You've been invited to ${org?.name ?? "PuckHub"}`,
        html: inviteEmail(loginUrl, org?.name),
      })

      return { userId }
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
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

      const { id, ...data } = input
      if (Object.keys(data).length === 0) return

      // Verify target user belongs to caller's organization
      const memberRecord = await ctx.db.member.findFirst({
        where: { userId: id, organizationId: ctx.organizationId },
      })
      if (!memberRecord) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND)
      }

      // Better Auth stores and looks up emails in lowercase
      if (data.email) {
        data.email = data.email.toLowerCase()

        const existing = await ctx.db.user.findFirst({
          where: {
            email: data.email,
            id: { not: id },
          },
          select: { id: true },
        })

        if (existing) {
          throw createAppError("CONFLICT", APP_ERROR_CODES.USER_EMAIL_CONFLICT)
        }
      }

      const updated = await ctx.db.user.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      })

      if (!updated) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND)
      }

      return updated
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.organizationId === "demo-league") {
      throw createAppError(
        "FORBIDDEN",
        APP_ERROR_CODES.DEMO_ORG_RESTRICTED,
        "User management is disabled for the demo league",
      )
    }

    if (ctx.user.id === input.id) {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.USER_CANNOT_DELETE_SELF)
    }

    // Remove member record from this org (cascades MemberRole entries)
    await ctx.db.member.deleteMany({
      where: { userId: input.id, organizationId: ctx.organizationId },
    })
  }),

  updateRole: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["owner", "admin", "member"]),
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
        where: { userId: input.userId, organizationId: ctx.organizationId },
      })

      if (!memberRecord) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_NOT_FOUND)
      }

      const updated = await ctx.db.member.update({
        where: { id: memberRecord.id },
        data: { role: input.role },
      })

      return updated
    }),

  deleteGlobal: platformAdminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.id === input.id) {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.USER_CANNOT_DELETE_SELF)
    }

    const user = await ctx.db.user.findFirst({ where: { id: input.id } })
    if (!user) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND)
    }

    // Prisma cascades handle sessions, accounts, members
    await ctx.db.user.delete({ where: { id: input.id } })

    return { id: input.id }
  }),

  addToOrganization: platformAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        role: z.enum(ORG_ROLE_VALUES).default("admin"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingMember = await ctx.db.member.findFirst({
        where: { userId: input.userId, organizationId: input.organizationId },
      })
      if (existingMember) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.USER_ALREADY_MEMBER)
      }

      const memberId = crypto.randomUUID()
      await ctx.db.member.create({
        data: {
          id: memberId,
          userId: input.userId,
          organizationId: input.organizationId,
          role: "member",
        },
      })

      await ctx.db.memberRole.create({
        data: {
          memberId,
          role: input.role,
        },
      })

      return { ok: true }
    }),

  removeFromOrganization: platformAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.member.deleteMany({
        where: { userId: input.userId, organizationId: input.organizationId },
      })

      return { ok: true }
    }),

  changeOrganizationRole: platformAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        role: z.enum(ORG_ROLE_VALUES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.findFirst({
        where: { userId: input.userId, organizationId: input.organizationId },
      })
      if (!member) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.MEMBER_NOT_FOUND)
      }

      // Replace all org-level roles (keep team-scoped roles intact)
      await ctx.db.memberRole.deleteMany({
        where: { memberId: member.id, teamId: null },
      })

      await ctx.db.memberRole.create({
        data: { memberId: member.id, role: input.role },
      })

      return { ok: true }
    }),

  updateEmail: platformAdminProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Better Auth stores and looks up emails in lowercase
      const normalizedEmail = input.email.toLowerCase()

      const user = await ctx.db.user.findFirst({ where: { id: input.id } })
      if (!user) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND)
      }

      const existing = await ctx.db.user.findFirst({
        where: { email: normalizedEmail, id: { not: input.id } },
        select: { id: true },
      })
      if (existing) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.USER_EMAIL_CONFLICT)
      }

      await ctx.db.user.update({
        where: { id: input.id },
        data: { email: normalizedEmail, updatedAt: new Date() },
      })

      return { ok: true }
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, isDemoUser: true },
    })
    return user
  }),

  createPlatformUser: platformAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["admin"]).nullish(),
        sendInvite: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findFirst({
        where: { email: input.email },
        select: { id: true },
      })
      if (existing) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.USER_EMAIL_CONFLICT)
      }

      const userId = crypto.randomUUID()
      await ctx.db.user.create({
        data: {
          id: userId,
          email: input.email,
          name: input.name,
          emailVerified: true,
          role: input.role ?? null,
        },
      })

      if (input.sendInvite) {
        const adminUrl = process.env.TRUSTED_ORIGINS?.split(",")[0]?.trim() ?? "http://admin.puckhub.localhost"
        const loginUrl = `${adminUrl}/login`
        await sendEmail({
          to: input.email,
          subject: "Welcome to PuckHub",
          html: inviteEmail(loginUrl),
        })
      }

      return { userId, email: input.email }
    }),
})
