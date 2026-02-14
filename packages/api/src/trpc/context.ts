import { db } from "@puckhub/db"
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import { auth } from "../lib/auth"

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  })

  return {
    db,
    session,
    user: session?.user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
