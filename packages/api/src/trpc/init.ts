import * as schema from "@puckhub/db/schema"
import { initTRPC, TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import superjson from "superjson"
import { createAppError, inferAppErrorCode } from "../errors/appError"
import { APP_ERROR_CODES } from "../errors/codes"
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

// --- isOrgMember: requires active org + membership ---
const isOrgMember = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }

  const organizationId = ctx.activeOrganizationId
  if (!organizationId) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_SELECTED, "Keine Organisation ausgewählt")
  }

  // Platform admins bypass membership check
  const isPlatformAdmin = (ctx.user as any).role === "admin"
  if (!isPlatformAdmin) {
    const membership = await ctx.db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(and(eq(schema.member.userId, ctx.user.id), eq(schema.member.organizationId, organizationId)))
      .limit(1)

    if (membership.length === 0) {
      throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_MEMBER, "Kein Mitglied dieser Organisation")
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        session: ctx.session!,
        organizationId,
        orgRole: membership[0]!.role,
      },
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
      organizationId,
      orgRole: "owner" as const,
    },
  })
})

export const orgProcedure = t.procedure.use(isOrgMember)

// --- isOrgAdmin: requires active org + owner/admin role ---
const isOrgAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }

  const organizationId = ctx.activeOrganizationId
  if (!organizationId) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_SELECTED, "Keine Organisation ausgewählt")
  }

  // Platform admins bypass org role check
  const isPlatformAdmin = (ctx.user as any).role === "admin"
  if (!isPlatformAdmin) {
    const membership = await ctx.db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(and(eq(schema.member.userId, ctx.user.id), eq(schema.member.organizationId, organizationId)))
      .limit(1)

    if (membership.length === 0) {
      throw createAppError("FORBIDDEN", APP_ERROR_CODES.ORG_NOT_MEMBER, "Kein Mitglied dieser Organisation")
    }

    const role = membership[0]!.role
    if (role !== "owner" && role !== "admin") {
      throw createAppError("FORBIDDEN", APP_ERROR_CODES.AUTH_NOT_ADMIN, "Keine Administratorrechte")
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        session: ctx.session!,
        organizationId,
        orgRole: role,
      },
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
      organizationId,
      orgRole: "owner" as const,
    },
  })
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
