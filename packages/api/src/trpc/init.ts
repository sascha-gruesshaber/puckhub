import type { OrgRole } from "@puckhub/db"
import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { createAppError, inferAppErrorCode } from "../errors/appError"
import { APP_ERROR_CODES } from "../errors/codes"
import { invalidatePublicCache, PUBLIC_CACHE_TTL_MS, publicCache } from "../lib/publicCache"
import type { Context } from "./context"

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        appErrorCode: error instanceof TRPCError ? inferAppErrorCode(error) : APP_ERROR_CODES.UNKNOWN,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// --- cachedPublicProcedure: memoises successful public reads per (path, input) ---
// Entries are scoped by organization so any org mutation (see the org middlewares
// below) or the public report flow can drop them. Only pure reads of
// (organization, season) data should use this.
const withPublicCache = middleware(async ({ path, type, input, next }) => {
  if (type !== "query") return next()
  const key = `${path}:${JSON.stringify(input ?? null)}`
  const hit = publicCache.get<Awaited<ReturnType<typeof next>>>(key)
  if (hit) return hit
  const result = await next()
  if (result.ok) {
    const data = result.data as { organization?: { id?: string } } | null
    const scope = (input as { organizationId?: string } | undefined)?.organizationId ?? data?.organization?.id ?? null
    publicCache.set(key, result, PUBLIC_CACHE_TTL_MS, scope)
  }
  return result
})

export const cachedPublicProcedure = t.procedure.use(withPublicCache)

/** Drops the organization's public-site cache after a successful mutation. */
async function invalidateAfterMutation<T extends { ok: boolean }>(
  type: string,
  organizationId: string,
  run: () => Promise<T>,
): Promise<T> {
  const result = await run()
  if (type === "mutation" && result.ok) invalidatePublicCache(organizationId)
  return result
}

// --- Types ---
export interface MemberRoleEntry {
  id: string
  role: OrgRole
  teamId: string | null
}

export interface OrgContext {
  memberRoles: MemberRoleEntry[]
  hasRole: (role: OrgRole, teamId?: string) => boolean
}

// --- requireRole helper ---
export function requireRole(ctx: OrgContext, role: OrgRole, teamId?: string) {
  if (!ctx.hasRole(role, teamId)) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.INSUFFICIENT_ROLE, "Unzureichende Berechtigungen")
  }
}

// --- isAuthed: requires authenticated session ---
const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)

// --- withOrgRoles: requires active org + loads member roles ---
const withOrgRoles = middleware(async ({ ctx, type, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }
  // Captured so the narrowing survives the invalidation closure below
  const user = ctx.user

  const organizationId = ctx.activeOrganizationId
  if (!organizationId) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_SELECTED, "Keine Organisation ausgewählt")
  }

  // Platform admins bypass membership check
  const isPlatformAdmin = (user as any).role === "admin"
  if (isPlatformAdmin) {
    return invalidateAfterMutation(type, organizationId, () =>
      next({
        ctx: {
          ...ctx,
          user,
          session: ctx.session!,
          organizationId,
          orgRole: "owner" as const,
          memberRoles: [] as MemberRoleEntry[],
          hasRole: (_role?: OrgRole, _teamId?: string) => true,
        },
      }),
    )
  }

  const membership = await ctx.db.member.findFirst({
    where: { userId: user.id, organizationId },
    select: {
      id: true,
      role: true,
      memberRoles: {
        select: { id: true, role: true, teamId: true },
      },
    },
  })

  if (!membership) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_MEMBER, "Kein Mitglied dieser Organisation")
  }

  const memberRoles: MemberRoleEntry[] = membership.memberRoles

  function hasRole(role: OrgRole, teamId?: string): boolean {
    // owner/admin roles grant everything
    if (memberRoles.some((r) => r.role === "owner" || r.role === "admin")) {
      return true
    }
    // Check for the specific role
    return memberRoles.some((r) => {
      if (r.role !== role) return false
      // org-wide role (teamId is null) matches everything
      if (r.teamId === null) return true
      // If a specific teamId was requested, match it
      if (teamId && r.teamId === teamId) return true
      // If no teamId requested, any instance of the role is sufficient
      if (!teamId) return true
      return false
    })
  }

  return invalidateAfterMutation(type, organizationId, () =>
    next({
      ctx: {
        ...ctx,
        user,
        session: ctx.session!,
        organizationId,
        orgRole: membership.role,
        memberRoles,
        hasRole,
      },
    }),
  )
})

export const orgProcedure = t.procedure.use(withOrgRoles)

// --- isOrgAdmin: requires owner or admin role ---
const isOrgAdmin = middleware(async ({ ctx, type, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }
  // Captured so the narrowing survives the invalidation closure below
  const user = ctx.user

  const organizationId = ctx.activeOrganizationId
  if (!organizationId) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_SELECTED, "Keine Organisation ausgewählt")
  }

  // Platform admins bypass org role check
  const isPlatformAdmin = (user as any).role === "admin"
  if (isPlatformAdmin) {
    return invalidateAfterMutation(type, organizationId, () =>
      next({
        ctx: {
          ...ctx,
          user,
          session: ctx.session!,
          organizationId,
          orgRole: "owner" as const,
          memberRoles: [] as MemberRoleEntry[],
          hasRole: (_role?: OrgRole, _teamId?: string) => true,
        },
      }),
    )
  }

  const membership = await ctx.db.member.findFirst({
    where: { userId: user.id, organizationId },
    select: {
      id: true,
      role: true,
      memberRoles: {
        select: { id: true, role: true, teamId: true },
      },
    },
  })

  if (!membership) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_MEMBER, "Kein Mitglied dieser Organisation")
  }

  const memberRoles: MemberRoleEntry[] = membership.memberRoles
  const hasAdminRole = memberRoles.some((r) => r.role === "owner" || r.role === "admin")

  if (!hasAdminRole) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.AUTH_NOT_ADMIN, "Keine Administratorrechte")
  }

  return invalidateAfterMutation(type, organizationId, () =>
    next({
      ctx: {
        ...ctx,
        user,
        session: ctx.session!,
        organizationId,
        orgRole: membership.role,
        memberRoles,
        hasRole: (_role?: OrgRole, _teamId?: string) => true,
      },
    }),
  )
})

export const orgAdminProcedure = t.procedure.use(isOrgAdmin)

// --- isPlatformAdmin: requires user.role === 'admin' ---
const isPlatformAdmin = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }

  if ((ctx.user as any).role !== "admin") {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.AUTH_NOT_PLATFORM_ADMIN, "Keine Plattform-Administratorrechte")
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
    },
  })
})

export const platformAdminProcedure = t.procedure.use(isPlatformAdmin)

// Keep adminProcedure as alias for orgAdminProcedure during migration
export const adminProcedure = orgAdminProcedure
