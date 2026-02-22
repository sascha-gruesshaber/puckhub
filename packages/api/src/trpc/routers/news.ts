import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { Context } from '../context'
import { orgAdminProcedure, router } from '../init'

/**
 * Auto-publishes all draft news whose scheduledPublishAt has passed,
 * scoped to the given organization.
 * Returns the number of promoted articles.
 */
async function autoPublishScheduled(db: Context['db'], organizationId: string) {
  const now = new Date()
  const promoted = await db.news.updateMany({
    where: {
      organizationId,
      status: 'draft',
      scheduledPublishAt: { lte: now },
    },
    data: {
      status: 'published',
      publishedAt: now,
      scheduledPublishAt: null,
      updatedAt: now,
    },
  })
  return promoted.count
}

export const newsRouter = router({
  list: orgAdminProcedure.query(async ({ ctx }) => {
    await autoPublishScheduled(ctx.db, ctx.organizationId)
    return ctx.db.news.findMany({
      where: { organizationId: ctx.organizationId },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    })
  }),

  getById: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    await autoPublishScheduled(ctx.db, ctx.organizationId)
    const article = await ctx.db.news.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { author: true },
    })
    if (!article) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'News nicht gefunden' })
    }
    return article
  }),

  create: orgAdminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        shortText: z.string().optional(),
        content: z.string().min(1),
        status: z.enum(['draft', 'published']).default('draft'),
        scheduledPublishAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const article = await ctx.db.news.create({
        data: {
          organizationId: ctx.organizationId,
          title: input.title,
          shortText: input.shortText || null,
          content: input.content,
          status: input.status,
          authorId: ctx.user.id,
          publishedAt: input.status === 'published' ? new Date() : null,
          scheduledPublishAt: input.scheduledPublishAt ? new Date(input.scheduledPublishAt) : null,
        },
      })
      return article
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        shortText: z.string().nullish(),
        content: z.string().min(1).optional(),
        status: z.enum(['draft', 'published']).optional(),
        scheduledPublishAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Fetch existing to manage publishedAt
      const existing = await ctx.db.news.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'News nicht gefunden' })
      }

      let publishedAt = existing.publishedAt
      if (data.status === 'published' && !existing.publishedAt) {
        publishedAt = new Date()
      } else if (data.status === 'draft') {
        publishedAt = null
      }

      const article = await ctx.db.news.update({
        where: { id },
        data: {
          ...data,
          scheduledPublishAt:
            data.scheduledPublishAt !== undefined
              ? data.scheduledPublishAt
                ? new Date(data.scheduledPublishAt)
                : null
              : undefined,
          publishedAt,
          updatedAt: new Date(),
        },
      })
      return article
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.news.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
