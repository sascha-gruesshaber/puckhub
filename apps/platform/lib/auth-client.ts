import { adminClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://api.puckhub.localhost",
  plugins: [organizationClient(), adminClient()],
})

export const { signIn, signOut, useSession } = authClient
