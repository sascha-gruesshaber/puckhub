import { passkey } from "@better-auth/passkey"
import { db } from "@puckhub/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins/two-factor"

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? "http://localhost:3001",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:3000").split(",").map((o) => o.trim()),
  plugins: [
    passkey({
      rpID: process.env.PASSKEY_RP_ID ?? "localhost",
      rpName: process.env.PASSKEY_RP_NAME ?? "PuckHub Admin",
      origin: process.env.PASSKEY_ORIGIN ?? "http://localhost:3000",
    }),
    twoFactor({
      issuer: "PuckHub",
    }),
  ],
})
