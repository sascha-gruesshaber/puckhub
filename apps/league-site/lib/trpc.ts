import type { AppRouter } from "@puckhub/api/client"
import { httpBatchLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import superjson from "superjson"

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>()

export function createTRPCClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${import.meta.env.VITE_API_URL ?? "http://api.puckhub.localhost"}/api/trpc`,
        transformer: superjson,
      }),
    ],
  })
}
