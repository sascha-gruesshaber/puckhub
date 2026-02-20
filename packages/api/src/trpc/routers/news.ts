import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq, lte } from "drizzle-orm"
import { z } from "zod"
import type { Context } from "../context"
import { orgAdminProcedure, router } from "../init"

/**
 * Auto-publishes all draft news whose scheduledPublishAt has passed,
 * scoped to the given organization.
 * Returns the number of promoted articles.
 */
async function autoPublishScheduled(db: Context["db"], organizationId: string) {
  const now = new Date()
  const promoted = await db
    .update(schema.news)
    .set({
      status: "published",
      publishedAt: now,
      scheduledPublishAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.news.organizationId, organizationId),
        eq(schema.news.status, "draft"),
        lte(schema.news.scheduledPublishAt, now),
      ),
    )
    .returning({ id: schema.news.id })
  return promoted.length
}

export const newsRouter = router({
  list: orgAdminProcedure.query(async ({ ctx }) => {
    await autoPublishScheduled(ctx.db, ctx.organizationId)
    return ctx.db.query.news.findMany({
      with: { author: true },
      where: eq(schema.news.organizationId, ctx.organizationId),
      orderBy: (news, { desc }) => [desc(news.createdAt)],
    })
  }),

  getById: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    await autoPublishScheduled(ctx.db, ctx.organizationId)
    const article = await ctx.db.query.news.findFirst({
      where: and(eq(schema.news.id, input.id), eq(schema.news.organizationId, ctx.organizationId)),
      with: { author: true },
    })
    if (!article) {
      throw new TRPCError({ code: "NOT_FOUND", message: "News nicht gefunden" })
    }
    return article
  }),

  create: orgAdminProcedure
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
      const [article] = await ctx.db
        .insert(schema.news)
        .values({
          organizationId: ctx.organizationId,
          title: input.title,
          shortText: input.shortText || null,
          content: input.content,
          status: input.status,
          authorId: ctx.user.id,
          publishedAt: input.status === "published" ? new Date() : null,
          scheduledPublishAt: input.scheduledPublishAt ? new Date(input.scheduledPublishAt) : null,
        })
        .returning()
      return article
    }),

  update: orgAdminProcedure
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
      const { id, ...data } = input

      // Fetch existing to manage publishedAt
      const existing = await ctx.db.query.news.findFirst({
        where: and(eq(schema.news.id, id), eq(schema.news.organizationId, ctx.organizationId)),
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "News nicht gefunden" })
      }

      let publishedAt = existing.publishedAt
      if (data.status === "published" && !existing.publishedAt) {
        publishedAt = new Date()
      } else if (data.status === "draft") {
        publishedAt = null
      }

      const [article] = await ctx.db
        .update(schema.news)
        .set({
          ...data,
          scheduledPublishAt:
            data.scheduledPublishAt !== undefined
              ? data.scheduledPublishAt
                ? new Date(data.scheduledPublishAt)
                : null
              : undefined,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.news.id, id), eq(schema.news.organizationId, ctx.organizationId)))
        .returning()
      return article
    }),

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(schema.news)
      .where(and(eq(schema.news.id, input.id), eq(schema.news.organizationId, ctx.organizationId)))
  }),
})
