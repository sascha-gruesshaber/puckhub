import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("sponsor router", () => {
  describe("list", () => {
    it("returns empty list when no sponsors exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.sponsor.list()
      expect(result).toEqual([])
    })

    it("returns sponsors ordered by sortOrder then name", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.sponsor.create({ name: "Zebra GmbH", sortOrder: 2 })
      await admin.sponsor.create({ name: "Alpha AG", sortOrder: 1 })
      await admin.sponsor.create({ name: "Beta Corp", sortOrder: 1 })

      const result = await admin.sponsor.list()
      expect(result).toHaveLength(3)
      expect(result[0]?.name).toBe("Alpha AG")
      expect(result[1]?.name).toBe("Beta Corp")
      expect(result[2]?.name).toBe("Zebra GmbH")
    })
  })

  describe("create", () => {
    it("creates a sponsor with all fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({
        name: "Ice Sponsor",
        websiteUrl: "https://ice-sponsor.test",
        hoverText: "Presented by Ice Sponsor",
        sortOrder: 5,
        isActive: false,
      })

      expect(sponsor?.name).toBe("Ice Sponsor")
      expect(sponsor?.websiteUrl).toBe("https://ice-sponsor.test")
      expect(sponsor?.hoverText).toBe("Presented by Ice Sponsor")
      expect(sponsor?.sortOrder).toBe(5)
      expect(sponsor?.isActive).toBe(false)
    })

    it("creates a sponsor with team association", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })
      const sponsor = await admin.sponsor.create({
        name: "Team Sponsor",
        teamId: team?.id,
      })

      expect(sponsor?.teamId).toBe(team?.id)
    })

    it("defaults to active and sortOrder 0", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({ name: "Minimal" })

      expect(sponsor?.isActive).toBe(true)
      expect(sponsor?.sortOrder).toBe(0)
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.sponsor.create({ name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("getById", () => {
    it("returns sponsor by id with team", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })
      const created = await admin.sponsor.create({
        name: "Sponsor A",
        teamId: team?.id,
      })

      const result = await admin.sponsor.getById({ id: created?.id })
      expect(result?.name).toBe("Sponsor A")
      expect(result?.team?.name).toBe("Eagles")
    })
  })

  describe("update", () => {
    it("updates sponsor fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({ name: "Old Name" })

      const updated = await admin.sponsor.update({
        id: sponsor?.id,
        name: "New Name",
        isActive: false,
        sortOrder: 10,
      })

      expect(updated?.name).toBe("New Name")
      expect(updated?.isActive).toBe(false)
      expect(updated?.sortOrder).toBe(10)
    })

    it("clears nullable fields when set to null", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({
        name: "Full Sponsor",
        websiteUrl: "https://example.test",
        hoverText: "Some text",
      })

      const updated = await admin.sponsor.update({
        id: sponsor?.id,
        websiteUrl: null,
        hoverText: null,
      })

      expect(updated?.websiteUrl).toBeNull()
      expect(updated?.hoverText).toBeNull()
      expect(updated?.name).toBe("Full Sponsor")
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({ name: "Sponsor" })

      const caller = createTestCaller()
      await expect(caller.sponsor.update({ id: sponsor?.id, name: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a sponsor", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({ name: "To Delete" })

      await admin.sponsor.delete({ id: sponsor?.id })

      const result = await admin.sponsor.getById({ id: sponsor?.id })
      expect(result).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const sponsor = await admin.sponsor.create({ name: "Sponsor" })

      const caller = createTestCaller()
      await expect(caller.sponsor.delete({ id: sponsor?.id })).rejects.toThrow("Not authenticated")
    })
  })

  describe("FK behavior", () => {
    it("sets teamId to null when associated team is deleted", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const team = await admin.team.create({ name: "Eagles", shortName: "EAG" })
      const sponsor = await admin.sponsor.create({
        name: "Team Sponsor",
        teamId: team?.id,
      })
      expect(sponsor?.teamId).toBe(team?.id)

      await admin.team.delete({ id: team?.id })

      const result = await admin.sponsor.getById({ id: sponsor?.id })
      expect(result).toBeDefined()
      expect(result?.teamId).toBeNull()
    })
  })
})
