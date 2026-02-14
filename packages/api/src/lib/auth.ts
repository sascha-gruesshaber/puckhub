import { db } from "@puckhub/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const authOptions = {
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
}

export const auth = betterAuth(authOptions)
