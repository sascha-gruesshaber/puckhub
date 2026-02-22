import { z } from "zod"
import { APP_ERROR_CODES } from "../../errors/codes"
import { createAppError } from "../../errors/appError"
import { orgProcedure, requireRole, router } from "../init"

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
async function validateSlug(
  db: any,
  slug: string,
  parentId: string | null,
  organizationId: string,
  excludeId?: string,
) {
  if (!slug) {
    throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_INVALID_SLUG)
  }

  if (FORBIDDEN_SLUGS.includes(slug) || STATIC_SLUGS.includes(slug)) {
    throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_SLUG_RESERVED)
  }

  // Check uniqueness scoped by parent level and organization
  const where: any = {
    organizationId,
    slug,
    parentId: parentId ?? null,
  }
  if (excludeId) {
    where.id = { not: excludeId }
  }

  const existing = await db.page.findFirst({
    where,
    select: { id: true },
  })

  if (existing) {
    throw createAppError("CONFLICT", APP_ERROR_CODES.PAGE_SLUG_CONFLICT)
  }

  // Check against aliases (top-level only)
  if (!parentId) {
    const aliasConflict = await db.pageAlias.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    })

    if (aliasConflict) {
      throw createAppError("CONFLICT", APP_ERROR_CODES.PAGE_ALIAS_CONFLICT)
    }
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const pageRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    requireRole(ctx, "editor")
    return ctx.db.page.findMany({
      where: { organizationId: ctx.organizationId },
      include: { children: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    })
  }),

  getById: orgProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    requireRole(ctx, "editor")
    const page = await ctx.db.page.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { children: true },
    })
    if (!page) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
    }
    return page
  }),

  getBySlug: orgProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ ctx, input }) => {
    const parts = input.slug.split("/")

    if (parts.length === 1) {
      // Check for alias first
      const alias = await ctx.db.pageAlias.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug: parts[0]!,
        },
        include: { targetPage: true },
      })

      if (alias) {
        // Build target slug (could be a sub-page)
        let targetSlug = alias.targetPage.slug
        if (alias.targetPage.parentId) {
          const parent = await ctx.db.page.findFirst({
            where: {
              id: alias.targetPage.parentId,
              organizationId: ctx.organizationId,
            },
          })
          if (parent) {
            targetSlug = `${parent.slug}/${alias.targetPage.slug}`
          }
        }
        return { redirect: true as const, targetSlug }
      }

      // Look up top-level published page
      const page = await ctx.db.page.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug: parts[0]!,
          status: "published",
          parentId: null,
        },
      })

      if (!page) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
      }
      return page
    }

    if (parts.length === 2) {
      // Nested: parent-slug/child-slug
      const parent = await ctx.db.page.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug: parts[0]!,
          status: "published",
          parentId: null,
        },
      })

      if (!parent) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
      }

      const child = await ctx.db.page.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug: parts[1]!,
          status: "published",
          parentId: parent.id,
        },
      })

      if (!child) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
      }
      return child
    }

    throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
  }),

  listByMenuLocation: orgProcedure
    .input(z.object({ location: z.enum(["main_nav", "footer"]) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.page.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: "published",
          parentId: null,
          menuLocations: { has: input.location },
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      })
    }),

  create: orgProcedure
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
      requireRole(ctx, "editor")
      const slug = slugify(input.title)
      const parentId = input.parentId ?? null

      // Validate parent constraints
      if (parentId) {
        const parent = await ctx.db.page.findFirst({
          where: { id: parentId, organizationId: ctx.organizationId },
        })
        if (!parent) {
          throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_PARENT_NOT_FOUND)
        }
        if (parent.parentId) {
          throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_NESTING_LIMIT)
        }
      }

      await validateSlug(ctx.db, slug, parentId, ctx.organizationId)

      const page = await ctx.db.page.create({
        data: {
          organizationId: ctx.organizationId,
          title: input.title,
          slug,
          content: input.content,
          status: input.status,
          isStatic: false,
          parentId,
          menuLocations: parentId ? [] : input.menuLocations,
          sortOrder: input.sortOrder,
        },
      })
      return page
    }),

  update: orgProcedure
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
      requireRole(ctx, "editor")
      const { id, ...data } = input

      const existing = await ctx.db.page.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      if (!existing) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
      }

      // Static pages: title locked
      if (existing.isStatic && data.title && data.title !== existing.title) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_STATIC_TITLE_LOCKED)
      }

      // Determine new slug if title changed on dynamic page
      let slug = existing.slug
      const parentId = data.parentId !== undefined ? (data.parentId ?? null) : existing.parentId

      if (data.title && data.title !== existing.title && !existing.isStatic) {
        slug = slugify(data.title)
        await validateSlug(ctx.db, slug, parentId, ctx.organizationId, id)
      }

      // Validate parent constraints if parentId is changing
      if (data.parentId !== undefined && data.parentId !== existing.parentId) {
        if (data.parentId) {
          const parent = await ctx.db.page.findFirst({
            where: {
              id: data.parentId,
              organizationId: ctx.organizationId,
            },
          })
          if (!parent) {
            throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_PARENT_NOT_FOUND)
          }
          if (parent.parentId) {
            throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_NESTING_LIMIT)
          }
        }
      }

      // Sub-pages forced to empty menuLocations
      const menuLocations = parentId ? [] : (data.menuLocations ?? existing.menuLocations)

      const updateData: Record<string, unknown> = {
        slug,
        menuLocations,
        updatedAt: new Date(),
      }
      if (data.title && !existing.isStatic) updateData.title = data.title
      if (data.content !== undefined) updateData.content = data.content
      if (data.status) updateData.status = data.status
      if (data.parentId !== undefined) updateData.parentId = parentId
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const page = await ctx.db.page.update({
        where: { id },
        data: updateData,
      })
      return page
    }),

  delete: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    requireRole(ctx, "editor")
    const existing = await ctx.db.page.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
    if (!existing) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.PAGE_NOT_FOUND)
    }
    if (existing.isStatic) {
      throw createAppError("FORBIDDEN", APP_ERROR_CODES.PAGE_STATIC_CANNOT_DELETE)
    }
    await ctx.db.page.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  // --- Aliases ---

  listAliases: orgProcedure.query(async ({ ctx }) => {
    requireRole(ctx, "editor")
    return ctx.db.pageAlias.findMany({
      where: { organizationId: ctx.organizationId },
      include: { targetPage: true },
      orderBy: { slug: "asc" },
    })
  }),

  createAlias: orgProcedure
    .input(
      z.object({
        title: z.string().min(1),
        targetPageId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx, "editor")
      const slug = slugify(input.title)

      if (!slug) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_INVALID_SLUG)
      }

      if (FORBIDDEN_SLUGS.includes(slug) || STATIC_SLUGS.includes(slug)) {
        throw createAppError("BAD_REQUEST", APP_ERROR_CODES.PAGE_SLUG_RESERVED)
      }

      // Check against existing top-level pages for this organization
      const pageConflict = await ctx.db.page.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug,
          parentId: null,
        },
        select: { id: true },
      })

      if (pageConflict) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.PAGE_SLUG_CONFLICT)
      }

      // Check against existing aliases for this organization
      const aliasConflict = await ctx.db.pageAlias.findFirst({
        where: { organizationId: ctx.organizationId, slug },
        select: { id: true },
      })

      if (aliasConflict) {
        throw createAppError("CONFLICT", APP_ERROR_CODES.PAGE_ALIAS_CONFLICT)
      }

      const alias = await ctx.db.pageAlias.create({
        data: {
          organizationId: ctx.organizationId,
          slug,
          targetPageId: input.targetPageId,
        },
      })
      return alias
    }),

  deleteAlias: orgProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    requireRole(ctx, "editor")
    await ctx.db.pageAlias.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
