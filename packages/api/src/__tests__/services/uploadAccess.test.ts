import { describe, expect, it } from "vitest"
import { canUserUploadToOrganization, isAllowedUploadMimeType } from "../../routes/upload"
import { createPlatformAdminCaller, getTestDb, OTHER_ORG_ID, seedSecondOrg, TEST_ORG_ID } from "../testUtils"

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
