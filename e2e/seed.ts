import { createHash, randomUUID } from "node:crypto"

function hashPublicReportValue(value: string, organizationId: string) {
  const secret = process.env.PUBLIC_REPORT_HASH_SECRET ?? process.env.AUTH_SECRET ?? "dev-secret-change-me"
  return createHash("sha256").update(`${organizationId}:${secret}:${value}`).digest("hex")
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function maskEmail(email: string) {
  const normalized = normalizeEmail(email)
  const [local, domain] = normalized.split("@")
  if (!local || !domain) return "***"
  return `${local[0]}***@${domain}`
}

// ---------------------------------------------------------------------------
// Fixed IDs for cross-referencing in tests
// ---------------------------------------------------------------------------
const userId = "e2e-admin-id"
const orgId = "e2e-org-id"
const memberId = "e2e-member-id"
const planId = "00000000-0000-0000-0000-000000000003" // Fixed Pro plan ID
const subscriptionId = randomUUID()
const websiteConfigId = randomUUID()
const settingsId = randomUUID()

const hawksId = randomUUID()
const bearsId = randomUUID()

const seasonId = randomUUID()
const divisionId = randomUUID()
const roundId = randomUUID()

const penaltyMinorId = randomUUID()
const penaltyMajorId = randomUUID()

// Players: 5 per team (3F, 1D, 1G)
const hawksPlayers = [
  { id: randomUUID(), first: "Jake", last: "Hawkins", pos: "forward", num: 10 },
  { id: randomUUID(), first: "Ryan", last: "Cooper", pos: "forward", num: 17 },
  { id: randomUUID(), first: "Mike", last: "Sterling", pos: "forward", num: 23 },
  { id: randomUUID(), first: "Dan", last: "Fletcher", pos: "defense", num: 4 },
  { id: randomUUID(), first: "Sam", last: "Garrett", pos: "goalie", num: 1 },
]

const bearsPlayers = [
  { id: randomUUID(), first: "Tom", last: "Bradley", pos: "forward", num: 11 },
  { id: randomUUID(), first: "Alex", last: "Morrison", pos: "forward", num: 22 },
  { id: randomUUID(), first: "Chris", last: "Palmer", pos: "forward", num: 9 },
  { id: randomUUID(), first: "Nick", last: "Dalton", pos: "defense", num: 5 },
  { id: randomUUID(), first: "Eric", last: "Novak", pos: "goalie", num: 30 },
]

const allPlayers = [
  ...hawksPlayers.map((p) => ({ ...p, teamId: hawksId })),
  ...bearsPlayers.map((p) => ({ ...p, teamId: bearsId })),
]

// Games
const game1Id = randomUUID() // Hawks vs Bears, COMPLETED 3-2
const game2Id = randomUUID() // Bears vs Hawks, COMPLETED 1-4
const game3Id = randomUUID() // Hawks vs Bears, SCHEDULED
const game4Id = randomUUID() // Bears vs Hawks, CANCELLED

// News
const news1Id = randomUUID()
const news2Id = randomUUID()
const news3Id = randomUUID() // draft

// Pages
const pageHomeId = randomUUID()
const pageStandingsId = randomUUID()
const pageScheduleId = randomUUID()
const pageTeamsId = randomUUID()
const pageStatsId = randomUUID()
const pageNewsId = randomUUID()
const pageAboutId = randomUUID()
const pageLegalId = randomUUID()

// Trikot templates
const oneColorSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
</svg>`
const twoColorSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
  <path id="schulter" fill="{{color_schulter}}" stroke="#000" stroke-width="0" d="m 11.281638,47.768982 14.298956,37.743671 c 0,0 0.07017,0.05963 40.892953,-26.364418 44.282223,-11.865387 74.894513,-11.712062 117.051423,-0.115073 40.82279,26.424051 40.70605,26.428872 40.70605,26.428872 l 14.23102,-37.693051 -48.97471,-34.6076 -27.231,0.376583 C 140.0897,29.243719 108.88499,28.731064 86.718361,13.025311 H 60.512656 Z"/>
</svg>`

export async function seed(dbUrl: string) {
  const postgres = (await import("postgres")).default
  const sql = postgres(dbUrl, { max: 1 })
  const now = new Date().toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString()
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const lastWeek = new Date(Date.now() - 5 * 86400000).toISOString()
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()

  try {
    // ── User ──
    await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${userId}, ${"E2E Admin"}, ${"admin@test.local"}, ${true}, ${"admin"}, ${now}, ${now})
    `

    // ── Organization ──
    await sql`
      INSERT INTO organization (id, name, slug, "createdAt")
      VALUES (${orgId}, ${"E2E Test League"}, ${"e2e-league"}, ${now})
    `

    // ── Member + MemberRole (owner) ──
    await sql`
      INSERT INTO member (id, "userId", "organizationId", role, "createdAt")
      VALUES (${memberId}, ${userId}, ${orgId}, ${"member"}, ${now})
    `
    await sql`
      INSERT INTO member_role (id, member_id, role)
      VALUES (${randomUUID()}, ${memberId}, ${"owner"})
    `

    // ── Plan + Subscription ──
    await sql`
      INSERT INTO plans (
        id, name, slug, sort_order, is_active,
        price_yearly, currency,
        max_teams, max_players, max_divisions_per_season, max_seasons, max_admins,
        max_news_articles, max_pages, max_sponsors, max_documents, storage_quota_mb,
        feature_custom_domain, feature_website_builder, feature_sponsor_mgmt,
        feature_trikot_designer, feature_game_reports,
        feature_player_stats, feature_scheduler, feature_scheduled_news,
        feature_advanced_roles, feature_advanced_stats, feature_ai,
        feature_public_reports
      ) VALUES (
        ${planId}, ${"E2E Pro"}, ${"e2e-pro"}, ${1}, ${true},
        ${29900}, ${"EUR"},
        ${null}, ${null}, ${null}, ${null}, ${null},
        ${null}, ${null}, ${null}, ${null}, ${null},
        ${true}, ${true}, ${true},
        ${true}, ${true},
        ${true}, ${true}, ${false},
        ${true}, ${true}, ${true}, ${true}
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug
    `
    await sql`
      INSERT INTO org_subscriptions (
        id, organization_id, plan_id, "interval", status,
        current_period_start, current_period_end
      ) VALUES (
        ${subscriptionId}, ${orgId}, ${planId}, ${"yearly"}, ${"active"},
        ${now}, ${new Date(Date.now() + 365 * 86400000).toISOString()}
      )
    `

    // ── WebsiteConfig ──
    await sql`
      INSERT INTO website_config (
        id, organization_id, is_active, template_preset
      ) VALUES (
        ${websiteConfigId}, ${orgId}, ${true}, ${"classic"}
      )
    `

    // ── SystemSettings ──
    await sql`
      INSERT INTO system_settings (
        id, organization_id, league_name, league_short_name,
        locale, timezone, points_win, points_draw, points_loss,
        public_reports_enabled, public_reports_require_email, public_reports_bot_detection
      ) VALUES (
        ${settingsId}, ${orgId}, ${"E2E Test League"}, ${"E2E"},
        ${"en-US"}, ${"Europe/Berlin"}, ${3}, ${1}, ${0},
        ${true}, ${false}, ${false}
      )
    `

    // ── PenaltyTypes ──
    await sql`
      INSERT INTO penalty_types (id, code, name, short_name, default_minutes)
      VALUES
        (${penaltyMinorId}, ${"MINOR"}, ${"Minor Penalty"}, ${"MIN"}, ${2}),
        (${penaltyMajorId}, ${"MAJOR"}, ${"Major Penalty"}, ${"MAJ"}, ${5})
      ON CONFLICT DO NOTHING
    `

    // ── Trikot Templates ──
    await sql`
      INSERT INTO trikot_templates (id, name, template_type, color_count, svg)
      VALUES
        (${randomUUID()}, ${"One-color"}, ${"one_color"}, ${1}, ${oneColorSvg}),
        (${randomUUID()}, ${"Two-color"}, ${"two_color"}, ${2}, ${twoColorSvg})
      ON CONFLICT DO NOTHING
    `

    // ── Teams ──
    await sql`
      INSERT INTO teams (id, organization_id, name, short_name, city, home_venue)
      VALUES
        (${hawksId}, ${orgId}, ${"E2E Hawks"}, ${"HWK"}, ${"Teststadt"}, ${"Eishalle Teststadt"}),
        (${bearsId}, ${orgId}, ${"E2E Bears"}, ${"BRS"}, ${"Beispielstadt"}, ${"Eisarena Beispielstadt"})
    `

    // ── Players ──
    for (const p of allPlayers) {
      await sql`
        INSERT INTO players (id, organization_id, first_name, last_name, nationality)
        VALUES (${p.id}, ${orgId}, ${p.first}, ${p.last}, ${"DE"})
      `
    }

    // ── Season ──
    await sql`
      INSERT INTO seasons (id, organization_id, name, season_start, season_end)
      VALUES (
        ${seasonId}, ${orgId}, ${"E2E Season 2025/26"},
        ${"2025-09-01T00:00:00Z"}, ${"2026-04-30T00:00:00Z"}
      )
    `

    // ── Division ──
    await sql`
      INSERT INTO divisions (id, organization_id, season_id, name, sort_order)
      VALUES (${divisionId}, ${orgId}, ${seasonId}, ${"Main Division"}, ${0})
    `

    // ── TeamDivisions (assign both teams to division) ──
    await sql`
      INSERT INTO team_divisions (id, organization_id, team_id, division_id)
      VALUES
        (${randomUUID()}, ${orgId}, ${hawksId}, ${divisionId}),
        (${randomUUID()}, ${orgId}, ${bearsId}, ${divisionId})
    `

    // ── Round ──
    await sql`
      INSERT INTO rounds (
        id, organization_id, division_id, name, round_type, sort_order,
        points_win, points_draw, points_loss,
        counts_for_player_stats, counts_for_goalie_stats
      ) VALUES (
        ${roundId}, ${orgId}, ${divisionId}, ${"Regular Season"}, ${"regular"}, ${0},
        ${3}, ${1}, ${0}, ${true}, ${true}
      )
    `

    // ── Contracts (all players assigned to their teams for the season) ──
    for (const p of allPlayers) {
      await sql`
        INSERT INTO contracts (id, organization_id, player_id, team_id, position, jersey_number, start_season_id)
        VALUES (${randomUUID()}, ${orgId}, ${p.id}, ${p.teamId}, ${p.pos}, ${p.num}, ${seasonId})
      `
    }

    // ── Games ──
    // Game 1: Hawks vs Bears, COMPLETED 3-2
    await sql`
      INSERT INTO games (id, organization_id, round_id, home_team_id, away_team_id, status, home_score, away_score, game_number, location, scheduled_at, finalized_at)
      VALUES (${game1Id}, ${orgId}, ${roundId}, ${hawksId}, ${bearsId}, ${"completed"}, ${3}, ${2}, ${1}, ${"Eishalle Teststadt"}, ${lastWeek}, ${lastWeek})
    `
    // Game 2: Bears vs Hawks, COMPLETED 1-4
    await sql`
      INSERT INTO games (id, organization_id, round_id, home_team_id, away_team_id, status, home_score, away_score, game_number, location, scheduled_at, finalized_at)
      VALUES (${game2Id}, ${orgId}, ${roundId}, ${bearsId}, ${hawksId}, ${"completed"}, ${1}, ${4}, ${2}, ${"Eisarena Beispielstadt"}, ${oneWeekAgo}, ${oneWeekAgo})
    `
    // Game 3: Hawks vs Bears, SCHEDULED (future)
    await sql`
      INSERT INTO games (id, organization_id, round_id, home_team_id, away_team_id, status, game_number, location, scheduled_at)
      VALUES (${game3Id}, ${orgId}, ${roundId}, ${hawksId}, ${bearsId}, ${"scheduled"}, ${3}, ${"Eishalle Teststadt"}, ${nextWeek})
    `
    // Game 4: Bears vs Hawks, CANCELLED
    await sql`
      INSERT INTO games (id, organization_id, round_id, home_team_id, away_team_id, status, game_number, location, scheduled_at)
      VALUES (${game4Id}, ${orgId}, ${roundId}, ${bearsId}, ${hawksId}, ${"cancelled"}, ${4}, ${"Eisarena Beispielstadt"}, ${nextWeek})
    `

    // ── Lineups for completed games ──
    for (const game of [
      { id: game1Id, home: hawksId, away: bearsId },
      { id: game2Id, home: bearsId, away: hawksId },
    ]) {
      for (const p of allPlayers) {
        const team = p.teamId
        await sql`
          INSERT INTO game_lineups (id, organization_id, game_id, player_id, team_id, position, jersey_number, is_starting_goalie)
          VALUES (${randomUUID()}, ${orgId}, ${game.id}, ${p.id}, ${team}, ${p.pos}, ${p.num}, ${p.pos === "goalie" && team === game.home})
        `
      }
    }

    // ── Game Events for Game 1 (Hawks 3 - Bears 2) ──
    const h = hawksPlayers
    const b = bearsPlayers
    const hawksGoalie = h[4]! // Garrett
    const bearsGoalie = b[4]! // Novak

    // Hawks goals
    await insertGoalEvent(sql, game1Id, hawksId, 1, 5, 30, h[0]!.id, h[1]!.id, null, bearsGoalie.id)
    await insertGoalEvent(sql, game1Id, hawksId, 1, 12, 15, h[1]!.id, h[2]!.id, h[0]!.id, bearsGoalie.id)
    await insertGoalEvent(sql, game1Id, hawksId, 2, 8, 45, h[2]!.id, null, null, bearsGoalie.id)
    // Bears goals
    await insertGoalEvent(sql, game1Id, bearsId, 2, 15, 0, b[0]!.id, b[1]!.id, null, hawksGoalie.id)
    await insertGoalEvent(sql, game1Id, bearsId, 3, 2, 10, b[1]!.id, b[2]!.id, null, hawksGoalie.id)

    // Penalty event in Game 1
    await sql`
      INSERT INTO game_events (id, organization_id, game_id, event_type, team_id, period, time_minutes, time_seconds, penalty_player_id, penalty_type_id, penalty_minutes, penalty_description)
      VALUES (${randomUUID()}, ${orgId}, ${game1Id}, ${"penalty"}, ${bearsId}, ${2}, ${10}, ${0}, ${b[3]!.id}, ${penaltyMinorId}, ${2}, ${"Tripping"})
    `

    // ── Game Events for Game 2 (Bears 1 - Hawks 4) ──
    // Hawks goals (away)
    await insertGoalEvent(sql, game2Id, hawksId, 1, 3, 0, h[0]!.id, h[1]!.id, null, bearsGoalie.id)
    await insertGoalEvent(sql, game2Id, hawksId, 1, 18, 30, h[1]!.id, null, null, bearsGoalie.id)
    await insertGoalEvent(sql, game2Id, hawksId, 2, 6, 15, h[2]!.id, h[0]!.id, null, bearsGoalie.id)
    await insertGoalEvent(sql, game2Id, hawksId, 3, 1, 45, h[0]!.id, h[2]!.id, null, bearsGoalie.id)
    // Bears goal
    await insertGoalEvent(sql, game2Id, bearsId, 2, 12, 0, b[0]!.id, null, null, hawksGoalie.id)

    // ── Goalie game stats ──
    // Game 1: Hawks goalie faced 2 GA, Bears goalie faced 3 GA
    await sql`
      INSERT INTO goalie_game_stats (id, organization_id, game_id, player_id, team_id, goals_against)
      VALUES
        (${randomUUID()}, ${orgId}, ${game1Id}, ${hawksGoalie.id}, ${hawksId}, ${2}),
        (${randomUUID()}, ${orgId}, ${game1Id}, ${bearsGoalie.id}, ${bearsId}, ${3})
    `
    // Game 2: Hawks goalie faced 1 GA, Bears goalie faced 4 GA
    await sql`
      INSERT INTO goalie_game_stats (id, organization_id, game_id, player_id, team_id, goals_against)
      VALUES
        (${randomUUID()}, ${orgId}, ${game2Id}, ${hawksGoalie.id}, ${hawksId}, ${1}),
        (${randomUUID()}, ${orgId}, ${game2Id}, ${bearsGoalie.id}, ${bearsId}, ${4})
    `

    // ── Standings (Hawks: 2W 0L 6pts, Bears: 0W 2L 0pts) ──
    await sql`
      INSERT INTO standings (id, organization_id, team_id, round_id, games_played, wins, draws, losses, goals_for, goals_against, goal_difference, points, total_points, rank)
      VALUES
        (${randomUUID()}, ${orgId}, ${hawksId}, ${roundId}, ${2}, ${2}, ${0}, ${0}, ${7}, ${3}, ${4}, ${6}, ${6}, ${1}),
        (${randomUUID()}, ${orgId}, ${bearsId}, ${roundId}, ${2}, ${0}, ${0}, ${2}, ${3}, ${7}, ${-4}, ${0}, ${0}, ${2})
    `

    // ── PlayerSeasonStats ──
    // Hawks: Hawkins 3G 2A=5pts, Cooper 1G 2A=3pts, Sterling 2G 1A=3pts
    await sql`
      INSERT INTO player_season_stats (id, organization_id, player_id, season_id, team_id, games_played, goals, assists, total_points, penalty_minutes)
      VALUES
        (${randomUUID()}, ${orgId}, ${h[0]!.id}, ${seasonId}, ${hawksId}, ${2}, ${3}, ${2}, ${5}, ${0}),
        (${randomUUID()}, ${orgId}, ${h[1]!.id}, ${seasonId}, ${hawksId}, ${2}, ${1}, ${2}, ${3}, ${0}),
        (${randomUUID()}, ${orgId}, ${h[2]!.id}, ${seasonId}, ${hawksId}, ${2}, ${2}, ${1}, ${3}, ${0}),
        (${randomUUID()}, ${orgId}, ${h[3]!.id}, ${seasonId}, ${hawksId}, ${2}, ${0}, ${0}, ${0}, ${0})
    `
    // Bears: Bradley 2G 0A=2pts, Morrison 1G 1A=2pts, Palmer 0G 1A=1pt, Dalton 0G 0A 2PIM
    await sql`
      INSERT INTO player_season_stats (id, organization_id, player_id, season_id, team_id, games_played, goals, assists, total_points, penalty_minutes)
      VALUES
        (${randomUUID()}, ${orgId}, ${b[0]!.id}, ${seasonId}, ${bearsId}, ${2}, ${2}, ${0}, ${2}, ${0}),
        (${randomUUID()}, ${orgId}, ${b[1]!.id}, ${seasonId}, ${bearsId}, ${2}, ${1}, ${1}, ${2}, ${0}),
        (${randomUUID()}, ${orgId}, ${b[2]!.id}, ${seasonId}, ${bearsId}, ${2}, ${0}, ${1}, ${1}, ${0}),
        (${randomUUID()}, ${orgId}, ${b[3]!.id}, ${seasonId}, ${bearsId}, ${2}, ${0}, ${0}, ${0}, ${2})
    `

    // ── GoalieSeasonStats ──
    await sql`
      INSERT INTO goalie_season_stats (id, organization_id, player_id, season_id, team_id, games_played, goals_against, gaa)
      VALUES
        (${randomUUID()}, ${orgId}, ${hawksGoalie.id}, ${seasonId}, ${hawksId}, ${2}, ${3}, ${1.5}),
        (${randomUUID()}, ${orgId}, ${bearsGoalie.id}, ${seasonId}, ${bearsId}, ${2}, ${7}, ${3.5})
    `

    // ── News ──
    await sql`
      INSERT INTO news (id, organization_id, title, short_text, content, status, author_id, published_at, created_at)
      VALUES
        (${news1Id}, ${orgId}, ${"Season Kickoff"}, ${"The new season has begun!"}, ${"<p>Welcome to the E2E Test League season. All teams are ready to compete.</p>"}, ${"published"}, ${userId}, ${twoWeeksAgo}, ${twoWeeksAgo}),
        (${news2Id}, ${orgId}, ${"Trade Deadline Recap"}, ${"All the moves from deadline day."}, ${"<p>Several trades were made before the deadline. Here is a comprehensive recap.</p>"}, ${"published"}, ${userId}, ${oneWeekAgo}, ${oneWeekAgo}),
        (${news3Id}, ${orgId}, ${"Playoff Preview"}, ${"Who will win it all?"}, ${"<p>Draft preview of the upcoming playoffs.</p>"}, ${"draft"}, ${userId}, ${now}, ${now})
    `

    // ── Pages (system routes + custom) ──
    const systemPages = [
      { id: pageHomeId, title: "Home", slug: "home", route: "/" },
      { id: pageStandingsId, title: "Standings", slug: "standings", route: "/standings" },
      { id: pageScheduleId, title: "Schedule", slug: "schedule", route: "/schedule" },
      { id: pageTeamsId, title: "Teams", slug: "teams", route: "/teams" },
      { id: pageStatsId, title: "Stats", slug: "stats", route: "/stats" },
      { id: pageNewsId, title: "News", slug: "news", route: "/news" },
    ]
    for (const p of systemPages) {
      await sql`
        INSERT INTO pages (id, organization_id, title, slug, content, status, is_system_route, route_path, menu_locations)
        VALUES (${p.id}, ${orgId}, ${p.title}, ${p.slug}, ${""}, ${"published"}, ${true}, ${p.route}, ${"{main_nav}"})
      `
    }

    // Custom pages
    await sql`
      INSERT INTO pages (id, organization_id, title, slug, content, status, is_system_route, menu_locations)
      VALUES
        (${pageAboutId}, ${orgId}, ${"About Us"}, ${"about-us"}, ${"<p>About the E2E Test League.</p>"}, ${"published"}, ${false}, ${"{footer}"}),
        (${pageLegalId}, ${orgId}, ${"Legal Notice"}, ${"legal-notice"}, ${"<p>Legal information.</p>"}, ${"published"}, ${false}, ${"{footer}"})
    `

    // ── Public Game Reports ──
    // A public report for Game 1 (Hawks 3 - Bears 2), submitted by a fan
    const submitterEmail = "fan@example.com"
    const normalizedEmail = normalizeEmail(submitterEmail)
    await sql`
      INSERT INTO public_game_reports (id, organization_id, game_id, home_score, away_score, submitter_email_hash, submitter_email_masked, comment)
      VALUES (
        ${randomUUID()},
        ${orgId},
        ${game1Id},
        ${3},
        ${2},
        ${hashPublicReportValue(normalizedEmail, orgId)},
        ${maskEmail(normalizedEmail)},
        ${"Great match!"}
      )
    `
  } finally {
    await sql.end()
  }
}

async function insertGoalEvent(
  sql: ReturnType<typeof import("postgres").default>,
  gameId: string,
  teamId: string,
  period: number,
  minutes: number,
  seconds: number,
  scorerId: string,
  assist1Id: string | null,
  assist2Id: string | null,
  goalieId: string | null,
) {
  await sql`
    INSERT INTO game_events (id, organization_id, game_id, event_type, team_id, period, time_minutes, time_seconds, scorer_id, assist1_id, assist2_id, goalie_id)
    VALUES (${randomUUID()}, ${orgId}, ${gameId}, ${"goal"}, ${teamId}, ${period}, ${minutes}, ${seconds}, ${scorerId}, ${assist1Id}, ${assist2Id}, ${goalieId})
  `
}
