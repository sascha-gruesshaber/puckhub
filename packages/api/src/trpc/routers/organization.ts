import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { orgAdminProcedure, orgProcedure, platformAdminProcedure, protectedProcedure, router } from '../init'

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
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organisation nicht gefunden' })
    }
    return org
  }),

  listAll: platformAdminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.organization.findMany({
      orderBy: { name: 'asc' },
    })

    const memberCounts = await ctx.db.member.groupBy({
      by: ['organizationId'],
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
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        logo: z.string().nullish(),
        ownerUserId: z.string(),
        leagueSettings: z.object({
          leagueName: z.string().min(1),
          leagueShortName: z.string().min(1),
          locale: z.string().default('de-DE'),
          timezone: z.string().default('Europe/Berlin'),
          pointsWin: z.number().int().default(2),
          pointsDraw: z.number().int().default(1),
          pointsLoss: z.number().int().default(0),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.organization.findFirst({
        where: { slug: input.slug },
      })
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Slug bereits vergeben' })
      }

      const orgId = crypto.randomUUID()

      return ctx.db.$transaction(async (tx: any) => {
        const org = await tx.organization.create({
          data: {
            id: orgId,
            name: input.name,
            slug: input.slug,
            logo: input.logo ?? null,
          },
        })

        await tx.member.create({
          data: {
            id: crypto.randomUUID(),
            userId: input.ownerUserId,
            organizationId: orgId,
            role: 'owner',
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
        const existing = await ctx.db.organization.findFirst({
          where: { slug: input.slug, id: ctx.organizationId },
        })
        if (!existing) {
          const conflict = await ctx.db.organization.findFirst({
            where: { slug: input.slug },
          })
          if (conflict) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Slug bereits vergeben' })
          }
        }
      }

      const org = await ctx.db.organization.update({
        where: { id: ctx.organizationId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.slug ? { slug: input.slug } : {}),
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
        role: z.enum(['admin', 'member']).default('member'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.invitation.findFirst({
        where: {
          email: input.email,
          organizationId: ctx.organizationId,
          status: 'pending',
        },
      })
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Einladung bereits gesendet' })
      }

      const inv = await ctx.db.invitation.create({
        data: {
          id: crypto.randomUUID(),
          email: input.email,
          organizationId: ctx.organizationId,
          role: input.role,
          inviterId: ctx.user.id,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return inv
    }),

  removeMember: orgAdminProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const memberRecord = await ctx.db.member.findFirst({
        where: { id: input.memberId, organizationId: ctx.organizationId },
      })
      if (!memberRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Mitglied nicht gefunden' })
      }
      if (memberRecord.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Du kannst dich nicht selbst entfernen' })
      }

      await ctx.db.member.delete({ where: { id: input.memberId } })
    }),

  delete: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findFirst({
        where: { id: input.id },
      })
      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organisation nicht gefunden' })
      }

      await ctx.db.organization.delete({ where: { id: input.id } })

      return { id: input.id }
    }),

  updateMemberRole: orgAdminProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(['owner', 'admin', 'member']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const memberRecord = await ctx.db.member.findFirst({
        where: { id: input.memberId, organizationId: ctx.organizationId },
      })
      if (!memberRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Mitglied nicht gefunden' })
      }

      const updated = await ctx.db.member.update({
        where: { id: input.memberId },
        data: { role: input.role },
      })

      return updated
    }),
})
