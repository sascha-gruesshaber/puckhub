import * as schema from "@puckhub/db/schema"
import { initTRPC, TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
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

const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw createAppError("UNAUTHORIZED", APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED, "Not authenticated")
  }

  const roles = await ctx.db
    .select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, ctx.user.id))

  const isAdminRole = roles.some((r) => r.role === "super_admin" || r.role === "league_admin")

  if (!isAdminRole) {
    throw createAppError("FORBIDDEN", APP_ERROR_CODES.AUTH_NOT_ADMIN, "Keine Administratorrechte")
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
    },
  })
})

export const adminProcedure = t.procedure.use(isAdmin)
