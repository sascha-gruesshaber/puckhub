import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, protectedProcedure, router } from "../init"

export const organizationRouter = router({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.query.member.findMany({
      where: eq(schema.member.userId, ctx.user.id),
      with: {
        organization: true,
      },
    })
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role,
    }))
  }),

  getActive: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.query.organization.findFirst({
      where: eq(schema.organization.id, ctx.organizationId),
    })
    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organisation nicht gefunden" })
    }
    return org
  }),

  listAll: platformAdminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.query.organization.findMany({
      orderBy: (o, { asc }) => [asc(o.name)],
    })

    const memberCounts = await ctx.db
      .select({
        organizationId: schema.member.organizationId,
        count: schema.member.id,
      })
      .from(schema.member)

    const countMap = new Map<string, number>()
    for (const row of memberCounts) {
      countMap.set(row.organizationId, (countMap.get(row.organizationId) ?? 0) + 1)
    }

    return orgs.map((o) => ({
      ...o,
      memberCount: countMap.get(o.id) ?? 0,
    }))
  }),

  create: platformAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        logo: z.string().nullish(),
        ownerUserId: z.string(),
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
      const existing = await ctx.db.query.organization.findFirst({
        where: eq(schema.organization.slug, input.slug),
      })
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug bereits vergeben" })
      }

      const orgId = crypto.randomUUID()

      return ctx.db.transaction(async (tx) => {
        const [org] = await tx
          .insert(schema.organization)
          .values({
            id: orgId,
            name: input.name,
            slug: input.slug,
            logo: input.logo ?? null,
          })
          .returning()

        await tx.insert(schema.member).values({
          id: crypto.randomUUID(),
          userId: input.ownerUserId,
          organizationId: orgId,
          role: "owner",
        })

        await tx.insert(schema.systemSettings).values({
          organizationId: orgId,
          ...input.leagueSettings,
        })

        return org!
      })
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
        logo: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.slug) {
        const existing = await ctx.db.query.organization.findFirst({
          where: and(eq(schema.organization.slug, input.slug), eq(schema.organization.id, ctx.organizationId)),
        })
        if (!existing) {
          const conflict = await ctx.db.query.organization.findFirst({
            where: eq(schema.organization.slug, input.slug),
          })
          if (conflict) {
            throw new TRPCError({ code: "CONFLICT", message: "Slug bereits vergeben" })
          }
        }
      }

      const [org] = await ctx.db
        .update(schema.organization)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.slug ? { slug: input.slug } : {}),
          ...(input.logo !== undefined ? { logo: input.logo ?? null } : {}),
        })
        .where(eq(schema.organization.id, ctx.organizationId))
        .returning()

      return org
    }),

  listMembers: orgProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.query.member.findMany({
      where: eq(schema.member.organizationId, ctx.organizationId),
      with: {
        user: {
          columns: { id: true, name: true, email: true, image: true },
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
      const existing = await ctx.db.query.invitation.findFirst({
        where: and(
          eq(schema.invitation.email, input.email),
          eq(schema.invitation.organizationId, ctx.organizationId),
          eq(schema.invitation.status, "pending"),
        ),
      })
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Einladung bereits gesendet" })
      }

      const [inv] = await ctx.db
        .insert(schema.invitation)
        .values({
          id: crypto.randomUUID(),
          email: input.email,
          organizationId: ctx.organizationId,
          role: input.role,
          inviterId: ctx.user.id,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning()

      return inv
    }),

  removeMember: orgAdminProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const memberRecord = await ctx.db.query.member.findFirst({
        where: and(eq(schema.member.id, input.memberId), eq(schema.member.organizationId, ctx.organizationId)),
      })
      if (!memberRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mitglied nicht gefunden" })
      }
      if (memberRecord.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Du kannst dich nicht selbst entfernen" })
      }

      await ctx.db.delete(schema.member).where(eq(schema.member.id, input.memberId))
    }),

  delete: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.query.organization.findFirst({
        where: eq(schema.organization.id, input.id),
      })
      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organisation nicht gefunden" })
      }

      await ctx.db.delete(schema.organization).where(eq(schema.organization.id, input.id))

      return { id: input.id }
    }),

  updateMemberRole: orgAdminProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(["owner", "admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const memberRecord = await ctx.db.query.member.findFirst({
        where: and(eq(schema.member.id, input.memberId), eq(schema.member.organizationId, ctx.organizationId)),
      })
      if (!memberRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mitglied nicht gefunden" })
      }

      const [updated] = await ctx.db
        .update(schema.member)
        .set({ role: input.role })
        .where(eq(schema.member.id, input.memberId))
        .returning()

      return updated
    }),
})
