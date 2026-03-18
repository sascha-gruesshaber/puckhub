-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "round_type" AS ENUM ('regular', 'preround', 'playoffs', 'playdowns', 'playups', 'relegation', 'placement', 'final');

-- CreateEnum
CREATE TYPE "position" AS ENUM ('forward', 'defense', 'goalie');

-- CreateEnum
CREATE TYPE "game_status" AS ENUM ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled');

-- CreateEnum
CREATE TYPE "game_event_type" AS ENUM ('goal', 'penalty');

-- CreateEnum
CREATE TYPE "news_status" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "page_status" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "menu_location" AS ENUM ('main_nav', 'footer');

-- CreateEnum
CREATE TYPE "trikot_template_type" AS ENUM ('one_color', 'two_color');

-- CreateEnum
CREATE TYPE "org_role" AS ENUM ('owner', 'admin', 'game_manager', 'game_reporter', 'team_manager', 'editor');

-- CreateEnum
CREATE TYPE "plan_interval" AS ENUM ('yearly');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "isDemoUser" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_role" (
    "id" UUID NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" "org_role" NOT NULL,
    "team_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "inviterId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season_start" TIMESTAMPTZ NOT NULL,
    "season_end" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "season_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "goalie_min_games" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "division_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "round_type" "round_type" NOT NULL DEFAULT 'regular',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "points_win" INTEGER NOT NULL DEFAULT 2,
    "points_draw" INTEGER NOT NULL DEFAULT 1,
    "points_loss" INTEGER NOT NULL DEFAULT 0,
    "counts_for_player_stats" BOOLEAN NOT NULL DEFAULT true,
    "counts_for_goalie_stats" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "city" TEXT,
    "logo_url" TEXT,
    "team_photo_url" TEXT,
    "primary_color" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "website" TEXT,
    "home_venue" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "nationality" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "position" "position" NOT NULL,
    "jersey_number" INTEGER,
    "start_season_id" UUID NOT NULL,
    "end_season_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "round_id" UUID NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "location" TEXT,
    "scheduled_at" TIMESTAMPTZ,
    "status" "game_status" NOT NULL DEFAULT 'scheduled',
    "home_score" INTEGER,
    "away_score" INTEGER,
    "game_number" INTEGER,
    "notes" TEXT,
    "recap_title" TEXT,
    "recap_content" TEXT,
    "recap_generated_at" TIMESTAMPTZ,
    "recap_generating" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "game_id" UUID NOT NULL,
    "event_type" "game_event_type" NOT NULL,
    "team_id" UUID NOT NULL,
    "period" INTEGER NOT NULL,
    "time_minutes" INTEGER NOT NULL,
    "time_seconds" INTEGER NOT NULL,
    "scorer_id" UUID,
    "assist1_id" UUID,
    "assist2_id" UUID,
    "goalie_id" UUID,
    "penalty_player_id" UUID,
    "penalty_type_id" UUID,
    "penalty_minutes" INTEGER,
    "penalty_description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_lineups" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "game_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "position" "position" NOT NULL,
    "jersey_number" INTEGER,
    "is_starting_goalie" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_suspensions" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "game_id" UUID NOT NULL,
    "game_event_id" UUID,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "suspension_type" TEXT NOT NULL,
    "suspended_games" INTEGER NOT NULL DEFAULT 1,
    "served_games" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_suspensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalty_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "default_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penalty_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "goal_difference" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "bonus_points" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "previous_rank" INTEGER,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_points" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_divisions" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "division_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_season_stats" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "player_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "penalty_minutes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goalie_season_stats" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "player_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "gaa" DECIMAL(5,2),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goalie_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goalie_game_stats" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "game_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goalie_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "website_url" TEXT,
    "hover_text" TEXT,
    "team_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_text" TEXT,
    "content" TEXT NOT NULL,
    "status" "news_status" NOT NULL DEFAULT 'draft',
    "author_id" TEXT,
    "published_at" TIMESTAMPTZ,
    "scheduled_publish_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "status" "page_status" NOT NULL DEFAULT 'draft',
    "parent_id" UUID,
    "menu_locations" "menu_location"[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system_route" BOOLEAN NOT NULL DEFAULT false,
    "route_path" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_aliases" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "target_page_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "league_name" TEXT NOT NULL,
    "league_short_name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "points_win" INTEGER NOT NULL DEFAULT 2,
    "points_draw" INTEGER NOT NULL DEFAULT 1,
    "points_loss" INTEGER NOT NULL DEFAULT 0,
    "public_reports_enabled" BOOLEAN NOT NULL DEFAULT false,
    "public_reports_require_email" BOOLEAN NOT NULL DEFAULT true,
    "public_reports_bot_detection" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trikot_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "template_type" "trikot_template_type" NOT NULL,
    "svg" TEXT NOT NULL,
    "color_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trikot_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trikots" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template_id" UUID NOT NULL,
    "primary_color" TEXT NOT NULL,
    "secondary_color" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trikots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_trikots" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "trikot_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_trikots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_config" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "og_image_url" TEXT,
    "color_primary" TEXT,
    "color_secondary" TEXT,
    "color_accent" TEXT,
    "color_background" TEXT,
    "color_text" TEXT,
    "color_header_bg" TEXT,
    "color_header_text" TEXT,
    "color_footer_bg" TEXT,
    "color_footer_text" TEXT,
    "template_preset" TEXT NOT NULL DEFAULT 'classic',
    "layout_config" JSONB,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "domain_verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "price_yearly" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "max_teams" INTEGER,
    "max_players" INTEGER,
    "max_divisions_per_season" INTEGER,
    "max_seasons" INTEGER,
    "max_admins" INTEGER,
    "max_news_articles" INTEGER,
    "max_pages" INTEGER,
    "max_sponsors" INTEGER,
    "max_documents" INTEGER,
    "storage_quota_mb" INTEGER,
    "feature_custom_domain" BOOLEAN NOT NULL DEFAULT false,
    "feature_website_builder" BOOLEAN NOT NULL DEFAULT false,
    "feature_sponsor_mgmt" BOOLEAN NOT NULL DEFAULT false,
    "feature_trikot_designer" BOOLEAN NOT NULL DEFAULT false,
    "feature_game_reports" BOOLEAN NOT NULL DEFAULT true,
    "feature_player_stats" BOOLEAN NOT NULL DEFAULT true,
    "feature_scheduler" BOOLEAN NOT NULL DEFAULT false,
    "feature_scheduled_news" BOOLEAN NOT NULL DEFAULT false,
    "feature_advanced_roles" BOOLEAN NOT NULL DEFAULT false,
    "feature_advanced_stats" BOOLEAN NOT NULL DEFAULT false,
    "feature_ai_recaps" BOOLEAN NOT NULL DEFAULT false,
    "feature_public_reports" BOOLEAN NOT NULL DEFAULT false,
    "ai_monthly_token_limit" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" UUID NOT NULL,
    "interval" "plan_interval" NOT NULL DEFAULT 'yearly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMPTZ NOT NULL,
    "current_period_end" TIMESTAMPTZ NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "trial_ends_at" TIMESTAMPTZ,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_game_reports" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "game_id" UUID NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,
    "comment" TEXT,
    "submitter_email" TEXT NOT NULL,
    "submitter_ip" TEXT,
    "reverted" BOOLEAN NOT NULL DEFAULT false,
    "reverted_by" TEXT,
    "reverted_at" TIMESTAMPTZ,
    "revert_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_game_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_log" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "game_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentialID_key" ON "passkey"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_role_member_id_idx" ON "member_role"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_role_member_id_role_team_id_key" ON "member_role"("member_id", "role", "team_id");

-- CreateIndex
CREATE INDEX "seasons_org_id_idx" ON "seasons"("organization_id");

-- CreateIndex
CREATE INDEX "divisions_season_id_idx" ON "divisions"("season_id");

-- CreateIndex
CREATE INDEX "divisions_org_id_idx" ON "divisions"("organization_id");

-- CreateIndex
CREATE INDEX "rounds_division_id_idx" ON "rounds"("division_id");

-- CreateIndex
CREATE INDEX "rounds_org_id_idx" ON "rounds"("organization_id");

-- CreateIndex
CREATE INDEX "teams_org_id_idx" ON "teams"("organization_id");

-- CreateIndex
CREATE INDEX "players_org_id_idx" ON "players"("organization_id");

-- CreateIndex
CREATE INDEX "contracts_player_id_idx" ON "contracts"("player_id");

-- CreateIndex
CREATE INDEX "contracts_team_id_idx" ON "contracts"("team_id");

-- CreateIndex
CREATE INDEX "contracts_start_season_id_idx" ON "contracts"("start_season_id");

-- CreateIndex
CREATE INDEX "contracts_org_id_idx" ON "contracts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_player_id_team_id_start_season_id_key" ON "contracts"("player_id", "team_id", "start_season_id");

-- CreateIndex
CREATE INDEX "games_round_id_idx" ON "games"("round_id");

-- CreateIndex
CREATE INDEX "games_home_team_id_idx" ON "games"("home_team_id");

-- CreateIndex
CREATE INDEX "games_away_team_id_idx" ON "games"("away_team_id");

-- CreateIndex
CREATE INDEX "games_scheduled_at_idx" ON "games"("scheduled_at");

-- CreateIndex
CREATE INDEX "games_org_id_idx" ON "games"("organization_id");

-- CreateIndex
CREATE INDEX "game_events_game_id_idx" ON "game_events"("game_id");

-- CreateIndex
CREATE INDEX "game_events_org_id_idx" ON "game_events"("organization_id");

-- CreateIndex
CREATE INDEX "game_lineups_game_id_idx" ON "game_lineups"("game_id");

-- CreateIndex
CREATE INDEX "game_lineups_org_id_idx" ON "game_lineups"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_lineups_game_id_player_id_key" ON "game_lineups"("game_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_suspensions_game_event_id_key" ON "game_suspensions"("game_event_id");

-- CreateIndex
CREATE INDEX "game_suspensions_game_id_idx" ON "game_suspensions"("game_id");

-- CreateIndex
CREATE INDEX "game_suspensions_team_id_idx" ON "game_suspensions"("team_id");

-- CreateIndex
CREATE INDEX "game_suspensions_org_id_idx" ON "game_suspensions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "penalty_types_code_key" ON "penalty_types"("code");

-- CreateIndex
CREATE INDEX "standings_round_id_idx" ON "standings"("round_id");

-- CreateIndex
CREATE INDEX "standings_org_id_idx" ON "standings"("organization_id");

-- CreateIndex
CREATE INDEX "bonus_points_org_id_idx" ON "bonus_points"("organization_id");

-- CreateIndex
CREATE INDEX "team_divisions_team_id_idx" ON "team_divisions"("team_id");

-- CreateIndex
CREATE INDEX "team_divisions_division_id_idx" ON "team_divisions"("division_id");

-- CreateIndex
CREATE INDEX "team_divisions_org_id_idx" ON "team_divisions"("organization_id");

-- CreateIndex
CREATE INDEX "player_season_stats_org_id_idx" ON "player_season_stats"("organization_id");

-- CreateIndex
CREATE INDEX "goalie_season_stats_org_id_idx" ON "goalie_season_stats"("organization_id");

-- CreateIndex
CREATE INDEX "goalie_game_stats_org_id_idx" ON "goalie_game_stats"("organization_id");

-- CreateIndex
CREATE INDEX "sponsors_org_id_idx" ON "sponsors"("organization_id");

-- CreateIndex
CREATE INDEX "news_org_id_idx" ON "news"("organization_id");

-- CreateIndex
CREATE INDEX "pages_org_id_idx" ON "pages"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_parent_org_unique" ON "pages"("slug", "parent_id", "organization_id");

-- CreateIndex
CREATE INDEX "page_aliases_org_id_idx" ON "page_aliases"("organization_id");

-- CreateIndex
CREATE INDEX "documents_org_id_idx" ON "documents"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_organization_id_key" ON "system_settings"("organization_id");

-- CreateIndex
CREATE INDEX "system_settings_org_id_idx" ON "system_settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "trikot_templates_name_key" ON "trikot_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "trikot_templates_template_type_key" ON "trikot_templates"("template_type");

-- CreateIndex
CREATE INDEX "trikots_org_id_idx" ON "trikots"("organization_id");

-- CreateIndex
CREATE INDEX "team_trikots_org_id_idx" ON "team_trikots"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_trikots_team_id_trikot_id_name_key" ON "team_trikots"("team_id", "trikot_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "website_config_organization_id_key" ON "website_config"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_config_domain_key" ON "website_config"("domain");

-- CreateIndex
CREATE INDEX "website_config_domain_idx" ON "website_config"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_organization_id_key" ON "org_subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_stripe_customer_id_key" ON "org_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_stripe_subscription_id_key" ON "org_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "org_subscriptions_org_id_idx" ON "org_subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "org_subscriptions_plan_id_idx" ON "org_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "public_game_reports_organization_id_idx" ON "public_game_reports"("organization_id");

-- CreateIndex
CREATE INDEX "public_game_reports_game_id_idx" ON "public_game_reports"("game_id");

-- CreateIndex
CREATE INDEX "ai_usage_log_organization_id_created_at_idx" ON "ai_usage_log"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_start_season_id_fkey" FOREIGN KEY ("start_season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_end_season_id_fkey" FOREIGN KEY ("end_season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_scorer_id_fkey" FOREIGN KEY ("scorer_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_assist1_id_fkey" FOREIGN KEY ("assist1_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_assist2_id_fkey" FOREIGN KEY ("assist2_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_goalie_id_fkey" FOREIGN KEY ("goalie_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_penalty_player_id_fkey" FOREIGN KEY ("penalty_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_penalty_type_id_fkey" FOREIGN KEY ("penalty_type_id") REFERENCES "penalty_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_lineups" ADD CONSTRAINT "game_lineups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_lineups" ADD CONSTRAINT "game_lineups_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_lineups" ADD CONSTRAINT "game_lineups_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_lineups" ADD CONSTRAINT "game_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_suspensions" ADD CONSTRAINT "game_suspensions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_suspensions" ADD CONSTRAINT "game_suspensions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_suspensions" ADD CONSTRAINT "game_suspensions_game_event_id_fkey" FOREIGN KEY ("game_event_id") REFERENCES "game_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_suspensions" ADD CONSTRAINT "game_suspensions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_suspensions" ADD CONSTRAINT "game_suspensions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_divisions" ADD CONSTRAINT "team_divisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_divisions" ADD CONSTRAINT "team_divisions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_divisions" ADD CONSTRAINT "team_divisions_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_season_stats" ADD CONSTRAINT "goalie_season_stats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_season_stats" ADD CONSTRAINT "goalie_season_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_season_stats" ADD CONSTRAINT "goalie_season_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_season_stats" ADD CONSTRAINT "goalie_season_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_aliases" ADD CONSTRAINT "page_aliases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_aliases" ADD CONSTRAINT "page_aliases_target_page_id_fkey" FOREIGN KEY ("target_page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trikots" ADD CONSTRAINT "trikots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trikots" ADD CONSTRAINT "trikots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "trikot_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_trikots" ADD CONSTRAINT "team_trikots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_trikots" ADD CONSTRAINT "team_trikots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_trikots" ADD CONSTRAINT "team_trikots_trikot_id_fkey" FOREIGN KEY ("trikot_id") REFERENCES "trikots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_config" ADD CONSTRAINT "website_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_game_reports" ADD CONSTRAINT "public_game_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_game_reports" ADD CONSTRAINT "public_game_reports_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_game_reports" ADD CONSTRAINT "public_game_reports_reverted_by_fkey" FOREIGN KEY ("reverted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
