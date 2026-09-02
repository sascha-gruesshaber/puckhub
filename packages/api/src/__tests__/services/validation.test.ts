import { describe, expect, it } from "vitest"
import { isSafeUrl, safeUrl, safeUrlNullish, safeUrlOptional } from "../../lib/validation"

describe("safeUrl", () => {
  it("accepts https and http URLs", () => {
    expect(safeUrl.safeParse("https://example.com/logo.png").success).toBe(true)
    expect(safeUrl.safeParse("http://example.com").success).toBe(true)
  })

  it("accepts upload paths", () => {
    expect(safeUrl.safeParse("/api/uploads/org/logos/x.png").success).toBe(true)
    expect(safeUrl.safeParse("/uploads/logo.png").success).toBe(true)
  })

  it("rejects javascript:, data: and vbscript: URLs", () => {
    expect(safeUrl.safeParse("javascript:alert(1)").success).toBe(false)
    expect(safeUrl.safeParse("JavaScript:alert(1)").success).toBe(false)
    expect(safeUrl.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false)
    expect(safeUrl.safeParse("vbscript:msgbox").success).toBe(false)
  })

  it("rejects protocol-relative, empty, traversal and malformed values", () => {
    expect(safeUrl.safeParse("//evil.example/x.png").success).toBe(false)
    expect(safeUrl.safeParse("").success).toBe(false)
    expect(safeUrl.safeParse("/uploads/../../etc/passwd").success).toBe(false)
    expect(safeUrl.safeParse('/uploads/x.png" onerror="alert(1)').success).toBe(false)
    expect(safeUrl.safeParse("example.com").success).toBe(false)
    expect(safeUrl.safeParse("/other/path.png").success).toBe(false)
  })

  it("rejects overly long URLs", () => {
    expect(isSafeUrl(`https://example.com/${"a".repeat(2048)}`)).toBe(false)
  })

  it("optional and nullish variants accept undefined / null", () => {
    expect(safeUrlOptional.safeParse(undefined).success).toBe(true)
    expect(safeUrlNullish.safeParse(null).success).toBe(true)
    expect(safeUrlNullish.safeParse("javascript:alert(1)").success).toBe(false)
  })
})
