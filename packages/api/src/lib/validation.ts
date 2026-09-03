import { z } from "zod"

/**
 * Shared Zod helpers for user-supplied values that end up in `href` / `src` attributes.
 */

const MAX_URL_LENGTH = 2048
const UPLOAD_PREFIXES = ["/api/uploads/", "/uploads/"]

/**
 * Accepts absolute http(s) URLs and site-relative upload paths. Rejects everything
 * else — notably `javascript:`, `data:`, `vbscript:` and protocol-relative URLs.
 */
export function isSafeUrl(value: string): boolean {
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return false

  if (UPLOAD_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    // Relative upload path: no whitespace, quotes, angle brackets, backslashes or traversal.
    return !/[\s<>"'\\]/.test(value) && !value.includes("..")
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === "http:" || url.protocol === "https:"
}

export const safeUrl = z
  .string()
  .max(MAX_URL_LENGTH)
  .refine(isSafeUrl, { error: "Invalid URL: only http(s) URLs or upload paths are allowed" })

export const safeUrlOptional = safeUrl.optional()
export const safeUrlNullable = safeUrl.nullable()
export const safeUrlNullish = safeUrl.nullish()

/**
 * Length bounds for user-supplied strings.
 *
 * Zod stops at the first failing check, so an oversized value is rejected before it
 * reaches Prisma. Without a bound, a single request can carry an arbitrary number of
 * megabytes into a query parameter or a text column.
 */

/** Identifiers: uuids, Better Auth ids, slugs, cron job names. */
export const MAX_ID_LENGTH = 128
/** A fully qualified domain name is 253 characters at most. */
export const MAX_DOMAIN_LENGTH = 253
/** Short single-line values: names, cities, colours, locales, venues. */
export const MAX_NAME_LENGTH = 200
/** Free-text values: notes, reasons, teasers, meta descriptions. */
export const MAX_TEXT_LENGTH = 5_000
/** Editor-produced HTML for pages, news articles and recaps. */
export const MAX_RICH_TEXT_LENGTH = 200_000
