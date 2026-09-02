import { createTtlCache } from "./ttlCache"

/**
 * Cache for the unauthenticated league-site procedures. Everything stored here
 * is a pure function of (organization, season) and changes only through admin
 * mutations, which call `invalidatePublicCache(orgId)`.
 *
 * Disabled under Vitest: tests share one process across many per-test
 * databases that reuse the same organization ids.
 */
export const publicCache = createTtlCache({ enabled: !process.env.VITEST })

export const PUBLIC_CACHE_TTL_MS = Number(process.env.PUBLIC_CACHE_TTL_MS) || 60_000

export function publicCacheKey(orgId: string, ...parts: Array<string | number | null | undefined>): string {
  return `org:${orgId}:${parts.map((p) => (p == null ? "" : String(p))).join(":")}`
}

/** Drops every cached public-site entry for the organization. */
export function invalidatePublicCache(orgId: string): void {
  publicCache.invalidate({ scope: orgId })
}
