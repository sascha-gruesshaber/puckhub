import { describe, expect, it } from "vitest"
import { createTestCaller } from "../testUtils"

describe("player router", () => {
  describe("list", () => {
    it("returns empty list when no players exist", async () => {
      const caller = createTestCaller()
      const result = await caller.player.list()
      expect(result).toEqual([])
    })

    it("returns players ordered by lastName then firstName", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.player.create({ firstName: "Max", lastName: "Müller" })
      await admin.player.create({ firstName: "Hans", lastName: "Bauer" })
      await admin.player.create({ firstName: "Anna", lastName: "Müller" })

      const caller = createTestCaller()
      const result = await caller.player.list()
      expect(result).toHaveLength(3)
      expect(result[0]?.lastName).toBe("Bauer")
      expect(result[1]?.firstName).toBe("Anna")
      expect(result[2]?.firstName).toBe("Max")
    })
  })

  describe("create", () => {
    it("creates a player with all fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const player = await admin.player.create({
        firstName: "Wayne",
        lastName: "Gretzky",
        dateOfBirth: "1961-01-26",
        nationality: "CA",
      })

      expect(player?.firstName).toBe("Wayne")
      expect(player?.lastName).toBe("Gretzky")
      expect(player?.dateOfBirth).toBe("1961-01-26")
      expect(player?.nationality).toBe("CA")
    })

    it("creates a player with minimal fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const player = await admin.player.create({
        firstName: "Test",
        lastName: "Player",
      })

      expect(player?.firstName).toBe("Test")
      expect(player?.dateOfBirth).toBeNull()
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.player.create({ firstName: "Test", lastName: "Player" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("update", () => {
    it("updates player fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const player = await admin.player.create({ firstName: "Test", lastName: "Player" })

      const updated = await admin.player.update({
        id: player?.id,
        firstName: "Updated",
        nationality: "DE",
      })

      expect(updated?.firstName).toBe("Updated")
      expect(updated?.nationality).toBe("DE")
      expect(updated?.lastName).toBe("Player")
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const player = await admin.player.create({ firstName: "Test", lastName: "Player" })

      const caller = createTestCaller()
      await expect(caller.player.update({ id: player?.id, firstName: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a player", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const player = await admin.player.create({ firstName: "Test", lastName: "Player" })

      await admin.player.delete({ id: player?.id })

      const caller = createTestCaller()
      const result = await caller.player.getById({ id: player?.id })
      expect(result).toBeUndefined()
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const player = await admin.player.create({ firstName: "Test", lastName: "Player" })

      const caller = createTestCaller()
      await expect(caller.player.delete({ id: player?.id })).rejects.toThrow("Not authenticated")
    })
  })
})
