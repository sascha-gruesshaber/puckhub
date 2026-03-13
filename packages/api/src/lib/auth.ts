import { passkey } from "@better-auth/passkey"
import { db } from "@puckhub/db"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { admin } from "better-auth/plugins/admin"
import { organization } from "better-auth/plugins/organization"
import { twoFactor } from "better-auth/plugins/two-factor"

const DEMO_BLOCKED_PATHS = new Set([
  "/change-password",
  "/two-factor/enable",
  "/two-factor/disable",
])

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? "http://api.puckhub.localhost",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      isDemoUser: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://admin.puckhub.localhost,http://platform.puckhub.localhost")
    .split(",")
    .map((o) => o.trim()),
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.COOKIE_DOMAIN ?? "puckhub.localhost",
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!DEMO_BLOCKED_PATHS.has(ctx.path)) return
      const session = ctx.context?.session
      if (!session?.user?.id) return
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { isDemoUser: true },
      })
      if (user?.isDemoUser) {
        throw new APIError("FORBIDDEN", {
          message: "DEMO_USER_RESTRICTED",
        })
      }
    }),
  },
  plugins: [
    passkey({
      rpID: process.env.PASSKEY_RP_ID ?? "puckhub.localhost",
      rpName: process.env.PASSKEY_RP_NAME ?? "PuckHub Admin",
      origin: process.env.PASSKEY_ORIGIN ?? "http://admin.puckhub.localhost",
    }),
    twoFactor({
      issuer: "PuckHub",
    }),
    organization({
      allowUserToCreateOrganization: false,
    }),
    admin(),
  ],
})
