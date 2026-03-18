// ---------------------------------------------------------------------------
// Legacy MySQL → PuckHub CMS Migration
//
// Reads from legacy MariaDB (eal_local) and writes to PostgreSQL via Prisma.
// Two phases: analysis (read-only report) and migration (write).
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto"
import { copyFile, mkdir, stat } from "node:fs/promises"
import { basename, dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as mysql from "mysql2/promise"
import type { Database } from "../index"
import { recalculateStandings } from "../services/standingsService"
import { recalculateGoalieStats, recalculatePlayerStats } from "../services/statsService"
import type {
  LegacyBonusPoint,
  LegacyGame,
  LegacyGoalieStat,
  LegacyGroup,
  LegacyGroupName,
  LegacyNews,
  LegacyPlayer,
  LegacyPlayerTeam,
  LegacyReport,
  LegacySeason,
  LegacyTeam,
  LegacyTeamLineUp,
  LegacyTrikot,
} from "./legacyTypes"
import { PENALTY_ID_TO_CODE, PENALTY_ID_TO_NAME } from "./penaltyMapping"
import type { DivisionDef } from "./roundMapping"
import { getDivisionsForSeason, resolveGameRound } from "./roundMapping"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORG_ID = "eishockey-allgaeuliga"
const MYSQL_CONFIG = {
  host: process.env.LEGACY_MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT ?? 3306),
  user: process.env.LEGACY_MYSQL_USER ?? "eal_user",
  password: process.env.LEGACY_MYSQL_PASSWORD ?? "eal_password",
  database: process.env.LEGACY_MYSQL_DATABASE ?? "eal_local",
}

/** Chronological season order (legacy season IDs) */
const SEASON_ORDER = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 17, 16, 18, 19, 20, 21]

const BATCH_SIZE = 500

// packages/db/src/eal-migration/ → 4 levels up to monorepo root
const MONOREPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..")
const LEGACY_IMAGES_DIR = join(MONOREPO_ROOT, "_legacy", "src", "frontend", "imgs", "teams")
const UPLOAD_BASE = resolve(process.env.UPLOAD_DIR || join(MONOREPO_ROOT, "uploads"))

/**
 * Maps legacy team IDs to their team photo filenames in the legacy images dir.
 * These are team group photos (not logos). The DB `logo` column often just
 * references `logo_unknown.jpg`, so this mapping provides the actual photo files.
 */
const TEAM_ID_TO_PHOTO_FILE: Record<number, string> = {
  1: "tsv-dietmannsried-tigers.jpg",
  2: "cosmos.jpg",
  3: "allgeier.jpg",
  4: "greuter.jpg",
  5: "apfeltrang.jpg",
  6: "memmingen.jpg",
  7: "dachser.jpg",
  10: "oberguenzburg.jpg",
  12: "sv_29_kempten.jpg",
  16: "tsv_lengenwang.jpg",
  18: "castle_mountain.jpg",
  21: "elbsee.jpg",
  27: "piranhas.jpg",
}

// ---------------------------------------------------------------------------
// MySQL helpers
// ---------------------------------------------------------------------------

async function query<T>(conn: mysql.Connection, sql: string): Promise<T[]> {
  const [rows] = await conn.execute(sql)
  return rows as T[]
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

interface LegacyData {
  teams: LegacyTeam[]
  seasons: LegacySeason[]
  groups: LegacyGroup[]
  groupNames: LegacyGroupName[]
  players: LegacyPlayer[]
  playerTeams: LegacyPlayerTeam[]
  games: LegacyGame[]
  reports: LegacyReport[]
  goalieStats: LegacyGoalieStat[]
  bonusPoints: LegacyBonusPoint[]
  news: LegacyNews[]
  lineups: LegacyTeamLineUp[]
  trikots: LegacyTrikot[]
}

async function loadLegacyData(conn: mysql.Connection): Promise<LegacyData> {
  console.log("[legacy] Loading data from MySQL...")

  const [
    teams,
    seasons,
    groups,
    groupNames,
    players,
    playerTeams,
    games,
    reports,
    goalieStats,
    bonusPoints,
    news,
    lineups,
    trikots,
  ] = await Promise.all([
    query<LegacyTeam>(
      conn,
      "SELECT id, name, kontakt1, telefon1, email1, homepage, logo, shortname, active, trikot_1, trikot_2, trikot_3 FROM alTeams ORDER BY id",
    ),
    query<LegacySeason>(conn, "SELECT * FROM alSaison ORDER BY id"),
    query<LegacyGroup>(conn, "SELECT * FROM alGroups ORDER BY id"),
    query<LegacyGroupName>(conn, "SELECT * FROM alGroupnames ORDER BY id"),
    query<LegacyPlayer>(
      conn,
      "SELECT id, teamID, firstname, lastname, number, captain, assistant, status, posID, birthday, active FROM alPlayers ORDER BY id",
    ),
    query<LegacyPlayerTeam>(conn, "SELECT * FROM alPlayerTeam ORDER BY id"),
    query<LegacyGame>(
      conn,
      "SELECT id, team_home, team_guest, term, location, goals_home, goals_guest, decided, round, saisonID, game_nr FROM alGames ORDER BY id",
    ),
    query<LegacyReport>(conn, "SELECT * FROM alReport ORDER BY id"),
    query<LegacyGoalieStat>(conn, "SELECT * FROM alGoalieStatistic ORDER BY id"),
    query<LegacyBonusPoint>(conn, "SELECT * FROM alBonuspoints ORDER BY id"),
    query<LegacyNews>(conn, "SELECT * FROM alNews ORDER BY id"),
    query<LegacyTeamLineUp>(conn, "SELECT * FROM alTeamLineUp ORDER BY id"),
    query<LegacyTrikot>(conn, "SELECT * FROM alTrikots ORDER BY id"),
  ])

  console.log(
    `[legacy] Loaded: ${teams.length} teams, ${seasons.length} seasons, ${players.length} players, ${games.length} games, ${reports.length} report entries, ${goalieStats.length} goalie stats, ${trikots.length} trikots, ${news.length} news`,
  )

  return {
    teams,
    seasons,
    groups,
    groupNames,
    players,
    playerTeams,
    games,
    reports,
    goalieStats,
    bonusPoints,
    news,
    lineups,
    trikots,
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Analysis
// ---------------------------------------------------------------------------

export async function analyzeLegacy(conn: mysql.Connection): Promise<LegacyData> {
  const data = await loadLegacyData(conn)

  console.log("\n══════════════════════════════════════════════════════════")
  console.log(" LEGACY DATA ANALYSIS REPORT")
  console.log("══════════════════════════════════════════════════════════\n")

  // Season summary
  console.log("── Season Summary ──────────────────────────────────────")
  console.log("ID  | Name       | PM | L1Pre L1PO L1PD L2Pre L2PO L2PU Mix  | Teams | Games | Decided")
  console.log("────|────────────|────|──────────────────────────────────────|───────|───────|────────")
  for (const s of data.seasons) {
    const teamCount = new Set(data.groups.filter((g) => g.saisonID === s.id).map((g) => g.teamID)).size
    const seasonGames = data.games.filter((g) => g.saisonID === s.id)
    const decidedCount = seasonGames.filter((g) => g.decided === 1).length
    const flags = [
      s.hasLeague1Preround,
      s.hasLeague1Playoffs,
      s.hasLeague1Playdowns,
      s.hasLeague2Preround,
      s.hasLeague2Playoffs,
      s.hasLeague2Playups,
      s.hasMixedLeague,
    ]
      .map((f) => (f ? "✓" : "·"))
      .join("    ")
    console.log(
      `${String(s.id).padStart(3)} | ${s.text.padEnd(10)} | ${String(s.playmode_id).padStart(2)} | ${flags} | ${String(teamCount).padStart(5)} | ${String(seasonGames.length).padStart(5)} | ${String(decidedCount).padStart(5)}`,
    )
  }

  // Round distribution
  console.log("\n── Round Distribution ──────────────────────────────────")
  const roundDist = new Map<string, { games: number; decided: number; teams: Set<number> }>()
  for (const g of data.games) {
    const key = `${g.saisonID}:${g.round}`
    let entry = roundDist.get(key)
    if (!entry) {
      entry = { games: 0, decided: 0, teams: new Set() }
      roundDist.set(key, entry)
    }
    entry.games++
    if (g.decided === 1) entry.decided++
    entry.teams.add(g.team_home)
    entry.teams.add(g.team_guest)
  }
  console.log("Season | Round | Games | Decided | Teams")
  console.log("───────|───────|───────|─────────|──────")
  for (const [key, val] of [...roundDist.entries()].sort()) {
    const [sid, rid] = key.split(":")
    console.log(
      `${sid!.padStart(6)} | ${rid!.padStart(5)} | ${String(val.games).padStart(5)} | ${String(val.decided).padStart(7)} | ${val.teams.size}`,
    )
  }

  // Team-group assignments
  console.log("\n── Team-Group Assignments ──────────────────────────────")
  const teamMap = new Map(data.teams.map((t) => [t.id, t.name]))
  for (const s of data.seasons) {
    const seasonGroups = data.groups.filter((g) => g.saisonID === s.id)
    if (seasonGroups.length === 0) continue
    const byGroup = new Map<number, string[]>()
    for (const g of seasonGroups) {
      if (!byGroup.has(g.grpnameID)) byGroup.set(g.grpnameID, [])
      byGroup.get(g.grpnameID)!.push(teamMap.get(g.teamID) ?? `?${g.teamID}`)
    }
    const gnMap = new Map(data.groupNames.map((gn) => [gn.id, gn.name]))
    for (const [gnId, teams] of byGroup) {
      console.log(`  ${s.text} / ${gnMap.get(gnId) ?? `?${gnId}`}: ${teams.join(", ")}`)
    }
  }

  // Data quality warnings
  console.log("\n── Data Quality Warnings ───────────────────────────────")
  let warnings = 0

  // Orphaned game references
  const teamIds = new Set(data.teams.map((t) => t.id))
  const seasonIds = new Set(data.seasons.map((s) => s.id))
  for (const g of data.games) {
    if (!teamIds.has(g.team_home)) {
      console.log(`  WARN: Game ${g.id} references unknown home team ${g.team_home}`)
      warnings++
    }
    if (!teamIds.has(g.team_guest)) {
      console.log(`  WARN: Game ${g.id} references unknown away team ${g.team_guest}`)
      warnings++
    }
    if (!seasonIds.has(g.saisonID)) {
      console.log(`  WARN: Game ${g.id} references unknown season ${g.saisonID}`)
      warnings++
    }
  }

  // Orphaned report references
  const gameIds = new Set(data.games.map((g) => g.id))
  const playerIds = new Set(data.players.map((p) => p.id))
  for (const r of data.reports) {
    if (!gameIds.has(r.gameID)) {
      console.log(`  WARN: Report ${r.id} references unknown game ${r.gameID}`)
      warnings++
    }
    if (r.goal > 0 && !playerIds.has(r.goal)) {
      console.log(`  WARN: Report ${r.id} goal scorer ${r.goal} unknown`)
      warnings++
    }
    if (r.penalty > 0 && !playerIds.has(r.penalty)) {
      console.log(`  WARN: Report ${r.id} penalty player ${r.penalty} unknown`)
      warnings++
    }
  }

  // Unparseable birthdays
  for (const p of data.players) {
    if (p.birthday && !/^\d{2}\.\d{2}\.\d{4}$/.test(p.birthday)) {
      console.log(`  WARN: Player ${p.id} has unparseable birthday: "${p.birthday}"`)
      warnings++
    }
  }

  // Duplicate players (same first+last name)
  const nameCount = new Map<string, number[]>()
  for (const p of data.players) {
    const key = `${p.firstname.trim().toLowerCase()}|${p.lastname.trim().toLowerCase()}`
    if (!nameCount.has(key)) nameCount.set(key, [])
    nameCount.get(key)!.push(p.id)
  }
  for (const [name, ids] of nameCount) {
    if (ids.length > 1) {
      console.log(`  INFO: Possible duplicate players "${name}": IDs ${ids.join(", ")}`)
    }
  }

  // Phantom season references (seasons referenced in data tables but missing from alSaison)
  const phantomInPT = data.playerTeams.filter((pt) => !seasonIds.has(pt.saisonID))
  const phantomInGames = data.games.filter((g) => !seasonIds.has(g.saisonID))
  const phantomInGroups = data.groups.filter((g) => !seasonIds.has(g.saisonID))
  const phantomInLineups = data.lineups.filter((lu) => !seasonIds.has(lu.saisonID))
  if (
    phantomInPT.length > 0 ||
    phantomInGames.length > 0 ||
    phantomInGroups.length > 0 ||
    phantomInLineups.length > 0
  ) {
    const allPhantomIds = new Set([
      ...phantomInPT.map((pt) => pt.saisonID),
      ...phantomInGames.map((g) => g.saisonID),
      ...phantomInGroups.map((g) => g.saisonID),
      ...phantomInLineups.map((lu) => lu.saisonID),
    ])
    console.log(
      `  WARN: Phantom season IDs found (not in alSaison): ${[...allPhantomIds].sort((a, b) => a - b).join(", ")}`,
    )
    if (phantomInPT.length > 0) {
      const activePT = phantomInPT.filter((pt) => pt.active === 1)
      const affectedPlayers = new Set(activePT.map((pt) => pt.playersID))
      console.log(
        `  WARN:   alPlayerTeam: ${phantomInPT.length} rows (${activePT.length} active, ${affectedPlayers.size} players affected)`,
      )
      warnings += phantomInPT.length
    }
    if (phantomInGames.length > 0) {
      console.log(`  WARN:   alGames: ${phantomInGames.length} games`)
      warnings += phantomInGames.length
    }
    if (phantomInGroups.length > 0) {
      console.log(`  WARN:   alGroups: ${phantomInGroups.length} group entries`)
      warnings += phantomInGroups.length
    }
    if (phantomInLineups.length > 0) {
      console.log(`  WARN:   alTeamLineUp: ${phantomInLineups.length} lineup entries`)
      warnings += phantomInLineups.length
    }
  }

  // Players with active roster entries but no valid contract seasons
  const validPTSeasons = new Set(data.seasons.map((s) => s.id))
  const playersWithOnlyPhantom = new Set<number>()
  const playerTeamsByPlayer = new Map<number, { valid: number[]; phantom: number[]; teamId: number }>()
  for (const pt of data.playerTeams.filter((pt) => pt.active === 1)) {
    const key = pt.playersID
    if (!playerTeamsByPlayer.has(key)) playerTeamsByPlayer.set(key, { valid: [], phantom: [], teamId: pt.teamsID })
    const entry = playerTeamsByPlayer.get(key)!
    if (validPTSeasons.has(pt.saisonID)) {
      entry.valid.push(pt.saisonID)
    } else {
      entry.phantom.push(pt.saisonID)
    }
  }
  const playerMap = new Map(data.players.map((p) => [p.id, p]))
  const _teamNameMap = new Map(data.teams.map((t) => [t.id, t.name]))
  for (const [playerId, entry] of playerTeamsByPlayer) {
    if (entry.valid.length === 0 && entry.phantom.length > 0) {
      playersWithOnlyPhantom.add(playerId)
      const player = playerMap.get(playerId)
      if (player) {
        console.log(
          `  WARN: Player ${player.firstname} ${player.lastname} (${playerId}) has ONLY phantom-season roster entries (${entry.phantom.join(", ")}) — will get NO contracts`,
        )
      }
      warnings++
    }
  }

  console.log(`  Total warnings: ${warnings}`)

  // Migration preview
  console.log("\n── Migration Preview ───────────────────────────────────")
  let totalDivisions = 0
  let totalRounds = 0
  for (const s of data.seasons) {
    const divs = getDivisionsForSeason(s)
    totalDivisions += divs.length
    for (const d of divs) totalRounds += d.rounds.length
  }

  // Contract consolidation preview (filter phantom seasons, same as migration step 8)
  const activePlayerTeams = data.playerTeams.filter((pt) => pt.active === 1 && validPTSeasons.has(pt.saisonID))
  const ptByPlayerTeam = new Map<string, number[]>()
  for (const pt of activePlayerTeams) {
    const key = `${pt.playersID}:${pt.teamsID}`
    if (!ptByPlayerTeam.has(key)) ptByPlayerTeam.set(key, [])
    ptByPlayerTeam.get(key)!.push(pt.saisonID)
  }
  let contractCount = 0
  for (const [, seasonIdList] of ptByPlayerTeam) {
    const sorted = seasonIdList.sort((a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b))
    let contracts = 1
    for (let i = 1; i < sorted.length; i++) {
      const prevIdx = SEASON_ORDER.indexOf(sorted[i - 1]!)
      const curIdx = SEASON_ORDER.indexOf(sorted[i]!)
      if (curIdx !== prevIdx + 1) contracts++
    }
    contractCount += contracts
  }

  const goalEvents = data.reports.filter((r) => r.goal > 0)
  const penaltyEvents = data.reports.filter((r) => r.penalty > 0)
  const goalieStatsForMigration = data.goalieStats.filter((gs) => gs.statistic === 1)
  const decidedGames = data.games.filter((g) => g.decided === 1)

  console.log(`  Organization: 1`)
  console.log(`  Teams: ${data.teams.length}`)
  console.log(`  Seasons: ${data.seasons.length}`)
  console.log(`  Divisions: ${totalDivisions}`)
  console.log(`  Rounds: ${totalRounds}`)
  console.log(`  Players: ${data.players.length}`)
  console.log(`  Contracts: ~${contractCount} (from ${activePlayerTeams.length} player-team-season rows)`)
  console.log(`  Games: ${decidedGames.length} completed (${data.games.length} total)`)
  console.log(`  Goal events: ${goalEvents.length}`)
  console.log(`  Penalty events: ${penaltyEvents.length}`)
  console.log(`  Goalie game stats: ${goalieStatsForMigration.length}`)
  console.log(`  Bonus points: ${data.bonusPoints.length}`)
  console.log(
    `  Trikots: ${data.trikots.filter((t) => t.id !== 3 && (t.template_id === 1 || t.template_id === 2)).length} (from ${data.trikots.length} total, skipping placeholder)`,
  )
  console.log(`  News articles: ${data.news.length}`)
  console.log(`  Game lineups: ${data.lineups.length}`)

  console.log("\n══════════════════════════════════════════════════════════\n")

  return data
}

// ---------------------------------------------------------------------------
// Phase 2: Migration
// ---------------------------------------------------------------------------

export async function migrateLegacy(db: Database, conn: mysql.Connection): Promise<void> {
  const data = await analyzeLegacy(conn)

  console.log("Starting migration...\n")

  // ── Step 0: Clean existing org (idempotent) ──────────────────────────
  console.log("[step 0] Deleting existing organization (if any)...")
  await db.organization.deleteMany({ where: { id: ORG_ID } })

  // ── Step 1: Organization + SystemSettings ────────────────────────────
  console.log("[step 1] Creating organization + system settings...")
  await db.organization.create({
    data: { id: ORG_ID, name: "Eishockey Allgäuliga", slug: "eishockey-allgaeuliga" },
  })

  // Assign Professional plan
  const proPlan = await db.plan.findUnique({ where: { slug: "professional" } })
  if (proPlan) {
    const now = new Date()
    const oneYearLater = new Date(now)
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
    await db.orgSubscription.create({
      data: {
        organizationId: ORG_ID,
        planId: proPlan.id,
        interval: "yearly",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: oneYearLater,
      },
    })
    console.log("[step 1]   → Assigned Professional plan")
  } else {
    console.log("[step 1]   ⚠ Professional plan not found — run db:seed first")
  }

  await db.systemSettings.create({
    data: {
      organizationId: ORG_ID,
      leagueName: "Eishockey Allgäuliga",
      leagueShortName: "EAL",
      locale: "de-DE",
      timezone: "Europe/Berlin",
      pointsWin: 2,
      pointsDraw: 1,
      pointsLoss: 0,
    },
  })

  // Create website config (subdomain derived from organization.slug)
  await db.websiteConfig.create({
    data: {
      organizationId: ORG_ID,
      isActive: true,
      templatePreset: "classic",
    },
  })
  console.log("[step 1]   → Created website config")

  // ── Step 2: PenaltyTypes ─────────────────────────────────────────────
  console.log("[step 2] Ensuring penalty types exist...")
  await db.penaltyType.createMany({
    data: [
      { code: "MINOR", name: "Kleine Strafe", shortName: "2min", defaultMinutes: 2 },
      { code: "DOUBLE_MINOR", name: "Doppelte Kleine Strafe", shortName: "2+2min", defaultMinutes: 4 },
      { code: "MAJOR", name: "Große Strafe", shortName: "5min", defaultMinutes: 5 },
      { code: "MISCONDUCT", name: "Disziplinarstrafe", shortName: "10min", defaultMinutes: 10 },
      { code: "GAME_MISCONDUCT", name: "Spieldauer-Disziplinarstrafe", shortName: "SD", defaultMinutes: 20 },
      { code: "MATCH_PENALTY", name: "Matchstrafe", shortName: "MS", defaultMinutes: 25 },
    ],
    skipDuplicates: true,
  })
  const penaltyTypes = await db.penaltyType.findMany()
  const penaltyTypeByCode = new Map(penaltyTypes.map((pt) => [pt.code, pt]))

  // ── Step 3: Teams ────────────────────────────────────────────────────
  console.log(`[step 3] Creating ${data.teams.length} teams...`)
  const teamUuidMap = new Map<number, string>() // legacyId → UUID
  const insertedTeams = await db.team.createManyAndReturn({
    data: data.teams.map((t) => ({
      organizationId: ORG_ID,
      name: t.name,
      shortName: t.shortname || t.name.substring(0, 3).toUpperCase(),
      contactName: t.kontakt1 || undefined,
      contactEmail: t.email1 || undefined,
      contactPhone: t.telefon1 || undefined,
      website: t.homepage ? (t.homepage.match(/^https?:\/\//) ? t.homepage : `http://${t.homepage}`) : undefined,
    })),
  })
  data.teams.forEach((t, i) => {
    teamUuidMap.set(t.id, insertedTeams[i]!.id)
  })

  // ── Step 3a: Team images (logos + photos) ─────────────────────────────
  console.log("[step 3a] Migrating team logos and photos...")
  let logoCount = 0
  let photoCount = 0

  const legacyImagesExist = await stat(LEGACY_IMAGES_DIR)
    .then(() => true)
    .catch(() => false)

  if (!legacyImagesExist) {
    console.log(`[step 3a]   ⚠ Legacy images directory not found: ${LEGACY_IMAGES_DIR}`)
  } else {
    const logosDir = join(UPLOAD_BASE, ORG_ID, "logos")
    const photosDir = join(UPLOAD_BASE, ORG_ID, "photos")
    await mkdir(logosDir, { recursive: true })
    await mkdir(photosDir, { recursive: true })

    for (const team of data.teams) {
      const teamUuid = teamUuidMap.get(team.id)
      if (!teamUuid) continue

      let logoUrl: string | null = null
      let teamPhotoUrl: string | null = null

      // --- Logo: only use files with "_logo" in the name from the DB column ---
      // (e.g. piranhas_logo.jpg, sauriers_logo.jpg, niedersonthofen_logo.gif)
      if (team.logo && team.logo !== "") {
        const logoFilename = basename(team.logo)
        if (logoFilename.includes("_logo") && logoFilename !== "logo_unknown.jpg") {
          const logoByCol = join(LEGACY_IMAGES_DIR, logoFilename)
          const logoByColExists = await stat(logoByCol)
            .then(() => true)
            .catch(() => false)
          if (logoByColExists) {
            const ext = extname(logoByCol).toLowerCase()
            const newFilename = `${randomUUID()}${ext}`
            await copyFile(logoByCol, join(logosDir, newFilename))
            logoUrl = `/api/uploads/${ORG_ID}/logos/${newFilename}`
            logoCount++
          }
        }
      }

      // --- Team photo: teambild_<id>.jpg, teamlogo_<id>.jpg, or name-based photo ---
      const photoSources = [
        join(LEGACY_IMAGES_DIR, `teambild_${team.id}.jpg`),
        join(LEGACY_IMAGES_DIR, `teamlogo_${team.id}.jpg`),
        ...(TEAM_ID_TO_PHOTO_FILE[team.id] ? [join(LEGACY_IMAGES_DIR, TEAM_ID_TO_PHOTO_FILE[team.id]!)] : []),
      ]
      for (const photoPath of photoSources) {
        const photoExists = await stat(photoPath)
          .then(() => true)
          .catch(() => false)
        if (photoExists) {
          const newFilename = `${randomUUID()}.jpg`
          await copyFile(photoPath, join(photosDir, newFilename))
          teamPhotoUrl = `/api/uploads/${ORG_ID}/photos/${newFilename}`
          photoCount++
          break
        }
      }

      // Update team record if we found any images
      if (logoUrl || teamPhotoUrl) {
        await db.team.update({
          where: { id: teamUuid },
          data: {
            ...(logoUrl ? { logoUrl } : {}),
            ...(teamPhotoUrl ? { teamPhotoUrl } : {}),
          },
        })
      }
    }
  }
  console.log(`[step 3a]   → ${logoCount} logos, ${photoCount} team photos migrated`)

  // ── Step 3b: Trikots + TeamTrikots ──────────────────────────────────
  console.log("[step 3b] Creating trikots and team-trikot assignments...")

  // Look up existing TrikotTemplate records (seeded by db:seed)
  const trikotTemplates = await db.trikotTemplate.findMany()
  const templateByType = new Map(trikotTemplates.map((t) => [t.templateType, t]))
  const oneColorTemplate = templateByType.get("one_color")
  const twoColorTemplate = templateByType.get("two_color")

  if (!oneColorTemplate || !twoColorTemplate) {
    console.log("[step 3b]    ⚠ TrikotTemplates not found — run db:seed first. Skipping trikots.")
  } else {
    // Create Trikot records (skip id=3 which is a placeholder with template_id=0)
    const trikotUuidMap = new Map<number, string>() // legacy trikot ID → new UUID
    const validTrikots = data.trikots.filter((t) => t.id !== 3 && (t.template_id === 1 || t.template_id === 2))

    if (validTrikots.length > 0) {
      const insertedTrikots = await db.trikot.createManyAndReturn({
        data: validTrikots.map((t) => ({
          organizationId: ORG_ID,
          name: t.name,
          templateId: t.template_id === 1 ? oneColorTemplate.id : twoColorTemplate.id,
          primaryColor: t.color_brust || "#000000",
          secondaryColor: t.template_id === 2 && t.color_schulter ? t.color_schulter : null,
        })),
      })
      validTrikots.forEach((t, i) => {
        trikotUuidMap.set(t.id, insertedTrikots[i]!.id)
      })
    }
    console.log(`[step 3b]   → ${trikotUuidMap.size} trikots created`)

    // Create TeamTrikot assignments
    const teamTrikotValues: Array<{ organizationId: string; teamId: string; trikotId: string; name: string }> = []

    for (const team of data.teams) {
      const teamUuid = teamUuidMap.get(team.id)
      if (!teamUuid) continue

      const assignments: Array<{ legacyTrikotId: number | null; name: string }> = [
        { legacyTrikotId: team.trikot_1, name: "Heim" },
        { legacyTrikotId: team.trikot_2, name: "Auswärts" },
        { legacyTrikotId: team.trikot_3, name: "Alternativ" },
      ]

      for (const { legacyTrikotId, name } of assignments) {
        if (!legacyTrikotId) continue
        const trikotUuid = trikotUuidMap.get(legacyTrikotId)
        if (!trikotUuid) continue
        teamTrikotValues.push({ organizationId: ORG_ID, teamId: teamUuid, trikotId: trikotUuid, name })
      }
    }

    if (teamTrikotValues.length > 0) {
      await db.teamTrikot.createMany({ data: teamTrikotValues, skipDuplicates: true })
    }
    console.log(`[step 3b]   → ${teamTrikotValues.length} team-trikot assignments`)
  }

  // ── Step 4: Seasons ──────────────────────────────────────────────────
  console.log(`[step 4] Creating ${data.seasons.length} seasons...`)
  const seasonUuidMap = new Map<number, string>()
  const insertedSeasons = await db.season.createManyAndReturn({
    data: data.seasons.map((s) => {
      const { start, end } = parseSeasonDates(s.saison)
      return {
        organizationId: ORG_ID,
        name: s.text,
        seasonStart: start,
        seasonEnd: end,
      }
    }),
  })
  data.seasons.forEach((s, i) => {
    seasonUuidMap.set(s.id, insertedSeasons[i]!.id)
  })

  // ── Step 5: Divisions + Rounds ───────────────────────────────────────
  console.log("[step 5] Creating divisions and rounds...")
  // Store the division defs per season for later game mapping
  const seasonDivisionDefs = new Map<number, DivisionDef[]>()
  const divisionUuidMap = new Map<string, string>() // "seasonLegacyId:divIndex" → UUID
  const roundUuidMap = new Map<string, string>() // "seasonLegacyId:divIndex:roundIndex" → UUID

  for (const s of data.seasons) {
    const divDefs = getDivisionsForSeason(s)
    seasonDivisionDefs.set(s.id, divDefs)

    const seasonUuid = seasonUuidMap.get(s.id)!
    for (let di = 0; di < divDefs.length; di++) {
      const divDef = divDefs[di]!
      const division = await db.division.create({
        data: {
          organizationId: ORG_ID,
          seasonId: seasonUuid,
          name: divDef.name,
          sortOrder: divDef.sortOrder,
          goalieMinGames: 3,
        },
      })
      divisionUuidMap.set(`${s.id}:${di}`, division.id)

      for (let ri = 0; ri < divDef.rounds.length; ri++) {
        const roundDef = divDef.rounds[ri]!
        const round = await db.round.create({
          data: {
            organizationId: ORG_ID,
            divisionId: division.id,
            name: roundDef.name,
            roundType: roundDef.roundType,
            sortOrder: roundDef.sortOrder,
            countsForPlayerStats: roundDef.countsForPlayerStats,
            countsForGoalieStats: roundDef.countsForGoalieStats,
          },
        })
        roundUuidMap.set(`${s.id}:${di}:${ri}`, round.id)
      }
    }
  }

  // Collect all round UUIDs for later
  const allRoundUuids = [...roundUuidMap.values()]
  console.log(`[step 5]    → ${divisionUuidMap.size} divisions, ${allRoundUuids.length} rounds`)

  // ── Step 6: TeamDivision ─────────────────────────────────────────────
  console.log("[step 6] Creating team-division assignments...")
  const tdValues: Array<{ organizationId: string; teamId: string; divisionId: string }> = []

  for (const s of data.seasons) {
    const divDefs = seasonDivisionDefs.get(s.id)!
    const seasonGroups = data.groups.filter((g) => g.saisonID === s.id)

    for (let di = 0; di < divDefs.length; di++) {
      const divDef = divDefs[di]!
      const divUuid = divisionUuidMap.get(`${s.id}:${di}`)!
      let assignedTeamIds: number[]

      if (divDef.allTeams) {
        // All teams in the season
        assignedTeamIds = [...new Set(seasonGroups.map((g) => g.teamID))]
      } else if (divDef.grpnameIds) {
        assignedTeamIds = seasonGroups.filter((g) => divDef.grpnameIds!.includes(g.grpnameID)).map((g) => g.teamID)
      } else {
        assignedTeamIds = []
      }

      for (const legacyTeamId of [...new Set(assignedTeamIds)]) {
        const teamUuid = teamUuidMap.get(legacyTeamId)
        if (!teamUuid) continue
        tdValues.push({ organizationId: ORG_ID, teamId: teamUuid, divisionId: divUuid })
      }
    }
  }

  for (let i = 0; i < tdValues.length; i += BATCH_SIZE) {
    await db.teamDivision.createMany({ data: tdValues.slice(i, i + BATCH_SIZE) })
  }
  console.log(`[step 6]    → ${tdValues.length} team-division assignments`)

  // ── Step 7: Players ──────────────────────────────────────────────────
  console.log(`[step 7] Creating ${data.players.length} players...`)
  const playerUuidMap = new Map<number, string>()
  const insertedPlayers = await db.player.createManyAndReturn({
    data: data.players.map((p) => ({
      organizationId: ORG_ID,
      firstName: p.firstname.trim(),
      lastName: p.lastname.trim(),
      dateOfBirth: parseLegacyDate(p.birthday),
    })),
  })
  data.players.forEach((p, i) => {
    playerUuidMap.set(p.id, insertedPlayers[i]!.id)
  })

  // ── Step 8: Contracts (consolidated) ─────────────────────────────────
  console.log("[step 8] Creating contracts (consolidated)...")

  // Filter out playerTeam entries referencing non-existent seasons (phantom seasons).
  // The legacy DB has season IDs (e.g. 14, 15) in alPlayerTeam/alGroups that were
  // deleted from alSaison. Including them breaks contract consolidation because
  // SEASON_ORDER.indexOf() returns -1, corrupting the sort and causing entire
  // contracts to be silently dropped.
  const validSeasonIds = new Set(data.seasons.map((s) => s.id))
  const phantomSeasonPT = data.playerTeams.filter((pt) => pt.active === 1 && !validSeasonIds.has(pt.saisonID))
  if (phantomSeasonPT.length > 0) {
    const phantomSeasons = [...new Set(phantomSeasonPT.map((pt) => pt.saisonID))].sort((a, b) => a - b)
    const affectedPlayers = new Set(phantomSeasonPT.map((pt) => pt.playersID))
    console.log(
      `[step 8]   ⚠ WARNING: ${phantomSeasonPT.length} active playerTeam entries reference non-existent seasons: ${phantomSeasons.join(", ")}`,
    )
    console.log(`[step 8]   ⚠ ${affectedPlayers.size} players affected — these phantom season entries will be skipped`)
    // Print details for the first few affected players
    const playerMap = new Map(data.players.map((p) => [p.id, p]))
    const teamNameMap = new Map(data.teams.map((t) => [t.id, t.name]))
    const printed = new Set<number>()
    for (const pt of phantomSeasonPT) {
      if (printed.size >= 15) break
      if (printed.has(pt.playersID)) continue
      printed.add(pt.playersID)
      const player = playerMap.get(pt.playersID)
      const teamName = teamNameMap.get(pt.teamsID)
      if (player) {
        const phantomForPlayer = phantomSeasonPT
          .filter((p) => p.playersID === pt.playersID)
          .map((p) => `s${p.saisonID}`)
          .join(", ")
        console.log(
          `[step 8]     → ${player.firstname} ${player.lastname} (team: ${teamName ?? pt.teamsID}): phantom seasons ${phantomForPlayer}`,
        )
      }
    }
    if (affectedPlayers.size > 15) {
      console.log(`[step 8]     → ... and ${affectedPlayers.size - 15} more players`)
    }
  }

  const activePlayerTeams = data.playerTeams.filter((pt) => pt.active === 1 && validSeasonIds.has(pt.saisonID))
  const ptByPlayerTeam = new Map<string, number[]>()
  for (const pt of activePlayerTeams) {
    const key = `${pt.playersID}:${pt.teamsID}`
    if (!ptByPlayerTeam.has(key)) ptByPlayerTeam.set(key, [])
    ptByPlayerTeam.get(key)!.push(pt.saisonID)
  }

  // Build player position map from legacy data
  const playerPositionMap = new Map<number, string>()
  for (const p of data.players) {
    playerPositionMap.set(p.id, legacyPosToPosition(p.posID))
  }

  // Build player jersey number map (latest)
  const playerJerseyMap = new Map<number, number>()
  for (const p of data.players) {
    if (p.number > 0) playerJerseyMap.set(p.id, p.number)
  }

  const contractValues: Array<{
    organizationId: string
    playerId: string
    teamId: string
    position: "forward" | "defense" | "goalie"
    jerseyNumber?: number
    startSeasonId: string
    endSeasonId?: string
  }> = []

  const latestSeasonId = data.seasons.length > 0 ? SEASON_ORDER[SEASON_ORDER.length - 1]! : undefined

  for (const [key, seasonIdList] of ptByPlayerTeam) {
    const [playerIdStr, teamIdStr] = key.split(":")
    const legacyPlayerId = Number(playerIdStr)
    const legacyTeamId = Number(teamIdStr)
    const playerUuid = playerUuidMap.get(legacyPlayerId)
    const teamUuid = teamUuidMap.get(legacyTeamId)
    if (!playerUuid || !teamUuid) continue

    const position = playerPositionMap.get(legacyPlayerId) ?? "forward"
    const jerseyNumber = playerJerseyMap.get(legacyPlayerId)

    // Sort by chronological order
    const sorted = seasonIdList.sort((a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b))

    // Consolidate consecutive seasons into single contracts
    let contractStart = sorted[0]!
    let contractEnd = sorted[0]!

    for (let i = 1; i < sorted.length; i++) {
      const prevIdx = SEASON_ORDER.indexOf(contractEnd)
      const curIdx = SEASON_ORDER.indexOf(sorted[i]!)
      if (curIdx === prevIdx + 1) {
        // Consecutive — extend
        contractEnd = sorted[i]!
      } else {
        // Gap — emit contract and start new one
        const startUuid = seasonUuidMap.get(contractStart)
        const endUuid = seasonUuidMap.get(contractEnd)
        if (startUuid) {
          contractValues.push({
            organizationId: ORG_ID,
            playerId: playerUuid,
            teamId: teamUuid,
            position: position as "forward" | "defense" | "goalie",
            jerseyNumber,
            startSeasonId: startUuid,
            endSeasonId: endUuid,
          })
        }
        contractStart = sorted[i]!
        contractEnd = sorted[i]!
      }
    }

    // Emit final contract
    const startUuid = seasonUuidMap.get(contractStart)
    if (startUuid) {
      const isOngoing = contractEnd === latestSeasonId
      const endUuid = isOngoing ? undefined : seasonUuidMap.get(contractEnd)
      contractValues.push({
        organizationId: ORG_ID,
        playerId: playerUuid,
        teamId: teamUuid,
        position: position as "forward" | "defense" | "goalie",
        jerseyNumber,
        startSeasonId: startUuid,
        endSeasonId: endUuid,
      })
    }
  }

  for (let i = 0; i < contractValues.length; i += BATCH_SIZE) {
    await db.contract.createMany({ data: contractValues.slice(i, i + BATCH_SIZE) })
  }
  console.log(`[step 8]    → ${contractValues.length} contracts`)

  // ── Step 9: Games ────────────────────────────────────────────────────
  console.log(`[step 9] Creating games...`)
  const gameUuidMap = new Map<number, string>()
  const gameValues: Array<any> = []
  let unmappedGames = 0

  for (const g of data.games) {
    const homeTeamUuid = teamUuidMap.get(g.team_home)
    const awayTeamUuid = teamUuidMap.get(g.team_guest)
    if (!homeTeamUuid || !awayTeamUuid) continue

    const divDefs = seasonDivisionDefs.get(g.saisonID)
    if (!divDefs) continue

    const mapping = resolveGameRound(g.round, g.saisonID, g.team_home, divDefs, data.groups)
    if (!mapping) {
      unmappedGames++
      continue
    }

    const roundUuid = roundUuidMap.get(`${g.saisonID}:${mapping.divisionIndex}:${mapping.roundIndex}`)
    if (!roundUuid) {
      unmappedGames++
      continue
    }

    const isCompleted = g.decided === 1
    gameValues.push({
      organizationId: ORG_ID,
      roundId: roundUuid,
      homeTeamId: homeTeamUuid,
      awayTeamId: awayTeamUuid,
      scheduledAt: g.term,
      location: g.location || null,
      status: isCompleted ? "completed" : "scheduled",
      homeScore: isCompleted ? (g.goals_home ?? 0) : null,
      awayScore: isCompleted ? (g.goals_guest ?? 0) : null,
      gameNumber: g.game_nr,
      finalizedAt: isCompleted ? g.term : null,
      _legacyId: g.id, // temporarily stored for mapping, stripped before insert
    })
  }

  // Insert in batches and track UUIDs
  const insertBatches: Array<any[]> = []
  for (let i = 0; i < gameValues.length; i += BATCH_SIZE) {
    insertBatches.push(gameValues.slice(i, i + BATCH_SIZE))
  }

  for (const batch of insertBatches) {
    const cleanBatch = batch.map(({ _legacyId, ...rest }) => rest)
    const inserted = await db.game.createManyAndReturn({ data: cleanBatch })
    batch.forEach((orig, idx) => {
      gameUuidMap.set(orig._legacyId, inserted[idx]!.id)
    })
  }

  if (unmappedGames > 0) {
    console.log(`[step 9]    ⚠ ${unmappedGames} games could not be mapped to a round`)
  }
  console.log(`[step 9]    → ${gameUuidMap.size} games created`)

  // ── Step 9b: Derive team homeVenue from most frequent home game location
  console.log("[step 9b] Deriving team homeVenue from game locations...")
  const homeLocationsByTeam = new Map<number, Map<string, number>>()
  for (const g of data.games) {
    if (!g.location) continue
    if (!homeLocationsByTeam.has(g.team_home)) homeLocationsByTeam.set(g.team_home, new Map())
    const counts = homeLocationsByTeam.get(g.team_home)!
    counts.set(g.location, (counts.get(g.location) ?? 0) + 1)
  }
  let homeVenueCount = 0
  for (const [legacyTeamId, counts] of homeLocationsByTeam) {
    const teamUuid = teamUuidMap.get(legacyTeamId)
    if (!teamUuid) continue
    const mostFrequent = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (mostFrequent) {
      await db.team.update({ where: { id: teamUuid }, data: { homeVenue: mostFrequent[0] } })
      homeVenueCount++
    }
  }
  console.log(`[step 9b]   → ${homeVenueCount} teams updated with homeVenue`)

  // ── Step 10: Goal events ─────────────────────────────────────────────
  console.log("[step 10] Creating goal events...")
  const goalReports = data.reports.filter((r) => r.goal > 0)
  const goalEventValues: Array<any> = []

  for (const r of goalReports) {
    const gameUuid = gameUuidMap.get(r.gameID)
    if (!gameUuid) continue

    const teamUuid = teamUuidMap.get(r.teamID)
    if (!teamUuid) continue

    const scorerUuid = playerUuidMap.get(r.goal)
    if (!scorerUuid) continue

    const assist1Uuid = r.assist > 0 ? (playerUuidMap.get(r.assist) ?? null) : null
    const period = derivePeriod(r.playminute)

    goalEventValues.push({
      organizationId: ORG_ID,
      gameId: gameUuid,
      eventType: "goal" as const,
      teamId: teamUuid,
      period,
      timeMinutes: r.playminute,
      timeSeconds: r.playsecond,
      scorerId: scorerUuid,
      assist1Id: assist1Uuid,
    })
  }

  for (let i = 0; i < goalEventValues.length; i += BATCH_SIZE) {
    await db.gameEvent.createMany({ data: goalEventValues.slice(i, i + BATCH_SIZE) })
  }
  console.log(`[step 10]   → ${goalEventValues.length} goal events`)

  // ── Step 11: Penalty events ──────────────────────────────────────────
  console.log("[step 11] Creating penalty events...")
  const penaltyReports = data.reports.filter((r) => r.penalty > 0)
  const penaltyEventValues: Array<any> = []

  for (const r of penaltyReports) {
    const gameUuid = gameUuidMap.get(r.gameID)
    if (!gameUuid) continue

    const teamUuid = teamUuidMap.get(r.teamID)
    if (!teamUuid) continue

    const penaltyPlayerUuid = playerUuidMap.get(r.penalty)
    if (!penaltyPlayerUuid) continue

    const penaltyCode = PENALTY_ID_TO_CODE[r.penaltyID] ?? "MINOR"
    const penaltyType = penaltyTypeByCode.get(penaltyCode)
    const penaltyName = PENALTY_ID_TO_NAME[r.penaltyID] ?? "Unbekannt"
    const period = derivePeriod(r.playminute)

    penaltyEventValues.push({
      organizationId: ORG_ID,
      gameId: gameUuid,
      eventType: "penalty" as const,
      teamId: teamUuid,
      period,
      timeMinutes: r.playminute,
      timeSeconds: r.playsecond,
      penaltyPlayerId: penaltyPlayerUuid,
      penaltyTypeId: penaltyType?.id ?? null,
      penaltyMinutes: r.penaltytime || (penaltyType?.defaultMinutes ?? 2),
      penaltyDescription: penaltyName,
    })
  }

  for (let i = 0; i < penaltyEventValues.length; i += BATCH_SIZE) {
    await db.gameEvent.createMany({ data: penaltyEventValues.slice(i, i + BATCH_SIZE) })
  }
  console.log(`[step 11]   → ${penaltyEventValues.length} penalty events`)

  // ── Step 12: GoalieGameStat ──────────────────────────────────────────
  console.log("[step 12] Creating goalie game stats...")
  const goalieStatsForMigration = data.goalieStats.filter((gs) => gs.statistic === 1)
  const goalieGameStatValues: Array<any> = []

  for (const gs of goalieStatsForMigration) {
    const gameUuid = gameUuidMap.get(gs.gameID)
    if (!gameUuid) continue

    const playerUuid = playerUuidMap.get(gs.playerID)
    if (!playerUuid) continue

    const teamUuid = teamUuidMap.get(gs.teamID)
    if (!teamUuid) continue

    goalieGameStatValues.push({
      organizationId: ORG_ID,
      gameId: gameUuid,
      playerId: playerUuid,
      teamId: teamUuid,
      goalsAgainst: gs.received_goals,
    })
  }

  for (let i = 0; i < goalieGameStatValues.length; i += BATCH_SIZE) {
    await db.goalieGameStat.createMany({ data: goalieGameStatValues.slice(i, i + BATCH_SIZE) })
  }
  console.log(`[step 12]   → ${goalieGameStatValues.length} goalie game stats`)

  // ── Step 12b: Game Lineups ────────────────────────────────────────────
  console.log("[step 12b] Creating game lineups...")
  const lineupValues: Array<{
    organizationId: string
    gameId: string
    playerId: string
    teamId: string
    position: "forward" | "defense" | "goalie"
    jerseyNumber: number | null
    isStartingGoalie: boolean
  }> = []
  const seenLineupKeys = new Set<string>() // enforce unique gameId+playerId
  let skippedLineups = 0

  for (const lu of data.lineups) {
    const gameUuid = gameUuidMap.get(lu.gameID)
    if (!gameUuid) {
      skippedLineups++
      continue
    }

    const playerUuid = playerUuidMap.get(lu.playerID)
    if (!playerUuid) {
      skippedLineups++
      continue
    }

    const teamUuid = teamUuidMap.get(lu.teamID)
    if (!teamUuid) {
      skippedLineups++
      continue
    }

    // Deduplicate: schema has @@unique([gameId, playerId])
    const uniqueKey = `${gameUuid}:${playerUuid}`
    if (seenLineupKeys.has(uniqueKey)) {
      skippedLineups++
      continue
    }
    seenLineupKeys.add(uniqueKey)

    const position = (playerPositionMap.get(lu.playerID) ?? "forward") as "forward" | "defense" | "goalie"
    const jerseyNumber = playerJerseyMap.get(lu.playerID) ?? null

    lineupValues.push({
      organizationId: ORG_ID,
      gameId: gameUuid,
      playerId: playerUuid,
      teamId: teamUuid,
      position,
      jerseyNumber,
      isStartingGoalie: false,
    })
  }

  for (let i = 0; i < lineupValues.length; i += BATCH_SIZE) {
    await db.gameLineup.createMany({ data: lineupValues.slice(i, i + BATCH_SIZE) })
  }
  if (skippedLineups > 0) {
    console.log(`[step 12b]  ⚠ ${skippedLineups} lineup entries skipped (orphaned refs or duplicates)`)
  }
  console.log(`[step 12b]  → ${lineupValues.length} game lineups created`)

  // ── Step 13: BonusPoints ─────────────────────────────────────────────
  console.log("[step 13] Creating bonus points...")
  const bonusValues: Array<any> = []

  for (const bp of data.bonusPoints) {
    const teamUuid = teamUuidMap.get(bp.teamID)
    if (!teamUuid) continue

    // Legacy has no round — assign to first round in team's division for this season
    const divDefs = seasonDivisionDefs.get(bp.saisonID)
    if (!divDefs) continue

    // Find which division this team belongs to
    const seasonGroups = data.groups.filter((g) => g.saisonID === bp.saisonID && g.teamID === bp.teamID)
    const teamGrpNames = seasonGroups.map((g) => g.grpnameID)

    let roundUuid: string | null = null
    for (let di = 0; di < divDefs.length; di++) {
      const divDef = divDefs[di]!
      let belongs = false
      if (divDef.allTeams) {
        belongs = true
      } else if (divDef.grpnameIds) {
        belongs = teamGrpNames.some((g) => divDef.grpnameIds!.includes(g))
      }
      if (belongs && divDef.rounds.length > 0) {
        roundUuid = roundUuidMap.get(`${bp.saisonID}:${di}:0`)!
        break
      }
    }

    if (!roundUuid) continue

    bonusValues.push({
      organizationId: ORG_ID,
      teamId: teamUuid,
      roundId: roundUuid,
      points: bp.bonuspoints,
      reason: "Legacy-Bonuspunkte",
    })
  }

  if (bonusValues.length > 0) {
    await db.bonusPoint.createMany({ data: bonusValues })
  }
  console.log(`[step 13]   → ${bonusValues.length} bonus points`)

  // ── Step 14: News ────────────────────────────────────────────────────
  console.log("[step 14] Creating news articles...")
  const newsValues = data.news.map((n) => ({
    organizationId: ORG_ID,
    title: n.ueberschrift || "Untitled",
    shortText: n.infozeile || null,
    content: n.text || "",
    status: "published" as const,
    publishedAt: n.datetime,
    createdAt: n.datetime,
  }))

  if (newsValues.length > 0) {
    await db.news.createMany({ data: newsValues })
  }
  console.log(`[step 14]   → ${newsValues.length} news articles`)

  // ── Step 15: Recalculate standings ───────────────────────────────────
  console.log("[step 15] Recalculating standings for all rounds...")
  let standingsCount = 0
  for (const roundUuid of allRoundUuids) {
    await recalculateStandings(db, roundUuid, ORG_ID)
    standingsCount++
  }
  console.log(`[step 15]   → Standings recalculated for ${standingsCount} rounds`)

  // ── Step 16: Recalculate player + goalie stats ───────────────────────
  console.log("[step 16] Recalculating player and goalie season stats...")
  for (const s of data.seasons) {
    const seasonUuid = seasonUuidMap.get(s.id)!
    await recalculatePlayerStats(db, seasonUuid, ORG_ID)
    await recalculateGoalieStats(db, seasonUuid, ORG_ID)
  }
  console.log(`[step 16]   → Stats recalculated for ${data.seasons.length} seasons`)

  // ── Verification ─────────────────────────────────────────────────────
  await printVerification(db, data)
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

async function printVerification(db: Database, data: LegacyData): Promise<void> {
  console.log("\n══════════════════════════════════════════════════════════")
  console.log(" MIGRATION VERIFICATION")
  console.log("══════════════════════════════════════════════════════════\n")

  const newTeams = await db.team.count({ where: { organizationId: ORG_ID } })
  const newPlayers = await db.player.count({ where: { organizationId: ORG_ID } })
  const newSeasons = await db.season.count({ where: { organizationId: ORG_ID } })
  const newGamesCompleted = await db.game.count({ where: { organizationId: ORG_ID, status: "completed" } })
  const newGamesTotal = await db.game.count({ where: { organizationId: ORG_ID } })
  const newGoalEvents = await db.gameEvent.count({ where: { organizationId: ORG_ID, eventType: "goal" } })
  const newPenaltyEvents = await db.gameEvent.count({ where: { organizationId: ORG_ID, eventType: "penalty" } })
  const newGoalieStats = await db.goalieGameStat.count({ where: { organizationId: ORG_ID } })
  const newContracts = await db.contract.count({ where: { organizationId: ORG_ID } })
  const newDivisions = await db.division.count({ where: { organizationId: ORG_ID } })
  const newRounds = await db.round.count({ where: { organizationId: ORG_ID } })
  const newNews = await db.news.count({ where: { organizationId: ORG_ID } })
  const newStandings = await db.standing.count({ where: { organizationId: ORG_ID } })
  const newPlayerStats = await db.playerSeasonStat.count({ where: { organizationId: ORG_ID } })
  const newGoalieSeasonStats = await db.goalieSeasonStat.count({ where: { organizationId: ORG_ID } })
  const newTrikots = await db.trikot.count({ where: { organizationId: ORG_ID } })
  const newTeamTrikots = await db.teamTrikot.count({ where: { organizationId: ORG_ID } })
  const newGameLineups = await db.gameLineup.count({ where: { organizationId: ORG_ID } })
  const newTeamLogos = await db.team.count({ where: { organizationId: ORG_ID, logoUrl: { not: null } } })
  const newTeamPhotos = await db.team.count({ where: { organizationId: ORG_ID, teamPhotoUrl: { not: null } } })

  const decidedGames = data.games.filter((g) => g.decided === 1).length
  const legacyGoals = data.reports.filter((r) => r.goal > 0).length
  const legacyPenalties = data.reports.filter((r) => r.penalty > 0).length
  const legacyGoalieStats = data.goalieStats.filter((gs) => gs.statistic === 1).length
  const legacyValidTrikots = data.trikots.filter(
    (t) => t.id !== 3 && (t.template_id === 1 || t.template_id === 2),
  ).length

  console.log("Entity             | Legacy      | New")
  console.log("───────────────────|─────────────|──────────")
  console.log(`Teams              | ${String(data.teams.length).padStart(11)} | ${newTeams}`)
  console.log(`Players            | ${String(data.players.length).padStart(11)} | ${newPlayers}`)
  console.log(`Seasons            | ${String(data.seasons.length).padStart(11)} | ${newSeasons}`)
  console.log(`Divisions          |           — | ${newDivisions}`)
  console.log(`Rounds             |           — | ${newRounds}`)
  console.log(`Team logos         |           — | ${newTeamLogos}`)
  console.log(`Team photos        |           — | ${newTeamPhotos}`)
  console.log(`Trikots            | ${String(legacyValidTrikots).padStart(11)} | ${newTrikots}`)
  console.log(`Team trikots       |           — | ${newTeamTrikots}`)
  console.log(`Games (completed)  | ${String(decidedGames).padStart(11)} | ${newGamesCompleted}`)
  console.log(`Games (total)      | ${String(data.games.length).padStart(11)} | ${newGamesTotal}`)
  console.log(`Game lineups       | ${String(data.lineups.length).padStart(11)} | ${newGameLineups}`)
  console.log(`Goal events        | ${String(legacyGoals).padStart(11)} | ${newGoalEvents}`)
  console.log(`Penalty events     | ${String(legacyPenalties).padStart(11)} | ${newPenaltyEvents}`)
  console.log(`Goalie game stats  | ${String(legacyGoalieStats).padStart(11)} | ${newGoalieStats}`)
  console.log(
    `Contracts          | ${String(data.playerTeams.filter((pt) => pt.active === 1).length).padStart(11)} | ${newContracts} (consolidated)`,
  )
  console.log(`News               | ${String(data.news.length).padStart(11)} | ${newNews}`)
  console.log(`Standings          |           — | ${newStandings}`)
  console.log(`Player season stats|           — | ${newPlayerStats}`)
  console.log(`Goalie season stats|           — | ${newGoalieSeasonStats}`)

  // Spot checks
  console.log("\n── Spot Checks ────────────────────────────────────────")

  // Top scorers
  const topScorers = await db.playerSeasonStat.findMany({
    where: { organizationId: ORG_ID },
    orderBy: { totalPoints: "desc" },
    take: 5,
    include: { player: { select: { firstName: true, lastName: true } }, season: { select: { name: true } } },
  })
  console.log("\nTop 5 all-time scorers (single season):")
  for (const s of topScorers) {
    console.log(
      `  ${s.player.firstName} ${s.player.lastName} (${s.season.name}): ${s.goals}G ${s.assists}A = ${s.totalPoints}P`,
    )
  }

  // Sample completed games with events
  const sampleGames = await db.game.findMany({
    where: { organizationId: ORG_ID, status: "completed" },
    take: 3,
    orderBy: { scheduledAt: "desc" },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      events: { select: { eventType: true } },
    },
  })
  console.log("\nSample recent completed games:")
  for (const g of sampleGames) {
    const goals = g.events.filter((e) => e.eventType === "goal").length
    const pens = g.events.filter((e) => e.eventType === "penalty").length
    console.log(
      `  ${g.homeTeam.name} ${g.homeScore}-${g.awayScore} ${g.awayTeam.name} (${goals} goals, ${pens} penalties)`,
    )
  }

  // Players without contracts (should have at least one from legacy data)
  const playersWithContracts = new Set(
    (
      await db.contract.findMany({
        where: { organizationId: ORG_ID },
        select: { playerId: true },
        distinct: ["playerId"],
      })
    ).map((c) => c.playerId),
  )
  const allPlayers = await db.player.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, firstName: true, lastName: true },
  })
  const playersWithoutContracts = allPlayers.filter((p) => !playersWithContracts.has(p.id))
  if (playersWithoutContracts.length > 0) {
    console.log(`\n⚠ WARNING: ${playersWithoutContracts.length} players have NO contracts:`)
    // Show first 20
    for (const p of playersWithoutContracts.slice(0, 20)) {
      console.log(`  → ${p.firstName} ${p.lastName} (${p.id})`)
    }
    if (playersWithoutContracts.length > 20) {
      console.log(`  ... and ${playersWithoutContracts.length - 20} more`)
    }
  } else {
    console.log("\n✓ All players have at least one contract")
  }

  // Teams with no contracts (suspicious if team has games)
  const teamsWithContracts = new Set(
    (
      await db.contract.findMany({
        where: { organizationId: ORG_ID },
        select: { teamId: true },
        distinct: ["teamId"],
      })
    ).map((c) => c.teamId),
  )
  const allTeams = await db.team.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true },
  })
  const teamsWithNoContracts = allTeams.filter((t) => !teamsWithContracts.has(t.id))
  if (teamsWithNoContracts.length > 0) {
    console.log(`\n⚠ WARNING: ${teamsWithNoContracts.length} teams have NO player contracts:`)
    for (const t of teamsWithNoContracts) {
      const gameCount = await db.game.count({
        where: {
          organizationId: ORG_ID,
          OR: [{ homeTeamId: t.id }, { awayTeamId: t.id }],
        },
      })
      console.log(`  → ${t.name} (${gameCount} games)`)
    }
  }

  console.log("\n══════════════════════════════════════════════════════════\n")
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Parse legacy season code "0809" → start Sep 2008, end Apr 2009 */
function parseSeasonDates(code: string): { start: Date; end: Date } {
  let startYear: number
  let endYear: number

  if (code.length === 4) {
    const first = parseInt(code.substring(0, 2), 10)
    const second = parseInt(code.substring(2, 4), 10)

    // Handle century: 00-50 = 2000s, 51-99 = 1900s
    startYear = first < 50 ? 2000 + first : 1900 + first
    endYear = second < 50 ? 2000 + second : 1900 + second
  } else {
    startYear = 2008
    endYear = 2009
  }

  return {
    start: new Date(Date.UTC(startYear, 8, 1, 0, 0, 0)), // Sep 1
    end: new Date(Date.UTC(endYear, 3, 30, 23, 59, 59)), // Apr 30
  }
}

/** Parse "DD.MM.YYYY" → Date or null */
function parseLegacyDate(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return undefined
  const [, day, month, year] = match
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (Number.isNaN(d.getTime())) return undefined
  return d
}

/** Derive period from playminute (0-19=P1, 20-39=P2, 40+=P3) */
function derivePeriod(playminute: number): number {
  if (playminute < 20) return 1
  if (playminute < 40) return 2
  return 3
}

/** Map legacy posID to Position enum */
function legacyPosToPosition(posID: number): "forward" | "defense" | "goalie" {
  switch (posID) {
    case 1:
      return "forward"
    case 2:
      return "defense"
    case 3:
      return "goalie"
    default:
      return "forward" // "k. A." (unknown) defaults to forward
  }
}

// ---------------------------------------------------------------------------
// MySQL connection
// ---------------------------------------------------------------------------

export async function connectLegacyMySQL(): Promise<mysql.Connection> {
  console.log(`[legacy] Connecting to MySQL at ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}...`)
  const conn = await mysql.createConnection(MYSQL_CONFIG)
  console.log("[legacy] Connected.")
  return conn
}
