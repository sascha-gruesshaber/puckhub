import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq, isNull, ne, sql } from "drizzle-orm"
import { z } from "zod"
import { adminProcedure, publicProcedure, router } from "../init"

// ---------------------------------------------------------------------------
// Slug utility
// ---------------------------------------------------------------------------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

const FORBIDDEN_SLUGS = [
  "mannschaften",
  "spielergebnisse",
  "tabelle",
  "statistiken",
  "news",
  "spielplan",
  "login",
  "api",
  "admin",
  "saison",
  "saisons",
  "teams",
  "spieler",
  "spiele",
  "ergebnisse",
  "uploads",
  "auth",
  "setup",
  "settings",
  "profil",
  "suche",
]

const STATIC_SLUGS = ["impressum", "datenschutz", "kontakt"]

// ---------------------------------------------------------------------------
// Slug validation
// ---------------------------------------------------------------------------
async function validateSlug(db: any, slug: string, parentId: string | null, excludeId?: string) {
  if (!slug) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Der Titel ergibt keinen gültigen URL-Slug",
    })
  }

  if (FORBIDDEN_SLUGS.includes(slug) || STATIC_SLUGS.includes(slug)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Der Slug "${slug}" ist reserviert`,
    })
  }

  // Check uniqueness scoped by parent level
  const conditions = [
    eq(schema.pages.slug, slug),
    parentId ? eq(schema.pages.parentId, parentId) : isNull(schema.pages.parentId),
  ]
  if (excludeId) {
    conditions.push(ne(schema.pages.id, excludeId))
  }

  const existing = await db
    .select({ id: schema.pages.id })
    .from(schema.pages)
    .where(and(...conditions))
    .limit(1)

  if (existing.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Eine Seite mit dem Slug "${slug}" existiert bereits auf dieser Ebene`,
    })
  }

  // Check against aliases (top-level only)
  if (!parentId) {
    const aliasConflict = await db
      .select({ id: schema.pageAliases.id })
      .from(schema.pageAliases)
      .where(eq(schema.pageAliases.slug, slug))
      .limit(1)

    if (aliasConflict.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Eine Seite mit dem Slug "${slug}" existiert bereits (als Alias)`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const pageRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.pages.findMany({
      with: { children: true },
      orderBy: (pages, { asc }) => [asc(pages.sortOrder), asc(pages.title)],
    })
  }),

  getById: adminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const page = await ctx.db.query.pages.findFirst({
      where: eq(schema.pages.id, input.id),
      with: { children: true },
    })
    if (!page) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
    }
    return page
  }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ ctx, input }) => {
    const parts = input.slug.split("/")

    if (parts.length === 1) {
      // Check for alias first
      const alias = await ctx.db.query.pageAliases.findFirst({
        where: eq(schema.pageAliases.slug, parts[0]!),
        with: { targetPage: true },
      })

      if (alias) {
        // Build target slug (could be a sub-page)
        let targetSlug = alias.targetPage.slug
        if (alias.targetPage.parentId) {
          const parent = await ctx.db.query.pages.findFirst({
            where: eq(schema.pages.id, alias.targetPage.parentId),
          })
          if (parent) {
            targetSlug = `${parent.slug}/${alias.targetPage.slug}`
          }
        }
        return { redirect: true as const, targetSlug }
      }

      // Look up top-level published page
      const page = await ctx.db.query.pages.findFirst({
        where: and(
          eq(schema.pages.slug, parts[0]!),
          eq(schema.pages.status, "published"),
          isNull(schema.pages.parentId),
        ),
      })

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
      }
      return page
    }

    if (parts.length === 2) {
      // Nested: parent-slug/child-slug
      const parent = await ctx.db.query.pages.findFirst({
        where: and(
          eq(schema.pages.slug, parts[0]!),
          eq(schema.pages.status, "published"),
          isNull(schema.pages.parentId),
        ),
      })

      if (!parent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
      }

      const child = await ctx.db.query.pages.findFirst({
        where: and(
          eq(schema.pages.slug, parts[1]!),
          eq(schema.pages.status, "published"),
          eq(schema.pages.parentId, parent.id),
        ),
      })

      if (!child) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
      }
      return child
    }

    throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
  }),

  listByMenuLocation: publicProcedure
    .input(z.object({ location: z.enum(["main_nav", "footer"]) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.status, "published"),
            isNull(schema.pages.parentId),
            sql`${schema.pages.menuLocations} @> ARRAY[${sql.raw(`'${input.location}'`)}]::menu_location[]`,
          ),
        )
        .orderBy(schema.pages.sortOrder, schema.pages.title)
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().default(""),
        status: z.enum(["draft", "published"]).default("draft"),
        parentId: z.string().uuid().nullish(),
        menuLocations: z.array(z.enum(["main_nav", "footer"])).default([]),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.title)
      const parentId = input.parentId ?? null

      // Validate parent constraints
      if (parentId) {
        const parent = await ctx.db.query.pages.findFirst({
          where: eq(schema.pages.id, parentId),
        })
        if (!parent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Übergeordnete Seite nicht gefunden",
          })
        }
        if (parent.parentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unterseiten können nur eine Ebene tief verschachtelt werden",
          })
        }
      }

      await validateSlug(ctx.db, slug, parentId)

      const [page] = await ctx.db
        .insert(schema.pages)
        .values({
          title: input.title,
          slug,
          content: input.content,
          status: input.status,
          isStatic: false,
          parentId,
          menuLocations: parentId ? [] : input.menuLocations,
          sortOrder: input.sortOrder,
        })
        .returning()
      return page
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        parentId: z.string().uuid().nullish(),
        menuLocations: z.array(z.enum(["main_nav", "footer"])).optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.query.pages.findFirst({
        where: eq(schema.pages.id, id),
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
      }

      // Static pages: title locked
      if (existing.isStatic && data.title && data.title !== existing.title) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Der Titel einer statischen Seite kann nicht geändert werden",
        })
      }

      // Determine new slug if title changed on dynamic page
      let slug = existing.slug
      const parentId = data.parentId !== undefined ? (data.parentId ?? null) : existing.parentId

      if (data.title && data.title !== existing.title && !existing.isStatic) {
        slug = slugify(data.title)
        await validateSlug(ctx.db, slug, parentId, id)
      }

      // Validate parent constraints if parentId is changing
      if (data.parentId !== undefined && data.parentId !== existing.parentId) {
        if (data.parentId) {
          const parent = await ctx.db.query.pages.findFirst({
            where: eq(schema.pages.id, data.parentId),
          })
          if (!parent) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Übergeordnete Seite nicht gefunden",
            })
          }
          if (parent.parentId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Unterseiten können nur eine Ebene tief verschachtelt werden",
            })
          }
        }
      }

      // Sub-pages forced to empty menuLocations
      const menuLocations = parentId ? [] : (data.menuLocations ?? existing.menuLocations)

      const [page] = await ctx.db
        .update(schema.pages)
        .set({
          ...(data.title && !existing.isStatic ? { title: data.title } : {}),
          slug,
          ...(data.content !== undefined ? { content: data.content } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.parentId !== undefined ? { parentId } : {}),
          menuLocations,
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.pages.id, id))
        .returning()
      return page
    }),

  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.pages.findFirst({
      where: eq(schema.pages.id, input.id),
    })
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Seite nicht gefunden" })
    }
    if (existing.isStatic) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Statische Seiten können nicht gelöscht werden",
      })
    }
    await ctx.db.delete(schema.pages).where(eq(schema.pages.id, input.id))
  }),

  // --- Aliases ---

  listAliases: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.pageAliases.findMany({
      with: { targetPage: true },
      orderBy: (aliases, { asc }) => [asc(aliases.slug)],
    })
  }),

  createAlias: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        targetPageId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.title)

      if (!slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Der Titel ergibt keinen gültigen URL-Slug",
        })
      }

      if (FORBIDDEN_SLUGS.includes(slug) || STATIC_SLUGS.includes(slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Der Slug "${slug}" ist reserviert`,
        })
      }

      // Check against existing top-level pages
      const pageConflict = await ctx.db
        .select({ id: schema.pages.id })
        .from(schema.pages)
        .where(and(eq(schema.pages.slug, slug), isNull(schema.pages.parentId)))
        .limit(1)

      if (pageConflict.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Eine Seite mit dem Slug "${slug}" existiert bereits`,
        })
      }

      // Check against existing aliases
      const aliasConflict = await ctx.db
        .select({ id: schema.pageAliases.id })
        .from(schema.pageAliases)
        .where(eq(schema.pageAliases.slug, slug))
        .limit(1)

      if (aliasConflict.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Ein Alias mit dem Slug "${slug}" existiert bereits`,
        })
      }

      const [alias] = await ctx.db
        .insert(schema.pageAliases)
        .values({
          slug,
          targetPageId: input.targetPageId,
        })
        .returning()
      return alias
    }),

  deleteAlias: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.pageAliases).where(eq(schema.pageAliases.id, input.id))
  }),
})
