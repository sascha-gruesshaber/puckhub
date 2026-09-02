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
