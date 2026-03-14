import { passkeyClient } from "@better-auth/passkey/client"
import { adminClient, magicLinkClient, organizationClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { getApiUrl } from "./env"

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  plugins: [
    magicLinkClient(),
    passkeyClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/login?mode=2fa"
      },
    }),
    organizationClient(),
    adminClient(),
  ],
})

export const { signIn, signOut, useSession } = authClient
