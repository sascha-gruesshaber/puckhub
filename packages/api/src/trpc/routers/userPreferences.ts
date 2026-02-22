import { z } from 'zod'
import { createAppError } from '../../errors/appError'
import { APP_ERROR_CODES } from '../../errors/codes'
import { protectedProcedure, router } from '../init'

const localeSchema = z.enum(['de-DE', 'en-US'])

export const userPreferencesRouter = router({
  getMyLocale: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { locale: true },
    })

    if (!row) {
      throw createAppError('NOT_FOUND', APP_ERROR_CODES.USER_NOT_FOUND, 'Benutzer nicht gefunden')
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
      try {
        await ctx.db.user.update({
          where: { id: ctx.user.id },
          data: { locale: input.locale, updatedAt: new Date() },
        })
      } catch {
        throw createAppError('NOT_FOUND', APP_ERROR_CODES.USER_NOT_FOUND, 'Benutzer nicht gefunden')
      }

      return { success: true }
    }),
})
