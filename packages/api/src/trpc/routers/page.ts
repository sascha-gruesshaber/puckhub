import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { orgAdminProcedure, orgProcedure, router } from '../init'

// ---------------------------------------------------------------------------
// Slug utility
// ---------------------------------------------------------------------------
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const FORBIDDEN_SLUGS = [
  'mannschaften',
  'spielergebnisse',
  'tabelle',
  'statistiken',
  'news',
  'spielplan',
  'login',
  'api',
  'admin',
  'saison',
  'saisons',
  'teams',
  'spieler',
  'spiele',
  'ergebnisse',
  'uploads',
  'auth',
  'setup',
  'settings',
  'profil',
  'suche',
]

const STATIC_SLUGS = ['impressum', 'datenschutz', 'kontakt']

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
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Der Titel ergibt keinen gültigen URL-Slug',
    })
  }

  if (FORBIDDEN_SLUGS.includes(slug) || STATIC_SLUGS.includes(slug)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Der Slug "${slug}" ist reserviert`,
    })
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
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Eine Seite mit dem Slug "${slug}" existiert bereits auf dieser Ebene`,
    })
  }

  // Check against aliases (top-level only)
  if (!parentId) {
    const aliasConflict = await db.pageAlias.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    })

    if (aliasConflict) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Eine Seite mit dem Slug "${slug}" existiert bereits (als Alias)`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const pageRouter = router({
  list: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.page.findMany({
      where: { organizationId: ctx.organizationId },
      include: { children: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    })
  }),

  getById: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const page = await ctx.db.page.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
      include: { children: true },
    })
    if (!page) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
    }
    return page
  }),

  getBySlug: orgProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ ctx, input }) => {
    const parts = input.slug.split('/')

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
          status: 'published',
          parentId: null,
        },
      })

      if (!page) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
      }
      return page
    }

    if (parts.length === 2) {
      // Nested: parent-slug/child-slug
      const parent = await ctx.db.page.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug: parts[0]!,
          status: 'published',
          parentId: null,
        },
      })

      if (!parent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
      }

      const child = await ctx.db.page.findFirst({
        where: {
          organizationId: ctx.organizationId,
          slug: parts[1]!,
          status: 'published',
          parentId: parent.id,
        },
      })

      if (!child) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
      }
      return child
    }

    throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
  }),

  listByMenuLocation: orgProcedure
    .input(z.object({ location: z.enum(['main_nav', 'footer']) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.page.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: 'published',
          parentId: null,
          menuLocations: { has: input.location },
        },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      })
    }),

  create: orgAdminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().default(''),
        status: z.enum(['draft', 'published']).default('draft'),
        parentId: z.string().uuid().nullish(),
        menuLocations: z.array(z.enum(['main_nav', 'footer'])).default([]),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.title)
      const parentId = input.parentId ?? null

      // Validate parent constraints
      if (parentId) {
        const parent = await ctx.db.page.findFirst({
          where: { id: parentId, organizationId: ctx.organizationId },
        })
        if (!parent) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Übergeordnete Seite nicht gefunden',
          })
        }
        if (parent.parentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Unterseiten können nur eine Ebene tief verschachtelt werden',
          })
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

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        status: z.enum(['draft', 'published']).optional(),
        parentId: z.string().uuid().nullish(),
        menuLocations: z.array(z.enum(['main_nav', 'footer'])).optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.db.page.findFirst({
        where: { id, organizationId: ctx.organizationId },
      })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
      }

      // Static pages: title locked
      if (existing.isStatic && data.title && data.title !== existing.title) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Der Titel einer statischen Seite kann nicht geändert werden',
        })
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
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Übergeordnete Seite nicht gefunden',
            })
          }
          if (parent.parentId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unterseiten können nur eine Ebene tief verschachtelt werden',
            })
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

  delete: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.page.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Seite nicht gefunden' })
    }
    if (existing.isStatic) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Statische Seiten können nicht gelöscht werden',
      })
    }
    await ctx.db.page.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),

  // --- Aliases ---

  listAliases: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.pageAlias.findMany({
      where: { organizationId: ctx.organizationId },
      include: { targetPage: true },
      orderBy: { slug: 'asc' },
    })
  }),

  createAlias: orgAdminProcedure
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
          code: 'BAD_REQUEST',
          message: 'Der Titel ergibt keinen gültigen URL-Slug',
        })
      }

      if (FORBIDDEN_SLUGS.includes(slug) || STATIC_SLUGS.includes(slug)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Der Slug "${slug}" ist reserviert`,
        })
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
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Eine Seite mit dem Slug "${slug}" existiert bereits`,
        })
      }

      // Check against existing aliases for this organization
      const aliasConflict = await ctx.db.pageAlias.findFirst({
        where: { organizationId: ctx.organizationId, slug },
        select: { id: true },
      })

      if (aliasConflict) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Ein Alias mit dem Slug "${slug}" existiert bereits`,
        })
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

  deleteAlias: orgAdminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.pageAlias.deleteMany({
      where: { id: input.id, organizationId: ctx.organizationId },
    })
  }),
})
