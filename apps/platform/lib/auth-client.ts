import { adminClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { getApiUrl } from "./env"

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  plugins: [organizationClient(), adminClient()],
})

export const { signIn, signOut, useSession } = authClient
