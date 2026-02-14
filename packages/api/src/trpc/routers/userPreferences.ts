import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { protectedProcedure, router } from "../init"

const localeSchema = z.enum(["de-DE", "en-US"])

export const userPreferencesRouter = router({
  getMyLocale: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ locale: schema.user.locale })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.user.id))

    if (!row) {
      throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND, "Benutzer nicht gefunden")
    }

    return { locale: row.locale }
  }),

  setMyLocale: protectedProcedure
    .input(
      z.object({
        locale: localeSchema.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.user)
        .set({ locale: input.locale, updatedAt: new Date() })
        .where(eq(schema.user.id, ctx.user.id))
        .returning({ id: schema.user.id })

      if (!updated) {
        throw createAppError("NOT_FOUND", APP_ERROR_CODES.USER_NOT_FOUND, "Benutzer nicht gefunden")
      }

      return { success: true }
    }),
})
