import { describe, expect, it } from "vitest"
import { canUserUploadToOrganization, isAllowedUploadMimeType, sniffImageMimeType } from "../../routes/upload"
import { createPlatformAdminCaller, getTestDb, OTHER_ORG_ID, seedSecondOrg, TEST_ORG_ID } from "../testUtils"

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x1a, 0x00, 0x00, 0x00]), Buffer.from("WEBPVP8 ")])

describe("upload access", () => {
  describe("isAllowedUploadMimeType", () => {
    it("accepts supported bitmap/image formats", () => {
      expect(isAllowedUploadMimeType("image/jpeg")).toBe(true)
      expect(isAllowedUploadMimeType("image/png")).toBe(true)
      expect(isAllowedUploadMimeType("image/webp")).toBe(true)
    })

    it("rejects svg uploads", () => {
      expect(isAllowedUploadMimeType("image/svg+xml")).toBe(false)
    })
  })

  describe("sniffImageMimeType", () => {
    it("identifies the accepted formats from their leading bytes", () => {
      expect(sniffImageMimeType(JPEG)).toBe("image/jpeg")
      expect(sniffImageMimeType(PNG)).toBe("image/png")
      expect(sniffImageMimeType(WEBP)).toBe("image/webp")
    })

    it("rejects content that only claims to be an image", () => {
      expect(sniffImageMimeType(Buffer.from("<script>alert(1)</script>"))).toBeNull()
      expect(sniffImageMimeType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" />'))).toBeNull()
      expect(sniffImageMimeType(Buffer.from("%PDF-1.7"))).toBeNull()
    })

    it("rejects a RIFF container that is not WebP", () => {
      const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x1a, 0, 0, 0]), Buffer.from("WAVEfmt ")])
      expect(sniffImageMimeType(wav)).toBeNull()
    })

    it("does not read past the end of a truncated file", () => {
      expect(sniffImageMimeType(Buffer.from([]))).toBeNull()
      expect(sniffImageMimeType(Buffer.from([0xff, 0xd8]))).toBeNull()
      expect(sniffImageMimeType(PNG.subarray(0, 4))).toBeNull()
      expect(sniffImageMimeType(Buffer.from("RIFF"))).toBeNull()
    })
  })

  describe("canUserUploadToOrganization", () => {
    it("allows org owners", async () => {
      const result = await canUserUploadToOrganization("test-admin-id", TEST_ORG_ID)
      expect(result).toEqual({ allowed: true })
    })

    it("rejects members without upload-capable roles", async () => {
      const result = await canUserUploadToOrganization("test-user-id", TEST_ORG_ID)

      expect(result.allowed).toBe(false)
      if (result.allowed) {
        throw new Error("expected upload access to be denied")
      }
      expect(result.status).toBe(403)
      expect(result.error).toBe("Insufficient permissions")
    })

    it("rejects stale org access after membership removal", async () => {
      const db = getTestDb()
      await db.member.delete({
        where: { id: "test-admin-member-id" },
      })

      const result = await canUserUploadToOrganization("test-admin-id", TEST_ORG_ID)

      expect(result.allowed).toBe(false)
      if (result.allowed) {
        throw new Error("expected upload access to be denied")
      }
      expect(result.status).toBe(403)
      expect(result.error).toBe("No organization access")
    })

    it("allows platform admins for any organization", async () => {
      await seedSecondOrg()
      const platformAdmin = createPlatformAdminCaller(OTHER_ORG_ID)
      await platformAdmin.organization.setActiveForAdmin({ organizationId: OTHER_ORG_ID })

      const result = await canUserUploadToOrganization("test-platform-admin-id", OTHER_ORG_ID)
      expect(result).toEqual({ allowed: true })
    })
  })
})
