import { TRPCError } from "@trpc/server"
import { hashPassword } from "better-auth/crypto"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, router } from "../init"

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
          select: { id: true, name: true, slug: true },
        },
      },
    })

    const membersByUser = new Map<string, { organizationId: string; organizationName: string; organizationSlug: string; role: string }[]>()
    for (const m of allMembers) {
      const list = membersByUser.get(m.userId) ?? []
      list.push({
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.role,
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
      },
    })

    if (!memberRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Benutzer nicht gefunden" })
    }

    return {
      ...memberRecord.user,
      memberId: memberRecord.id,
      role: memberRecord.role,
      memberSince: memberRecord.createdAt,
    }
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "member"]).default("member"),
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
          throw new TRPCError({
            code: "CONFLICT",
            message: "Benutzer ist bereits Mitglied dieser Organisation",
          })
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
      await ctx.db.member.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          organizationId: ctx.organizationId,
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
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits",
          })
        }
      }

      const updated = await ctx.db.user.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      })

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Benutzer nicht gefunden" })
      }

      return updated
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.id === input.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Du kannst dich selbst nicht entfernen",
      })
    }

    // Remove member record from this org (don't delete the user globally)
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden" })
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Mitglied nicht gefunden" })
      }

      const updated = await ctx.db.member.update({
        where: { id: memberRecord.id },
        data: { role: input.role },
      })

      return updated
    }),
})
