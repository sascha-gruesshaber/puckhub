import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { hashPassword } from "better-auth/crypto"
import { and, eq, ne } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

export const usersRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.query.member.findMany({
      where: eq(schema.member.organizationId, ctx.organizationId),
      with: {
        user: {
          columns: {
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

    return members.map((m) => ({
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

  getById: orgAdminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const memberRecord = await ctx.db.query.member.findFirst({
      where: and(eq(schema.member.userId, input.id), eq(schema.member.organizationId, ctx.organizationId)),
      with: {
        user: {
          columns: {
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
      const [existing] = await ctx.db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, input.email))

      let userId: string

      if (existing) {
        // User exists — check if already a member of this org
        const existingMember = await ctx.db.query.member.findFirst({
          where: and(eq(schema.member.userId, existing.id), eq(schema.member.organizationId, ctx.organizationId)),
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
        await ctx.db.insert(schema.user).values({
          id: userId,
          email: input.email,
          name: input.name,
          emailVerified: true,
        })

        const hashedPw = await hashPassword(input.password)
        await ctx.db.insert(schema.account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: hashedPw,
          userId,
        })
      }

      // Add as member to org
      await ctx.db.insert(schema.member).values({
        id: crypto.randomUUID(),
        userId,
        organizationId: ctx.organizationId,
        role: input.role,
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
        const [existing] = await ctx.db
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(and(eq(schema.user.email, data.email), ne(schema.user.id, id)))

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits",
          })
        }
      }

      const [updated] = await ctx.db
        .update(schema.user)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.user.id, id))
        .returning()

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
    await ctx.db
      .delete(schema.member)
      .where(and(eq(schema.member.userId, input.id), eq(schema.member.organizationId, ctx.organizationId)))
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

      const [updated] = await ctx.db
        .update(schema.account)
        .set({ password: hashedPw, updatedAt: new Date() })
        .where(and(eq(schema.account.userId, input.id), eq(schema.account.providerId, "credential")))
        .returning()

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden" })
      }

      await ctx.db.delete(schema.session).where(eq(schema.session.userId, input.id))
    }),

  updateRole: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["owner", "admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const memberRecord = await ctx.db.query.member.findFirst({
        where: and(eq(schema.member.userId, input.userId), eq(schema.member.organizationId, ctx.organizationId)),
      })

      if (!memberRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mitglied nicht gefunden" })
      }

      const [updated] = await ctx.db
        .update(schema.member)
        .set({ role: input.role })
        .where(eq(schema.member.id, memberRecord.id))
        .returning()

      return updated
    }),
})
