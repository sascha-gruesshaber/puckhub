-- Audit follow-up: natural-key uniqueness for derived tables, indexes for the
-- hot query paths, and removal of indexes that duplicate an existing prefix.

-- ─── De-duplicate before adding unique constraints ───────────────────────────
-- Standings and season stats were rebuilt with delete+insert outside a
-- transaction; concurrent recalculations could leave duplicates. Keep the
-- newest row (uuid v7 ids sort by creation time).
DELETE FROM "standings" a USING "standings" b
  WHERE a."round_id" = b."round_id" AND a."team_id" = b."team_id" AND a."id" < b."id";
DELETE FROM "player_season_stats" a USING "player_season_stats" b
  WHERE a."player_id" = b."player_id" AND a."season_id" = b."season_id" AND a."team_id" = b."team_id" AND a."id" < b."id";
DELETE FROM "goalie_season_stats" a USING "goalie_season_stats" b
  WHERE a."player_id" = b."player_id" AND a."season_id" = b."season_id" AND a."team_id" = b."team_id" AND a."id" < b."id";
DELETE FROM "goalie_game_stats" a USING "goalie_game_stats" b
  WHERE a."game_id" = b."game_id" AND a."player_id" = b."player_id" AND a."id" < b."id";
DELETE FROM "team_divisions" a USING "team_divisions" b
  WHERE a."team_id" = b."team_id" AND a."division_id" = b."division_id" AND a."id" < b."id";
DELETE FROM "page_aliases" a USING "page_aliases" b
  WHERE a."organization_id" = b."organization_id" AND a."slug" = b."slug" AND a."id" < b."id";
-- Memberships: keep the oldest row per (user, organization).
DELETE FROM "member" a USING "member" b
  WHERE a."userId" = b."userId" AND a."organizationId" = b."organizationId"
    AND (a."createdAt" > b."createdAt" OR (a."createdAt" = b."createdAt" AND a."id" > b."id"));

-- ─── Unique constraints ──────────────────────────────────────────────────────
CREATE UNIQUE INDEX "member_userId_organizationId_key" ON "member"("userId", "organizationId");
CREATE UNIQUE INDEX "standings_round_id_team_id_key" ON "standings"("round_id", "team_id");
CREATE UNIQUE INDEX "player_season_stats_player_id_season_id_team_id_key" ON "player_season_stats"("player_id", "season_id", "team_id");
CREATE UNIQUE INDEX "goalie_season_stats_player_id_season_id_team_id_key" ON "goalie_season_stats"("player_id", "season_id", "team_id");
CREATE UNIQUE INDEX "goalie_game_stats_game_id_player_id_key" ON "goalie_game_stats"("game_id", "player_id");
CREATE UNIQUE INDEX "team_divisions_team_id_division_id_key" ON "team_divisions"("team_id", "division_id");
CREATE UNIQUE INDEX "page_aliases_organization_id_slug_key" ON "page_aliases"("organization_id", "slug");

-- ─── Indexes for hot paths ───────────────────────────────────────────────────
-- Better Auth tables (queried on every authenticated request)
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");
CREATE INDEX "passkey_userId_idx" ON "passkey"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
CREATE INDEX "invitation_organizationId_email_status_idx" ON "invitation"("organizationId", "email", "status");

-- Games: per-round recalculation, recent results, upcoming games
CREATE INDEX "games_round_id_status_idx" ON "games"("round_id", "status");
CREATE INDEX "games_organization_id_status_finalized_at_idx" ON "games"("organization_id", "status", "finalized_at");
CREATE INDEX "games_organization_id_status_scheduled_at_idx" ON "games"("organization_id", "status", "scheduled_at");

-- Game events: game sheet, stats aggregation, player FK cascades
CREATE INDEX "game_events_game_id_event_type_idx" ON "game_events"("game_id", "event_type");
CREATE INDEX "game_events_team_id_idx" ON "game_events"("team_id");
CREATE INDEX "game_events_scorer_id_idx" ON "game_events"("scorer_id");
CREATE INDEX "game_events_penalty_player_id_idx" ON "game_events"("penalty_player_id");

-- Derived tables: season pages, team pages, cascades
CREATE INDEX "standings_team_id_idx" ON "standings"("team_id");
CREATE INDEX "player_season_stats_season_id_team_id_idx" ON "player_season_stats"("season_id", "team_id");
CREATE INDEX "player_season_stats_team_id_idx" ON "player_season_stats"("team_id");
CREATE INDEX "goalie_season_stats_season_id_team_id_idx" ON "goalie_season_stats"("season_id", "team_id");
CREATE INDEX "goalie_season_stats_team_id_idx" ON "goalie_season_stats"("team_id");
CREATE INDEX "goalie_game_stats_player_id_idx" ON "goalie_game_stats"("player_id");

-- Contracts: roster history by end season
CREATE INDEX "contracts_end_season_id_idx" ON "contracts"("end_season_id");

-- News: public list (org + published, newest first)
CREATE INDEX "news_organization_id_status_published_at_idx" ON "news"("organization_id", "status", "published_at" DESC);

-- ─── Drop indexes that duplicate the prefix of an existing index ─────────────
DROP INDEX IF EXISTS "member_role_member_id_idx";        -- prefix of member_role(member_id, role, team_id)
DROP INDEX IF EXISTS "contracts_player_id_idx";          -- prefix of contracts(player_id, team_id, start_season_id)
DROP INDEX IF EXISTS "game_lineups_game_id_idx";         -- prefix of game_lineups(game_id, player_id)
DROP INDEX IF EXISTS "system_settings_org_id_idx";       -- system_settings.organization_id is unique
DROP INDEX IF EXISTS "website_config_domain_idx";        -- website_config.domain is unique
DROP INDEX IF EXISTS "org_subscriptions_org_id_idx";     -- org_subscriptions.organization_id is unique
DROP INDEX IF EXISTS "ai_home_widgets_org_id_idx";       -- prefix of ai_home_widgets(organization_id, season_id, widget_type)
DROP INDEX IF EXISTS "public_game_reports_organization_id_idx"; -- prefix of (organization_id, submitter_email_hash)
