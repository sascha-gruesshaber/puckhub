import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("websiteConfig router", () => {
  describe("dnsConfig", () => {
    it("returns cnameTarget and subdomainSuffix", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.websiteConfig.dnsConfig()

      expect(result).toHaveProperty("cnameTarget")
      expect(result).toHaveProperty("subdomainSuffix")
      expect(typeof result.cnameTarget).toBe("string")
      expect(typeof result.subdomainSuffix).toBe("string")
    })

    it("is accessible by regular org members", async () => {
      const user = createTestCaller({ asUser: true })
      const result = await user.websiteConfig.dnsConfig()

      expect(result).toHaveProperty("cnameTarget")
      expect(result).toHaveProperty("subdomainSuffix")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.websiteConfig.dnsConfig()).rejects.toThrow("Not authenticated")
    })
  })

  describe("get", () => {
    it("returns null when no website config exists", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.websiteConfig.get()
      expect(result).toBeNull()
    })

    it("returns config with subdomain after creation", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({ isActive: true })

      const result = await admin.websiteConfig.get()
      expect(result).not.toBeNull()
      expect(result?.subdomain).toBe("test-league")
      expect(result?.organizationId).toBeDefined()
    })

    it("is accessible by regular org members", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.websiteConfig.update({ isActive: true })

      const user = createTestCaller({ asUser: true })
      const result = await user.websiteConfig.get()
      expect(result).not.toBeNull()
      expect(result?.subdomain).toBe("test-league")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.websiteConfig.get()).rejects.toThrow("Not authenticated")
    })
  })

  describe("update", () => {
    it("creates config when none exists (upsert insert)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.websiteConfig.update({
        isActive: true,
        colorPrimary: "#ff0000",
        seoTitle: "My League",
      })

      expect(result).toEqual({ success: true })

      const config = await admin.websiteConfig.get()
      expect(config).not.toBeNull()
      expect(config?.isActive).toBe(true)
      expect(config?.colorPrimary).toBe("#ff0000")
      expect(config?.seoTitle).toBe("My League")
    })

    it("updates existing config (upsert update)", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        isActive: true,
        colorPrimary: "#ff0000",
        seoTitle: "Original Title",
      })

      await admin.websiteConfig.update({
        colorPrimary: "#00ff00",
        seoTitle: "Updated Title",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.colorPrimary).toBe("#00ff00")
      expect(config?.seoTitle).toBe("Updated Title")
    })

    it("cleans domain by stripping protocol", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        domain: "https://example.com",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.domain).toBe("example.com")
    })

    it("cleans domain by stripping port", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        domain: "example.com:8080",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.domain).toBe("example.com")
    })

    it("cleans domain by stripping path", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        domain: "example.com/some/path",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.domain).toBe("example.com")
    })

    it("cleans domain by stripping trailing dot", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        domain: "example.com.",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.domain).toBe("example.com")
    })

    it("cleans domain with all transformations combined", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        domain: "https://My-League.Example.COM:443/path?q=1",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.domain).toBe("my-league.example.com")
    })

    it("sets domain to null when empty string is provided", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({ domain: "example.com" })
      const before = await admin.websiteConfig.get()
      expect(before?.domain).toBe("example.com")

      await admin.websiteConfig.update({ domain: "" })
      const after = await admin.websiteConfig.get()
      expect(after?.domain).toBeNull()
    })

    it("sets domain to null when whitespace-only string is provided", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({ domain: "example.com" })

      await admin.websiteConfig.update({ domain: "   " })
      const config = await admin.websiteConfig.get()
      expect(config?.domain).toBeNull()
    })

    it("handles all optional color fields", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        colorPrimary: "#111111",
        colorSecondary: "#222222",
        colorAccent: "#333333",
        colorBackground: "#444444",
        colorText: "#555555",
        colorHeaderBg: "#666666",
        colorHeaderText: "#777777",
        colorFooterBg: "#888888",
        colorFooterText: "#999999",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.colorPrimary).toBe("#111111")
      expect(config?.colorSecondary).toBe("#222222")
      expect(config?.colorAccent).toBe("#333333")
      expect(config?.colorBackground).toBe("#444444")
      expect(config?.colorText).toBe("#555555")
      expect(config?.colorHeaderBg).toBe("#666666")
      expect(config?.colorHeaderText).toBe("#777777")
      expect(config?.colorFooterBg).toBe("#888888")
      expect(config?.colorFooterText).toBe("#999999")
    })

    it("handles logo, favicon, ogImage, and SEO fields", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        logoUrl: "https://example.com/logo.png",
        faviconUrl: "https://example.com/favicon.ico",
        ogImageUrl: "https://example.com/og.jpg",
        seoTitle: "League SEO Title",
        seoDescription: "A great league for great teams.",
      })

      const config = await admin.websiteConfig.get()
      expect(config?.logoUrl).toBe("https://example.com/logo.png")
      expect(config?.faviconUrl).toBe("https://example.com/favicon.ico")
      expect(config?.ogImageUrl).toBe("https://example.com/og.jpg")
      expect(config?.seoTitle).toBe("League SEO Title")
      expect(config?.seoDescription).toBe("A great league for great teams.")
    })

    it("clears nullable fields when set to null", async () => {
      const admin = createTestCaller({ asAdmin: true })

      await admin.websiteConfig.update({
        colorPrimary: "#ff0000",
        logoUrl: "https://example.com/logo.png",
        seoTitle: "Some Title",
      })

      await admin.websiteConfig.update({
        colorPrimary: null,
        logoUrl: null,
        seoTitle: null,
      })

      const config = await admin.websiteConfig.get()
      expect(config?.colorPrimary).toBeNull()
      expect(config?.logoUrl).toBeNull()
      expect(config?.seoTitle).toBeNull()
    })

    it("rejects regular members (non-admin)", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(
        user.websiteConfig.update({ isActive: true }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.websiteConfig.update({ isActive: true }),
      ).rejects.toThrow("Not authenticated")
    })
  })

  describe("verifyDns", () => {
    it("returns error for whitespace-only domain (becomes empty after cleaning)", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.websiteConfig.verifyDns({ domain: "   " })

      expect(result.status).toBe("error")
      expect(result.message).toBe("Invalid domain")
      expect(result.recordType).toBeNull()
      expect(result.recordValue).toBeNull()
    })

    it("rejects empty domain via input validation", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.websiteConfig.verifyDns({ domain: "" }),
      ).rejects.toThrow()
    })

    it("rejects regular members (non-admin)", async () => {
      const user = createTestCaller({ asUser: true })
      await expect(
        user.websiteConfig.verifyDns({ domain: "example.com" }),
      ).rejects.toThrow("Keine Administratorrechte")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(
        caller.websiteConfig.verifyDns({ domain: "example.com" }),
      ).rejects.toThrow("Not authenticated")
    })
  })
})
