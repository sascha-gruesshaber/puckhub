import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { hashPassword } from "better-auth/crypto"
import { and, eq, ne } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, router } from "../init"

const roleValues = ["super_admin", "league_admin", "team_manager", "scorekeeper", "viewer"] as const

export const usersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .orderBy(schema.user.name)

    const roles = await ctx.db
      .select({
        id: schema.userRoles.id,
        userId: schema.userRoles.userId,
        role: schema.userRoles.role,
        teamId: schema.userRoles.teamId,
        createdAt: schema.userRoles.createdAt,
      })
      .from(schema.userRoles)

    const teams = await ctx.db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        shortName: schema.teams.shortName,
      })
      .from(schema.teams)

    const teamMap = new Map(teams.map((t) => [t.id, t]))

    const rolesByUser = new Map<string, typeof roles>()
    for (const r of roles) {
      let list = rolesByUser.get(r.userId)
      if (!list) {
        list = []
        rolesByUser.set(r.userId, list)
      }
      list.push(r)
    }

    return users.map((u) => ({
      ...u,
      roles: (rolesByUser.get(u.id) ?? []).map((r) => ({
        ...r,
        team: r.teamId ? (teamMap.get(r.teamId) ?? null) : null,
      })),
    }))
  }),

  getById: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [user] = await ctx.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, input.id))

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Benutzer nicht gefunden" })
    }

    const roles = await ctx.db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, input.id))

    return { ...user, roles }
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, input.email))

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits",
        })
      }

      const userId = crypto.randomUUID()
      const [user] = await ctx.db
        .insert(schema.user)
        .values({
          id: userId,
          email: input.email,
          name: input.name,
          emailVerified: true,
        })
        .returning()

      const hashedPw = await hashPassword(input.password)
      await ctx.db.insert(schema.account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        password: hashedPw,
        userId,
      })

      return user!
    }),

  update: adminProcedure
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

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // Prevent deleting yourself
    if (ctx.user.id === input.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Du kannst deinen eigenen Account nicht löschen",
      })
    }

    await ctx.db.transaction(async (tx) => {
      // userRoles has no FK cascade, delete explicitly
      await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, input.id))
      // session + account cascade via onDelete on user FK
      await tx.delete(schema.user).where(eq(schema.user.id, input.id))
    })
  }),

  resetPassword: adminProcedure
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

      // Invalidate all existing sessions
      await ctx.db.delete(schema.session).where(eq(schema.session.userId, input.id))
    }),

  assignRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(roleValues),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has this role (with same team)
      const existing = await ctx.db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, input.userId))

      const duplicate = existing.find((r) => r.role === input.role && r.teamId === (input.teamId ?? null))

      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Diese Rolle ist bereits zugewiesen",
        })
      }

      const [role] = await ctx.db
        .insert(schema.userRoles)
        .values({
          userId: input.userId,
          role: input.role,
          teamId: input.teamId ?? null,
        })
        .returning()

      return role
    }),

  removeRole: adminProcedure.input(z.object({ roleId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.userRoles).where(eq(schema.userRoles.id, input.roleId))
  }),

  listTeams: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        shortName: schema.teams.shortName,
      })
      .from(schema.teams)
      .orderBy(schema.teams.name)
  }),
})
