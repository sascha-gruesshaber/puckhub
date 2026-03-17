import { describe, expect, it } from "vitest"
import { hashPublicReportEmail } from "../../lib/publicReportPrivacy"
import { createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

/**
 * Shared helper: create the full fixture tree needed for public game reports.
 * Returns IDs for season, division, round, teams, game, plan, subscription, and settings.
 */
async function createPublicReportFixtures(opts?: {
  publicReportsEnabled?: boolean
  publicReportsRequireEmail?: boolean
  publicReportsBotDetection?: boolean
}) {
  const admin = createTestCaller({ asAdmin: true })
  const db = getTestDb()

  // Season → Division → Round
  const season = (await admin.season.create({
    name: "2025/26",
    seasonStart: "2025-09-01",
    seasonEnd: "2026-04-30",
  }))!
  const division = (await admin.division.create({ seasonId: season.id, name: "Liga" }))!
  const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!

  // Teams
  const homeTeam = (await admin.team.create({ name: "Eagles", shortName: "EAG" }))!
  const awayTeam = (await admin.team.create({ name: "Wolves", shortName: "WOL" }))!
  await admin.teamDivision.assign({ teamId: homeTeam.id, divisionId: division.id })
  await admin.teamDivision.assign({ teamId: awayTeam.id, divisionId: division.id })

  // Scheduled game
  const game = (await admin.game.create({
    roundId: round.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    scheduledAt: "2025-10-15T19:30:00.000Z",
  }))!

  // Plan with featurePublicReports enabled
  const plan = await db.plan.create({
    data: {
      id: crypto.randomUUID(),
      name: "Pro",
      slug: "pro",
      sortOrder: 1,
      isActive: true,
      priceYearly: 29900,
      featurePublicReports: true,
    },
  })

  // Subscription
  await db.orgSubscription.create({
    data: {
      organizationId: TEST_ORG_ID,
      planId: plan.id,
      interval: "yearly",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    },
  })

  // System settings
  await db.systemSettings.create({
    data: {
      organizationId: TEST_ORG_ID,
      leagueName: "Test Liga",
      leagueShortName: "TL",
      locale: "de-DE",
      timezone: "Europe/Berlin",
      publicReportsEnabled: opts?.publicReportsEnabled ?? true,
      publicReportsRequireEmail: opts?.publicReportsRequireEmail ?? false,
      publicReportsBotDetection: opts?.publicReportsBotDetection ?? false,
    },
  })

  return { admin, db, season, division, round, homeTeam, awayTeam, game, plan }
}

// =============================================================================
// publicGameReport router (admin-side)
// =============================================================================

describe("publicGameReport router", () => {
  // ── list ───────────────────────────────────────────────────────────
  describe("list", () => {
    it("returns empty list when no reports exist", async () => {
      await createPublicReportFixtures()
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.publicGameReport.list({ limit: 50 })
      expect(result).toEqual([])
    })

    it("returns reports with game details", async () => {
      const { db, game } = await createPublicReportFixtures()

      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: hashPublicReportEmail("fan@example.com", TEST_ORG_ID),
          submitterEmailMasked: "f***@example.com",
        },
      })

      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.publicGameReport.list({ limit: 50 })
      expect(result).toHaveLength(1)
      expect(result[0]!.homeScore).toBe(3)
      expect(result[0]!.awayScore).toBe(2)
      expect(result[0]!.game.homeTeam.shortName).toBe("EAG")
      expect(result[0]!.game.awayTeam.shortName).toBe("WOL")
    })

    it("filters by reverted status", async () => {
      const { db, game } = await createPublicReportFixtures()

      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-alice",
          submitterEmailMasked: "a***@example.com",
          reverted: false,
        },
      })
      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 1,
          awayScore: 0,
          submitterEmailHash: "hash-bob",
          submitterEmailMasked: "b***@example.com",
          reverted: true,
          revertedAt: new Date(),
        },
      })

      const admin = createTestCaller({ asAdmin: true })

      const active = await admin.publicGameReport.list({ reverted: false, limit: 50 })
      expect(active).toHaveLength(1)
      expect(active[0]!.submitterEmailMasked).toBe("a***@example.com")

      const reverted = await admin.publicGameReport.list({ reverted: true, limit: 50 })
      expect(reverted).toHaveLength(1)
      expect(reverted[0]!.submitterEmailMasked).toBe("b***@example.com")
    })

    it("rejects unauthenticated calls", async () => {
      await createPublicReportFixtures()
      const publicCaller = createTestCaller()
      await expect(publicCaller.publicGameReport.list({ limit: 50 })).rejects.toThrow()
    })

    it("rejects non-admin users (no game_manager role)", async () => {
      await createPublicReportFixtures()
      const user = createTestCaller({ asUser: true })
      await expect(user.publicGameReport.list({ limit: 50 })).rejects.toThrow("Unzureichende Berechtigungen")
    })
  })

  // ── count ──────────────────────────────────────────────────────────
  describe("count", () => {
    it("returns 0 when no active reports", async () => {
      await createPublicReportFixtures()
      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.publicGameReport.count()
      expect(result.count).toBe(0)
    })

    it("counts only non-reverted reports", async () => {
      const { db, game } = await createPublicReportFixtures()

      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-alice",
          submitterEmailMasked: "a***@example.com",
          reverted: false,
        },
      })
      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 1,
          awayScore: 0,
          submitterEmailHash: "hash-bob",
          submitterEmailMasked: "b***@example.com",
          reverted: true,
          revertedAt: new Date(),
        },
      })

      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.publicGameReport.count()
      expect(result.count).toBe(1)
    })
  })

  // ── revert ─────────────────────────────────────────────────────────
  describe("revert", () => {
    it("marks report as reverted and reopens the game", async () => {
      const { db, game } = await createPublicReportFixtures()

      // Simulate a completed game with a public report
      await db.game.update({
        where: { id: game.id },
        data: { status: "completed", homeScore: 3, awayScore: 2, finalizedAt: new Date() },
      })
      const report = await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: hashPublicReportEmail("fan@example.com", TEST_ORG_ID),
          submitterEmailMasked: "f***@example.com",
        },
      })

      const admin = createTestCaller({ asAdmin: true })
      const result = await admin.publicGameReport.revert({ id: report.id, revertNote: "Wrong score" })
      expect(result.success).toBe(true)

      // Verify report is reverted
      const reverted = await db.publicGameReport.findUnique({ where: { id: report.id } })
      expect(reverted!.reverted).toBe(true)
      expect(reverted!.revertNote).toBe("Wrong score")
      expect(reverted!.revertedAt).not.toBeNull()

      // Verify game is reopened
      const updatedGame = await db.game.findUnique({ where: { id: game.id } })
      expect(updatedGame!.status).toBe("scheduled")
      expect(updatedGame!.homeScore).toBeNull()
      expect(updatedGame!.awayScore).toBeNull()
      expect(updatedGame!.finalizedAt).toBeNull()
    })

    it("throws NOT_FOUND for non-existent report", async () => {
      await createPublicReportFixtures()
      const admin = createTestCaller({ asAdmin: true })
      await expect(
        admin.publicGameReport.revert({ id: "00000000-0000-0000-0000-000000000000" }),
      ).rejects.toThrow("PUBLIC_REPORT_NOT_FOUND")
    })

    it("throws ALREADY_REVERTED for already reverted report", async () => {
      const { db, game } = await createPublicReportFixtures()

      const report = await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-fan",
          submitterEmailMasked: "f***@example.com",
          reverted: true,
          revertedAt: new Date(),
        },
      })

      const admin = createTestCaller({ asAdmin: true })
      await expect(admin.publicGameReport.revert({ id: report.id })).rejects.toThrow(
        "PUBLIC_REPORT_ALREADY_REVERTED",
      )
    })

    it("rejects non-admin users", async () => {
      const { db, game } = await createPublicReportFixtures()
      const report = await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-fan",
          submitterEmailMasked: "f***@example.com",
        },
      })

      const user = createTestCaller({ asUser: true })
      await expect(user.publicGameReport.revert({ id: report.id })).rejects.toThrow("Unzureichende Berechtigungen")
    })
  })
})

// =============================================================================
// publicSite report procedures (public-facing)
// =============================================================================

describe("publicSite report procedures", () => {
  // ── reportHasReport ────────────────────────────────────────────────
  describe("reportHasReport", () => {
    it("returns false when no report exists", async () => {
      const { game } = await createPublicReportFixtures()
      const caller = createTestCaller()
      const result = await caller.publicSite.reportHasReport({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
      })
      expect(result.hasReport).toBe(false)
    })

    it("returns true when an active report exists", async () => {
      const { db, game } = await createPublicReportFixtures()
      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-fan",
          submitterEmailMasked: "f***@example.com",
        },
      })

      const caller = createTestCaller()
      const result = await caller.publicSite.reportHasReport({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
      })
      expect(result.hasReport).toBe(true)
    })

    it("returns false when only reverted reports exist", async () => {
      const { db, game } = await createPublicReportFixtures()
      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-fan",
          submitterEmailMasked: "f***@example.com",
          reverted: true,
          revertedAt: new Date(),
        },
      })

      const caller = createTestCaller()
      const result = await caller.publicSite.reportHasReport({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
      })
      expect(result.hasReport).toBe(false)
    })
  })

  // ── reportSubmit ───────────────────────────────────────────────────
  describe("reportSubmit", () => {
    it("submits a report successfully (no email verification, no bot detection)", async () => {
      const { db, game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: false,
      })

      const caller = createTestCaller()
      const result = await caller.publicSite.reportSubmit({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        homeScore: 4,
        awayScore: 1,
        email: "fan@example.com",
        comment: "Great game!",
      })
      expect(result.success).toBe(true)

      // Game should be completed now
      const updatedGame = await db.game.findUnique({ where: { id: game.id } })
      expect(updatedGame!.status).toBe("completed")
      expect(updatedGame!.homeScore).toBe(4)
      expect(updatedGame!.awayScore).toBe(1)

      // Report should exist
      const report = await db.publicGameReport.findFirst({ where: { gameId: game.id } })
      expect(report).not.toBeNull()
      expect(report!.submitterEmailMasked).toBe("f***@example.com")
      expect(report!.comment).toBe("Great game!")
    })

    it("rejects submission when feature is disabled in plan", async () => {
      const { db, game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: false,
      })

      // Disable the feature in the plan
      const sub = await db.orgSubscription.findUnique({ where: { organizationId: TEST_ORG_ID } })
      await db.plan.update({ where: { id: sub!.planId }, data: { featurePublicReports: false } })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
        }),
      ).rejects.toThrow("Public reports are not enabled")
    })

    it("rejects submission when disabled in settings", async () => {
      const { db, game } = await createPublicReportFixtures({
        publicReportsEnabled: false,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: false,
      })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
        }),
      ).rejects.toThrow("Public reports are not enabled")
    })

    it("rejects duplicate report from same email", async () => {
      const { db, game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: false,
      })

      // Create existing report
      await db.publicGameReport.create({
        data: {
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 3,
          awayScore: 2,
          submitterEmailHash: "hash-fan",
          submitterEmailMasked: "f***@example.com",
        },
      })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
        }),
      ).rejects.toThrow("You have already submitted a report")
    })

    it("rejects report for already completed game", async () => {
      const { db, game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: false,
      })

      await db.game.update({
        where: { id: game.id },
        data: { status: "completed", homeScore: 3, awayScore: 2, finalizedAt: new Date() },
      })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
        }),
      ).rejects.toThrow("This game has already been reported")
    })

    it("rejects report for non-existent game", async () => {
      await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: false,
      })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: "00000000-0000-0000-0000-000000000000",
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
        }),
      ).rejects.toThrow("GAME_NOT_FOUND")
    })

    it("silently rejects when honeypot is filled (bot detection)", async () => {
      const { game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: true,
      })

      const caller = createTestCaller()
      const result = await caller.publicSite.reportSubmit({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        homeScore: 4,
        awayScore: 1,
        email: "bot@example.com",
        _hp: "i-am-a-bot",
        _ts: Date.now() - 60000,
      })

      // Should return success but NOT create a report
      expect(result.success).toBe(true)

      const db = getTestDb()
      const report = await db.publicGameReport.findFirst({ where: { gameId: game.id } })
      expect(report).toBeNull()
    })

    it("silently rejects when form submitted too fast (bot detection)", async () => {
      const { game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: false,
        publicReportsBotDetection: true,
      })

      const caller = createTestCaller()
      const result = await caller.publicSite.reportSubmit({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        homeScore: 4,
        awayScore: 1,
        email: "fast@example.com",
        _ts: Date.now(), // submitted immediately — too fast
      })

      expect(result.success).toBe(true)

      const db = getTestDb()
      const report = await db.publicGameReport.findFirst({ where: { gameId: game.id } })
      expect(report).toBeNull()
    })

    it("requires OTP code when email verification is enabled", async () => {
      const { game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: true,
        publicReportsBotDetection: false,
      })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
          // no otpCode
        }),
      ).rejects.toThrow("Verification code is required")
    })

    it("rejects invalid OTP code", async () => {
      const { game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: true,
        publicReportsBotDetection: false,
      })

      const caller = createTestCaller()
      await expect(
        caller.publicSite.reportSubmit({
          organizationId: TEST_ORG_ID,
          gameId: game.id,
          homeScore: 4,
          awayScore: 1,
          email: "fan@example.com",
          otpCode: "000000",
        }),
      ).rejects.toThrow("Invalid or expired verification code")
    })

    it("accepts valid OTP code and submits report", async () => {
      const { db, game } = await createPublicReportFixtures({
        publicReportsEnabled: true,
        publicReportsRequireEmail: true,
        publicReportsBotDetection: false,
      })

      const identifier = `public-report:fan@example.com:${TEST_ORG_ID}`
      await db.verification.create({
        data: {
          id: crypto.randomUUID(),
          identifier,
          value: "123456",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      const caller = createTestCaller()
      const result = await caller.publicSite.reportSubmit({
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        homeScore: 2,
        awayScore: 1,
        email: "fan@example.com",
        otpCode: "123456",
      })
      expect(result.success).toBe(true)

      // OTP should be consumed (deleted)
      const otp = await db.verification.findFirst({ where: { identifier } })
      expect(otp).toBeNull()

      // Game should be completed
      const updatedGame = await db.game.findUnique({ where: { id: game.id } })
      expect(updatedGame!.status).toBe("completed")
    })
  })

  // ── reportRequestOtp ───────────────────────────────────────────────
  describe("reportRequestOtp", () => {
    it("creates a verification record", async () => {
      await createPublicReportFixtures()
      const db = getTestDb()
      const caller = createTestCaller()

      await caller.publicSite.reportRequestOtp({
        organizationId: TEST_ORG_ID,
        email: "fan@example.com",
      })

      const identifier = `public-report:fan@example.com:${TEST_ORG_ID}`
      const verification = await db.verification.findFirst({ where: { identifier } })
      expect(verification).not.toBeNull()
      expect(verification!.value).toHaveLength(6)
      expect(Number(verification!.value)).not.toBeNaN()
    })

    it("rate-limits after 3 requests per hour", async () => {
      await createPublicReportFixtures()
      const db = getTestDb()
      const caller = createTestCaller()

      // Seed 3 existing verification records (within the last hour)
      const identifier = `public-report:spammer@example.com:${TEST_ORG_ID}`
      for (let i = 0; i < 3; i++) {
        await db.verification.create({
          data: {
            id: crypto.randomUUID(),
            identifier,
            value: String(100000 + i),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      }

      await expect(
        caller.publicSite.reportRequestOtp({
          organizationId: TEST_ORG_ID,
          email: "spammer@example.com",
        }),
      ).rejects.toThrow("Too many OTP requests")
    })
  })
})

