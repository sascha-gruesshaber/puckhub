import { db } from "@puckhub/db"
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import { auth } from "../lib/auth"

/**
 * Client IP as seen behind the reverse proxy. Caddy sets `X-Forwarded-For`;
 * the first entry is the originating client. Null when nothing is present.
 */
function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  if (first) return first
  return headers.get("x-real-ip")?.trim() || null
}

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  })

  return {
    db,
    session,
    user: session?.user ?? null,
    activeOrganizationId: (session?.session as any)?.activeOrganizationId ?? null,
    ip: clientIp(opts.req.headers),
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
