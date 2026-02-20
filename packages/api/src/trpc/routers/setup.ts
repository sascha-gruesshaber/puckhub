import * as schema from "@puckhub/db/schema"
import { TRPCError } from "@trpc/server"
import { hashPassword } from "better-auth/crypto"
import { sql } from "drizzle-orm"
import { z } from "zod"
import { publicProcedure, router } from "../init"

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

export const setupRouter = router({
  status: publicProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db.select({ count: sql<number>`count(*)::int` }).from(schema.user)
    return { needsSetup: result?.count === 0 }
  }),

  initialize: publicProcedure
    .input(
      z.object({
        admin: z.object({
          name: z.string().min(1, "Name ist erforderlich"),
          email: z.string().email("Ungültige E-Mail-Adresse"),
          password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
        }),
        leagueSettings: z.object({
          leagueName: z.string().min(1, "Liga-Name ist erforderlich"),
          leagueShortName: z.string().min(1, "Kurzname ist erforderlich"),
          locale: z.string().min(1),
          timezone: z.string().min(1),
          pointsWin: z.number().int().min(0),
          pointsDraw: z.number().int().min(0),
          pointsLoss: z.number().int().min(0),
        }),
        season: z
          .object({
            name: z.string().min(1),
            seasonStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            seasonEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          })
          .refine(
            (v) =>
              new Date(`${v.seasonStart}T00:00:00.000Z`).getTime() <=
              new Date(`${v.seasonEnd}T23:59:59.999Z`).getTime(),
            {
              message: "seasonStart must be before or equal to seasonEnd",
              path: ["seasonEnd"],
            },
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Security guard: only allow when no users exist
      const [result] = await ctx.db.select({ count: sql<number>`count(*)::int` }).from(schema.user)

      if ((result?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Setup wurde bereits abgeschlossen",
        })
      }

      // Create admin user with platform admin role
      const userId = crypto.randomUUID()
      await ctx.db.insert(schema.user).values({
        id: userId,
        email: input.admin.email,
        name: input.admin.name,
        emailVerified: true,
        role: "admin",
      })

      // Create credential account
      const hashedPw = await hashPassword(input.admin.password)
      await ctx.db.insert(schema.account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        password: hashedPw,
        userId,
      })

      // Create first organization from league name
      const orgId = crypto.randomUUID()
      const slug = slugify(input.leagueSettings.leagueShortName) || "default"
      await ctx.db.insert(schema.organization).values({
        id: orgId,
        name: input.leagueSettings.leagueName,
        slug,
      })

      // Add admin as org owner
      await ctx.db.insert(schema.member).values({
        id: crypto.randomUUID(),
        userId,
        organizationId: orgId,
        role: "owner",
      })

      // Save league settings with org reference
      await ctx.db.insert(schema.systemSettings).values({
        organizationId: orgId,
        ...input.leagueSettings,
      })

      // Optionally create first season
      if (input.season) {
        await ctx.db.insert(schema.seasons).values({
          organizationId: orgId,
          name: input.season.name,
          seasonStart: new Date(`${input.season.seasonStart}T00:00:00.000Z`),
          seasonEnd: new Date(`${input.season.seasonEnd}T23:59:59.999Z`),
        })
      }

      return { success: true, organizationId: orgId }
    }),
})
