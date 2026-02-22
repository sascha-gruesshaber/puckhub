import { z } from "zod"
import type { Context } from "../context"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgProcedure, requireRole, router } from "../init"

/**
 * Auto-publishes all draft news whose scheduledPublishAt has passed,
 * scoped to the given organization.
 * Returns the number of promoted articles.
 */
async function autoPublishScheduled(db: Context["db"], organizationId: string) {
  const now = new Date()
  const promoted = await db.news.updateMany({
    where: {
      organizationId,
      status: "draft",
      scheduledPublishAt: { lte: now },
    },
    data: {
      status: "published",
      publishedAt: now,
      scheduledPublishAt: null,
      updatedAt: now,
    },
  })
  return promoted.count
}

export const newsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    requireRole(ctx, "editor")
    await autoPublishScheduled(ctx.db, ctx.organizationId)
    return ctx.db.news.findMany({
      where: { organizationId: ctx.organizationId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    requireRole(ctx, "editor")
    await autoPublishScheduled(ctx.db, ctx.organizationId)
    const article = await ctx.db.news.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { author: true },
    })
    if (!article) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.NEWS_NOT_FOUND)
    }
    return article
  }),

  create: orgProcedure
    .input(
      z.object({
        title: z.string().min(1),
        shortText: z.string().optional(),
        content: z.string().min(1),
        status: z.enum(["draft", "published"]).default("draft"),
        scheduledPublishAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx, "editor")
      const article = await ctx.db.news.create({
        data: {
          organizationId: ctx.organizationId,
          title: input.title,
          shortText: input.shortText || null,
          content: input.content,
          status: input.status,
          authorId: ctx.user.id,
          publishedAt: input.status === "published" ? new Date() : null,
          scheduledPublishAt: input.scheduledPublishAt ? new Date(input.scheduledPublishAt) : null,
        },
      })
      return article
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        shortText: z.string().nullish(),
        content: z.string().min(1).optional(),
        status: z.enum(["draft", "published"]).optional(),
        scheduledPublishAt: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx, "editor")
      const { id, ...data } = input

      // Fetch existing to manage publishedAt
      const existing = await ctx.db.news.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.NEWS_NOT_FOUND)
      }

      let publishedAt = existing.publishedAt
      if (data.status === "published" && !existing.publishedAt) {
        publishedAt = new Date()
      } else if (data.status === "draft") {
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

  delete: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    requireRole(ctx, "editor")
    await ctx.db.news.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
