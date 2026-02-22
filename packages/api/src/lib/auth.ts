import { passkey } from "@better-auth/passkey"
import { db } from "@puckhub/db"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins/admin"
import { organization } from "better-auth/plugins/organization"
import { twoFactor } from "better-auth/plugins/two-factor"

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? "http://localhost:3001",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:3000,http://localhost:3002")
    .split(",")
    .map((o) => o.trim()),
  plugins: [
    passkey({
      rpID: process.env.PASSKEY_RP_ID ?? "localhost",
      rpName: process.env.PASSKEY_RP_NAME ?? "PuckHub Admin",
      origin: process.env.PASSKEY_ORIGIN ?? "http://localhost:3000",
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
