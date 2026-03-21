/**
 * Comprehensive round-trip export → import test.
 *
 * Seeds every exportable entity, exports the league, imports it into a fresh
 * org, then compares record counts and field values.  When a new model or
 * field is added but not wired into the export/import, this test will catch it.
 */
import { describe, expect, it } from "vitest"
import { EXPORT_REGISTRY, pluralize } from "../../services/leagueTransfer/registry"
import { createPlatformAdminCaller, createTestCaller, getTestDb, TEST_ORG_ID } from "../testUtils"

describe("leagueTransfer – full round-trip", () => {
  /** Seed penalty types + trikot templates (global reference data) */
  async function seedGlobalRefs() {
    const db = getTestDb()

    await db.penaltyType.createMany({
      data: [
        { code: "MINOR", name: "Kleine Strafe", shortName: "2min", defaultMinutes: 2 },
        { code: "MAJOR", name: "Große Strafe", shortName: "5min", defaultMinutes: 5 },
        { code: "GAME_MISCONDUCT", name: "Spieldauer-Disziplinarstrafe", shortName: "SD", defaultMinutes: 20 },
      ],
      skipDuplicates: true,
    })

    const templates = await db.trikotTemplate.createManyAndReturn({
      data: [
        {
          name: "One-color",
          templateType: "one_color",
          colorCount: 1,
          svg: "<svg/>",
        },
      ],
      skipDuplicates: true,
    })

    const penaltyTypes = await db.penaltyType.findMany()
    return { penaltyTypes, trikotTemplates: templates }
  }

  /** Seed every exportable entity for TEST_ORG_ID */
  async function seedAllEntities() {
    const db = getTestDb()
    const admin = createTestCaller({ asAdmin: true })
    const { penaltyTypes, trikotTemplates } = await seedGlobalRefs()

    const minorPenalty = penaltyTypes.find((pt) => pt.code === "MINOR")!
    const gmPenalty = penaltyTypes.find((pt) => pt.code === "GAME_MISCONDUCT")!
    const trikotTemplate = trikotTemplates[0]!

    // --- SystemSettings ---
    await db.systemSettings.create({
      data: {
        organizationId: TEST_ORG_ID,
        leagueName: "RT Full League",
        leagueShortName: "RTFL",
        locale: "de-DE",
        timezone: "Europe/Vienna",
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
      },
    })

    // --- Season (with AI description) ---
    const season = (await admin.season.create({
      name: "Saison 2025/26",
      seasonStart: "2025-09-01",
      seasonEnd: "2026-04-30",
    }))!

    await db.season.update({
      where: { id: season.id },
      data: { aiDescriptionShort: "Eine spannende Saison mit vielen Überraschungen." },
    })

    // --- Division ---
    const division = (await admin.division.create({ seasonId: season.id, name: "Bundesliga" }))!

    // --- Round ---
    const round = (await admin.round.create({ divisionId: division.id, name: "Hauptrunde" }))!

    // --- Teams ---
    const teamA = (await admin.team.create({
      name: "EHC Eagles",
      shortName: "EAG",
      city: "Wien",
      primaryColor: "#003366",
      homeVenue: "Eishalle Wien",
    }))!
    const teamB = (await admin.team.create({
      name: "HC Wolves",
      shortName: "WOL",
      city: "Graz",
      primaryColor: "#660000",
    }))!

    // --- TeamDivisions ---
    await admin.teamDivision.assign({ teamId: teamA.id, divisionId: division.id })
    await admin.teamDivision.assign({ teamId: teamB.id, divisionId: division.id })

    // --- Players ---
    const playerA1 = (await admin.player.create({ firstName: "Max", lastName: "Müller" }))!
    const playerA2 = (await admin.player.create({ firstName: "Stefan", lastName: "Bauer" }))!
    const goalieA = (await admin.player.create({ firstName: "Thomas", lastName: "Gruber" }))!
    const playerB1 = (await admin.player.create({ firstName: "Lukas", lastName: "Fischer" }))!
    const goalieB = (await admin.player.create({ firstName: "Michael", lastName: "Huber" }))!

    // --- Contracts ---
    await admin.contract.signPlayer({
      playerId: playerA1.id,
      teamId: teamA.id,
      seasonId: season.id,
      position: "forward",
      jerseyNumber: 10,
    })
    await admin.contract.signPlayer({
      playerId: playerA2.id,
      teamId: teamA.id,
      seasonId: season.id,
      position: "defense",
      jerseyNumber: 5,
    })
    await admin.contract.signPlayer({
      playerId: goalieA.id,
      teamId: teamA.id,
      seasonId: season.id,
      position: "goalie",
      jerseyNumber: 1,
    })
    await admin.contract.signPlayer({
      playerId: playerB1.id,
      teamId: teamB.id,
      seasonId: season.id,
      position: "forward",
      jerseyNumber: 9,
    })
    await admin.contract.signPlayer({
      playerId: goalieB.id,
      teamId: teamB.id,
      seasonId: season.id,
      position: "goalie",
      jerseyNumber: 30,
    })

    // --- Trikots ---
    const trikotHome = await db.trikot.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "Heim Weiß",
        templateId: trikotTemplate.id,
        primaryColor: "#FFFFFF",
        secondaryColor: "#003366",
      },
    })
    const trikotAway = await db.trikot.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "Auswärts Rot",
        templateId: trikotTemplate.id,
        primaryColor: "#CC0000",
      },
    })

    // --- TeamTrikots ---
    await db.teamTrikot.create({
      data: {
        organizationId: TEST_ORG_ID,
        teamId: teamA.id,
        trikotId: trikotHome.id,
        name: "Heim",
        assignmentType: "home",
      },
    })
    await db.teamTrikot.create({
      data: {
        organizationId: TEST_ORG_ID,
        teamId: teamB.id,
        trikotId: trikotAway.id,
        name: "Auswärts",
        assignmentType: "away",
      },
    })

    // --- Game (created as scheduled first, events added, then completed) ---
    const game = (await admin.game.create({
      roundId: round.id,
      homeTeamId: teamA.id,
      awayTeamId: teamB.id,
      scheduledAt: "2025-10-15T19:30:00.000Z",
    }))!

    // Assign trikots while still editable
    await db.game.update({
      where: { id: game.id },
      data: {
        homeTrikotId: trikotHome.id,
        awayTrikotId: trikotAway.id,
      },
    })

    // --- GameLineups (must be set before game is completed) ---
    await admin.gameReport.setLineup({
      gameId: game.id,
      players: [
        { playerId: playerA1.id, teamId: teamA.id, position: "forward", jerseyNumber: 10 },
        { playerId: playerA2.id, teamId: teamA.id, position: "defense", jerseyNumber: 5 },
        { playerId: goalieA.id, teamId: teamA.id, position: "goalie", jerseyNumber: 1, isStartingGoalie: true },
        { playerId: playerB1.id, teamId: teamB.id, position: "forward", jerseyNumber: 9 },
        { playerId: goalieB.id, teamId: teamB.id, position: "goalie", jerseyNumber: 30, isStartingGoalie: true },
      ],
    })

    // --- GameEvents (goal + penalty + note – must be added while game is editable) ---
    await admin.gameReport.addEvent({
      gameId: game.id,
      eventType: "goal",
      teamId: teamA.id,
      period: 1,
      timeMinutes: 5,
      timeSeconds: 30,
      scorerId: playerA1.id,
      assist1Id: playerA2.id,
      goalieId: goalieB.id,
    })

    await admin.gameReport.addEvent({
      gameId: game.id,
      eventType: "penalty",
      teamId: teamB.id,
      period: 2,
      timeMinutes: 8,
      timeSeconds: 0,
      penaltyPlayerId: playerB1.id,
      penaltyTypeId: minorPenalty.id,
      penaltyMinutes: 2,
      penaltyDescription: "Beinstellen",
    })

    // A second penalty that triggers suspension
    const gmEvent = await admin.gameReport.addEvent({
      gameId: game.id,
      eventType: "penalty",
      teamId: teamB.id,
      period: 3,
      timeMinutes: 15,
      timeSeconds: 0,
      penaltyPlayerId: playerB1.id,
      penaltyTypeId: gmPenalty.id,
      penaltyMinutes: 20,
    })

    await admin.gameReport.addEvent({
      gameId: game.id,
      eventType: "note",
      noteText: "Referee timeout wegen Eis-Qualität",
      notePublic: true,
    })

    // --- GameSuspension ---
    await db.gameSuspension.create({
      data: {
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        gameEventId: gmEvent.id,
        playerId: playerB1.id,
        teamId: teamB.id,
        suspensionType: "game_misconduct",
        suspendedGames: 1,
        servedGames: 0,
      },
    })

    // Now mark game as completed with scores and recap
    await db.game.update({
      where: { id: game.id },
      data: {
        homeScore: 4,
        awayScore: 2,
        status: "completed",
        recapTitle: "Eagles dominieren Wolves",
        recapContent: "<p>Die Eagles gewannen deutlich mit 4:2.</p>",
        recapGeneratedAt: new Date("2025-10-16T08:00:00.000Z"),
        finalizedAt: new Date("2025-10-15T21:30:00.000Z"),
      },
    })

    // --- GoalieGameStat ---
    await db.goalieGameStat.create({
      data: {
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        playerId: goalieA.id,
        teamId: teamA.id,
        goalsAgainst: 2,
      },
    })
    await db.goalieGameStat.create({
      data: {
        organizationId: TEST_ORG_ID,
        gameId: game.id,
        playerId: goalieB.id,
        teamId: teamB.id,
        goalsAgainst: 4,
      },
    })

    // --- BonusPoint ---
    await db.bonusPoint.create({
      data: {
        organizationId: TEST_ORG_ID,
        teamId: teamA.id,
        roundId: round.id,
        points: 1,
        reason: "Fair-Play-Bonus",
      },
    })

    // --- Sponsor ---
    await db.sponsor.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "Sponsor GmbH",
        websiteUrl: "https://sponsor.example.com",
        teamId: teamA.id,
        sortOrder: 1,
        isActive: true,
      },
    })

    // --- News (with SEO fields) ---
    await db.news.create({
      data: {
        organizationId: TEST_ORG_ID,
        title: "Eagles gewinnen Saisonauftakt",
        shortText: "Ein klarer Sieg im ersten Spiel.",
        content: "<p>Die Eagles starten mit einem 4:2 in die Saison.</p>",
        status: "published",
        publishedAt: new Date("2025-10-16T10:00:00.000Z"),
        seoTitle: "Eagles Saisonauftakt – 4:2 Sieg",
        seoDescription: "Die EHC Eagles gewinnen ihr erstes Spiel der Saison.",
      },
    })

    // --- Page (with SEO fields + parent/child) ---
    const parentPage = await db.page.create({
      data: {
        organizationId: TEST_ORG_ID,
        title: "Über uns",
        slug: "ueber-uns",
        content: "<p>Willkommen bei der Liga!</p>",
        status: "published",
        seoTitle: "Über die Liga",
        seoDescription: "Alles über unsere Liga.",
      },
    })
    const childPage = await db.page.create({
      data: {
        organizationId: TEST_ORG_ID,
        title: "Geschichte",
        slug: "geschichte",
        content: "<p>Unsere Geschichte seit 1990.</p>",
        parentId: parentPage.id,
        status: "published",
      },
    })

    // --- PageAlias ---
    await db.pageAlias.create({
      data: {
        organizationId: TEST_ORG_ID,
        slug: "about",
        targetPageId: parentPage.id,
      },
    })

    // --- WebsiteConfig ---
    await db.websiteConfig.create({
      data: {
        organizationId: TEST_ORG_ID,
        domain: "test-league.example.com",
        isActive: true,
        colorPrimary: "#003366",
        colorSecondary: "#FFFFFF",
        templatePreset: "classic",
      },
    })

    // --- Document ---
    await db.document.create({
      data: {
        organizationId: TEST_ORG_ID,
        title: "Spielordnung 2025/26",
        fileUrl: "/api/uploads/test-org-id/documents/spielordnung.pdf",
        description: "Aktuelle Spielordnung",
        mimeType: "application/pdf",
      },
    })

    return {
      season,
      division,
      round,
      teamA,
      teamB,
      playerA1,
      playerA2,
      goalieA,
      playerB1,
      goalieB,
      trikotHome,
      trikotAway,
      game,
      parentPage,
      childPage,
    }
  }

  it("exports all entities, imports them, and every record is preserved", async () => {
    const db = getTestDb()
    const platformAdmin = createPlatformAdminCaller(TEST_ORG_ID)

    // ── Seed ──
    await seedAllEntities()

    // ── Export ──
    const exported = await platformAdmin.leagueTransfer.exportLeague({
      organizationId: TEST_ORG_ID,
    })

    // Verify every registry model has records in the export
    for (const [modelName] of Object.entries(EXPORT_REGISTRY)) {
      const key = pluralize(modelName)
      const arr = (exported as any)[key]
      expect(arr, `export should contain ${key}`).toBeDefined()
      expect(arr.length, `${key} should have at least 1 record`).toBeGreaterThanOrEqual(1)
    }

    // ── Import ──
    const importResult = await platformAdmin.leagueTransfer.importLeague({
      data: exported,
      name: "Imported Copy",
    })

    const newOrgId = importResult.organizationId
    expect(newOrgId).not.toBe(TEST_ORG_ID)

    // ── Compare record counts ──
    // Pages are special: ensureSystemPages may create additional system pages on import
    const SKIP_COUNT_MODELS = new Set(["page"])
    for (const [modelName] of Object.entries(EXPORT_REGISTRY)) {
      if (SKIP_COUNT_MODELS.has(modelName)) continue
      const delegate = (db as any)[modelName]
      const sourceCount = await delegate.count({ where: { organizationId: TEST_ORG_ID } })
      const importedCount = await delegate.count({ where: { organizationId: newOrgId } })
      expect(importedCount, `${modelName}: imported count should match source`).toBe(sourceCount)
    }

    // Pages: imported count should be >= source (system pages may be added)
    const sourcePageCount = await db.page.count({ where: { organizationId: TEST_ORG_ID } })
    const importedPageCount = await db.page.count({ where: { organizationId: newOrgId } })
    expect(importedPageCount, "page: imported count should be >= source").toBeGreaterThanOrEqual(sourcePageCount)

    // ── Verify system settings ──
    const importedSettings = await db.systemSettings.findUnique({ where: { organizationId: newOrgId } })
    expect(importedSettings).not.toBeNull()
    expect(importedSettings!.leagueName).toBe("Imported Copy") // name override
    expect(importedSettings!.leagueShortName).toBe("RTFL")
    expect(importedSettings!.locale).toBe("de-DE")
    expect(importedSettings!.timezone).toBe("Europe/Vienna")
    expect(importedSettings!.pointsWin).toBe(3)

    // ── Verify season AI description survived ──
    const importedSeason = await db.season.findFirst({ where: { organizationId: newOrgId } })
    expect(importedSeason!.aiDescriptionShort).toBe("Eine spannende Saison mit vielen Überraschungen.")

    // ── Verify game fields (trikots, recap, scores) ──
    const importedGame = await db.game.findFirst({
      where: { organizationId: newOrgId },
      include: { homeTrikot: true, awayTrikot: true },
    })
    expect(importedGame).not.toBeNull()
    expect(importedGame!.homeScore).toBe(4)
    expect(importedGame!.awayScore).toBe(2)
    expect(importedGame!.status).toBe("completed")
    expect(importedGame!.recapTitle).toBe("Eagles dominieren Wolves")
    expect(importedGame!.recapContent).toContain("4:2")
    expect(importedGame!.recapGeneratedAt).not.toBeNull()
    expect(importedGame!.finalizedAt).not.toBeNull()

    // Trikot references should point to the IMPORTED trikots (remapped IDs)
    expect(importedGame!.homeTrikotId).not.toBeNull()
    expect(importedGame!.awayTrikotId).not.toBeNull()
    expect(importedGame!.homeTrikot!.name).toBe("Heim Weiß")
    expect(importedGame!.awayTrikot!.name).toBe("Auswärts Rot")
    // IDs must be different from source (remapped)
    const sourceGame = await db.game.findFirst({ where: { organizationId: TEST_ORG_ID } })
    expect(importedGame!.homeTrikotId).not.toBe(sourceGame!.homeTrikotId)

    // ── Verify trikots have correct global ref (template) ──
    const importedTrikots = await db.trikot.findMany({ where: { organizationId: newOrgId } })
    expect(importedTrikots).toHaveLength(2)
    const templateIds = importedTrikots.map((t) => t.templateId)
    // All should point to the same global template
    const globalTemplate = await db.trikotTemplate.findFirst({ where: { name: "One-color" } })
    for (const tid of templateIds) {
      expect(tid).toBe(globalTemplate!.id)
    }

    // ── Verify team trikot assignments ──
    const importedTeamTrikots = await db.teamTrikot.findMany({ where: { organizationId: newOrgId } })
    expect(importedTeamTrikots).toHaveLength(2)

    // ── Verify game events ──
    const importedEvents = await db.gameEvent.findMany({
      where: { organizationId: newOrgId },
      orderBy: { createdAt: "asc" },
    })
    expect(importedEvents).toHaveLength(4) // 1 goal + 2 penalties + 1 note
    const goalEvent = importedEvents.find((e) => e.eventType === "goal")!
    expect(goalEvent.period).toBe(1)
    expect(goalEvent.timeMinutes).toBe(5)
    expect(goalEvent.scorerId).not.toBeNull()

    const penaltyEvents = importedEvents.filter((e) => e.eventType === "penalty")
    expect(penaltyEvents).toHaveLength(2)
    // Global ref: penalty type should be resolved to the correct ID
    for (const pe of penaltyEvents) {
      expect(pe.penaltyTypeId).not.toBeNull()
      const pt = await db.penaltyType.findUnique({ where: { id: pe.penaltyTypeId! } })
      expect(pt).not.toBeNull()
    }

    const noteEvent = importedEvents.find((e) => e.eventType === "note")!
    expect(noteEvent.noteText).toContain("Eis-Qualität")

    // ── Verify suspensions ──
    const importedSuspensions = await db.gameSuspension.findMany({ where: { organizationId: newOrgId } })
    expect(importedSuspensions).toHaveLength(1)
    expect(importedSuspensions[0]!.suspensionType).toBe("game_misconduct")
    expect(importedSuspensions[0]!.suspendedGames).toBe(1)

    // ── Verify goalie stats ──
    const importedGoalieStats = await db.goalieGameStat.findMany({ where: { organizationId: newOrgId } })
    expect(importedGoalieStats).toHaveLength(2)
    const goalsAgainst = importedGoalieStats.map((g) => g.goalsAgainst).sort()
    expect(goalsAgainst).toEqual([2, 4])

    // ── Verify bonus points ──
    const importedBonusPoints = await db.bonusPoint.findMany({ where: { organizationId: newOrgId } })
    expect(importedBonusPoints).toHaveLength(1)
    expect(importedBonusPoints[0]!.points).toBe(1)
    expect(importedBonusPoints[0]!.reason).toBe("Fair-Play-Bonus")

    // ── Verify sponsors ──
    const importedSponsors = await db.sponsor.findMany({ where: { organizationId: newOrgId } })
    expect(importedSponsors).toHaveLength(1)
    expect(importedSponsors[0]!.name).toBe("Sponsor GmbH")

    // ── Verify news (with SEO fields) ──
    const importedNews = await db.news.findMany({ where: { organizationId: newOrgId } })
    expect(importedNews).toHaveLength(1)
    expect(importedNews[0]!.title).toBe("Eagles gewinnen Saisonauftakt")
    expect(importedNews[0]!.seoTitle).toBe("Eagles Saisonauftakt – 4:2 Sieg")
    expect(importedNews[0]!.seoDescription).toBe("Die EHC Eagles gewinnen ihr erstes Spiel der Saison.")
    expect(importedNews[0]!.authorId).toBeNull() // nullified on import

    // ── Verify pages (parent/child + SEO) ──
    const importedPages = await db.page.findMany({
      where: { organizationId: newOrgId },
      orderBy: { title: "asc" },
    })
    // At least our 2 custom pages (system pages may also be created by ensureSystemPages)
    expect(importedPages.length).toBeGreaterThanOrEqual(2)
    const aboutPage = importedPages.find((p) => p.slug === "ueber-uns")!
    expect(aboutPage).toBeDefined()
    expect(aboutPage.seoTitle).toBe("Über die Liga")
    expect(aboutPage.seoDescription).toBe("Alles über unsere Liga.")

    const historyPage = importedPages.find((p) => p.slug === "geschichte")!
    expect(historyPage).toBeDefined()
    expect(historyPage.parentId).toBe(aboutPage.id) // remapped parent ID

    // ── Verify page aliases ──
    const importedAliases = await db.pageAlias.findMany({ where: { organizationId: newOrgId } })
    expect(importedAliases).toHaveLength(1)
    expect(importedAliases[0]!.slug).toBe("about")
    expect(importedAliases[0]!.targetPageId).toBe(aboutPage.id) // remapped

    // ── Verify documents ──
    const importedDocs = await db.document.findMany({ where: { organizationId: newOrgId } })
    expect(importedDocs).toHaveLength(1)
    expect(importedDocs[0]!.title).toBe("Spielordnung 2025/26")

    // ── Verify no ID collisions (all IDs are fresh) ──
    const sourceTeamIds = (await db.team.findMany({ where: { organizationId: TEST_ORG_ID } })).map((t) => t.id)
    const importedTeamIds = (await db.team.findMany({ where: { organizationId: newOrgId } })).map((t) => t.id)
    for (const id of importedTeamIds) {
      expect(sourceTeamIds).not.toContain(id)
    }
  }, 60_000) // generous timeout for full round-trip

  it("registry covers all org-scoped Prisma models", async () => {
    const { readFileSync } = await import("node:fs")
    const { resolve, dirname } = await import("node:path")
    const { fileURLToPath } = await import("node:url")
    const { parseOrgScopedModelsFromSchema, validateRegistryCompleteness } = await import(
      "../../services/leagueTransfer/registry"
    )

    const __dir = dirname(fileURLToPath(import.meta.url))
    const schemaPath = resolve(__dir, "../../../../db/prisma/schema.prisma")
    const schemaContent = readFileSync(schemaPath, "utf-8")
    const orgModels = parseOrgScopedModelsFromSchema(schemaContent)
    const result = validateRegistryCompleteness(orgModels)

    expect(result.missing, `Missing org-scoped models in registry: ${result.missing.join(", ")}`).toEqual([])
    expect(result.valid).toBe(true)
  })
})
