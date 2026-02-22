import { describe, expect, it } from "vitest"
import { createTestCaller, getTestDb } from "../testUtils"

describe("news router", () => {
  describe("list", () => {
    it("returns empty list when no news exist", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.news.list()
      expect(result).toEqual([])
    })

    it("returns news ordered by createdAt desc", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.news.create({ title: "Erster Beitrag", content: "<p>Inhalt 1</p>" })
      await admin.news.create({ title: "Zweiter Beitrag", content: "<p>Inhalt 2</p>" })

      const result = await admin.news.list()
      expect(result).toHaveLength(2)
      expect(result[0]?.title).toBe("Zweiter Beitrag")
      expect(result[1]?.title).toBe("Erster Beitrag")
    })

    it("includes author relation", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.news.create({ title: "Mit Autor", content: "<p>Test</p>" })

      const result = await admin.news.list()
      expect(result[0]?.author).toBeDefined()
      expect(result[0]?.author?.email).toBe("admin@test.local")
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.news.list()).rejects.toThrow("Not authenticated")
    })
  })

  describe("create", () => {
    it("creates a draft news by default", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const news = await admin.news.create({
        title: "Neuer Beitrag",
        content: "<p>Inhalt</p>",
      })

      expect(news?.title).toBe("Neuer Beitrag")
      expect(news?.content).toBe("<p>Inhalt</p>")
      expect(news?.status).toBe("draft")
      expect(news?.publishedAt).toBeNull()
      expect(news?.authorId).toBe("test-admin-id")
    })

    it("creates a published news with publishedAt set", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const news = await admin.news.create({
        title: "Veröffentlicht",
        content: "<p>Sofort live</p>",
        status: "published",
      })

      expect(news?.status).toBe("published")
      expect(news?.publishedAt).not.toBeNull()
    })

    it("creates news with shortText and scheduledPublishAt", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const scheduled = new Date("2025-06-01T10:00:00Z").toISOString()
      const news = await admin.news.create({
        title: "Geplant",
        shortText: "Vorschau-Text",
        content: "<p>Inhalt</p>",
        scheduledPublishAt: scheduled,
      })

      expect(news?.shortText).toBe("Vorschau-Text")
      expect(news?.scheduledPublishAt).toBeDefined()
    })

    it("rejects unauthenticated calls", async () => {
      const caller = createTestCaller()
      await expect(caller.news.create({ title: "Hacked", content: "<p>Nein</p>" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("getById", () => {
    it("returns news by id with author", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const created = await admin.news.create({
        title: "Einzelbeitrag",
        content: "<p>Test</p>",
      })

      const result = await admin.news.getById({ id: created?.id })
      expect(result.title).toBe("Einzelbeitrag")
      expect(result.author).toBeDefined()
    })

    it("throws NOT_FOUND for non-existent id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.news.getById({ id: "00000000-0000-0000-0000-000000000000" })).rejects.toThrow(
        "NEWS_NOT_FOUND",
      )
    })
  })

  describe("update", () => {
    it("updates news fields", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const created = await admin.news.create({
        title: "Alt",
        content: "<p>Alt</p>",
      })

      const updated = await admin.news.update({
        id: created?.id,
        title: "Neu",
        content: "<p>Neu</p>",
        shortText: "Kurztext",
      })

      expect(updated?.title).toBe("Neu")
      expect(updated?.content).toBe("<p>Neu</p>")
      expect(updated?.shortText).toBe("Kurztext")
    })

    it("sets publishedAt when publishing a draft", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const draft = await admin.news.create({
        title: "Entwurf",
        content: "<p>Inhalt</p>",
      })
      expect(draft?.publishedAt).toBeNull()

      const published = await admin.news.update({
        id: draft?.id,
        status: "published",
      })
      expect(published?.status).toBe("published")
      expect(published?.publishedAt).not.toBeNull()
    })

    it("clears publishedAt when reverting to draft", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const published = await admin.news.create({
        title: "Live",
        content: "<p>Inhalt</p>",
        status: "published",
      })
      expect(published?.publishedAt).not.toBeNull()

      const reverted = await admin.news.update({
        id: published?.id,
        status: "draft",
      })
      expect(reverted?.status).toBe("draft")
      expect(reverted?.publishedAt).toBeNull()
    })

    it("preserves publishedAt when updating an already published news", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const published = await admin.news.create({
        title: "Live",
        content: "<p>Inhalt</p>",
        status: "published",
      })
      const originalPublishedAt = published?.publishedAt

      const updated = await admin.news.update({
        id: published?.id,
        title: "Neuer Titel",
        status: "published",
      })
      expect(updated?.publishedAt?.getTime()).toBe(originalPublishedAt?.getTime())
    })

    it("clears nullable fields when set to null", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const created = await admin.news.create({
        title: "Mit Text",
        shortText: "Kurztext",
        content: "<p>Inhalt</p>",
      })

      const updated = await admin.news.update({
        id: created?.id,
        shortText: null,
      })
      expect(updated?.shortText).toBeNull()
    })

    it("throws NOT_FOUND for non-existent id", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.news.update({ id: "00000000-0000-0000-0000-000000000000", title: "X" })).rejects.toThrow(
        "NEWS_NOT_FOUND",
      )
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const news = await admin.news.create({ title: "Test", content: "<p>X</p>" })

      const caller = createTestCaller()
      await expect(caller.news.update({ id: news?.id, title: "Hacked" })).rejects.toThrow("Not authenticated")
    })
  })

  describe("delete", () => {
    it("deletes a news", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const news = await admin.news.create({ title: "Löschen", content: "<p>X</p>" })

      await admin.news.delete({ id: news?.id })

      await expect(admin.news.getById({ id: news?.id })).rejects.toThrow("NEWS_NOT_FOUND")
    })

    it("rejects unauthenticated calls", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const news = await admin.news.create({ title: "Test", content: "<p>X</p>" })

      const caller = createTestCaller()
      await expect(caller.news.delete({ id: news?.id })).rejects.toThrow("Not authenticated")
    })
  })

  describe("auto-publish scheduled", () => {
    it("auto-publishes a draft with scheduledPublishAt in the past on list", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const draft = await admin.news.create({
        title: "Geplant",
        content: "<p>Inhalt</p>",
        scheduledPublishAt: new Date(Date.now() + 60000).toISOString(), // future
      })
      expect(draft?.status).toBe("draft")

      // Manually set scheduledPublishAt to the past via DB
      const db = getTestDb()
      await db.news.update({
        where: { id: draft?.id },
        data: { scheduledPublishAt: new Date(Date.now() - 60000) },
      })

      const result = await admin.news.list()
      const found = result.find((n) => n.id === draft?.id)
      expect(found?.status).toBe("published")
      expect(found?.publishedAt).not.toBeNull()
      expect(found?.scheduledPublishAt).toBeNull()
    })

    it("auto-publishes a draft with scheduledPublishAt in the past on getById", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const draft = await admin.news.create({
        title: "Geplant einzeln",
        content: "<p>Inhalt</p>",
        scheduledPublishAt: new Date(Date.now() + 60000).toISOString(),
      })

      const db = getTestDb()
      await db.news.update({
        where: { id: draft?.id },
        data: { scheduledPublishAt: new Date(Date.now() - 60000) },
      })

      const result = await admin.news.getById({ id: draft?.id })
      expect(result.status).toBe("published")
      expect(result.publishedAt).not.toBeNull()
    })

    it("does not auto-publish drafts with scheduledPublishAt in the future", async () => {
      const admin = createTestCaller({ asAdmin: true })
      const future = new Date(Date.now() + 3600000).toISOString() // 1 hour ahead
      await admin.news.create({
        title: "Noch nicht fällig",
        content: "<p>Inhalt</p>",
        scheduledPublishAt: future,
      })

      const result = await admin.news.list()
      const found = result.find((n) => n.title === "Noch nicht fällig")
      expect(found?.status).toBe("draft")
      expect(found?.scheduledPublishAt).not.toBeNull()
    })

    it("does not affect plain drafts without scheduledPublishAt", async () => {
      const admin = createTestCaller({ asAdmin: true })
      await admin.news.create({
        title: "Normaler Entwurf",
        content: "<p>Inhalt</p>",
      })

      const result = await admin.news.list()
      const found = result.find((n) => n.title === "Normaler Entwurf")
      expect(found?.status).toBe("draft")
      expect(found?.publishedAt).toBeNull()
    })
  })
})
