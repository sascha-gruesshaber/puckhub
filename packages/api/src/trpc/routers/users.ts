import { hashPassword } from "better-auth/crypto"
import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, router } from "../init"

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

    const membersByUser = new Map<string, { organizationId: string; organizationName: string; role: string; memberRoles: { role: string; teamId: string | null }[] }[]>()
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
        password: z.string().min(6),
        role: z.enum(ORG_ROLE_VALUES).default("admin"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findFirst({
        where: { email: input.email },
        select: { id: true },
      })

      let userId: string

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
        // Create new user
        userId = crypto.randomUUID()
        await ctx.db.user.create({
          data: {
            id: userId,
            email: input.email,
            name: input.name,
            emailVerified: true,
          },
        })

        const hashedPw = await hashPassword(input.password)
        await ctx.db.account.create({
          data: {
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            password: hashedPw,
            userId,
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
      const { id, ...data } = input
      if (Object.keys(data).length === 0) return

      if (data.email) {
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
    if (ctx.user.id === input.id) {
      throw createAppError("BAD_REQUEST", APP_ERROR_CODES.USER_CANNOT_DELETE_SELF)
    }

    // Remove member record from this org (cascades MemberRole entries)
    await ctx.db.member.deleteMany({
      where: { userId: input.id, organizationId: ctx.organizationId },
    })
  }),

  resetPassword: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hashedPw = await hashPassword(input.password)

      const existing = await ctx.db.account.findFirst({
        where: { userId: input.id, providerId: "credential" },
      })

      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.ACCOUNT_NOT_FOUND)
      }

      await ctx.db.account.update({
        where: { id: existing.id },
        data: { password: hashedPw, updatedAt: new Date() },
      })

      await ctx.db.session.deleteMany({ where: { userId: input.id } })
    }),

  updateRole: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["owner", "admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
      if (ctx.user.id === input.userId) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.MEMBER_CANNOT_REMOVE_SELF)
      }

      await ctx.db.member.deleteMany({
        where: { userId: input.userId, organizationId: input.organizationId },
      })

      return { ok: true }
    }),
})
