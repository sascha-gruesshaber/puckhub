-- ============================================================================
-- Migration 0006: Multi-Tenant Transformation
-- ============================================================================
-- Adds organization, member, invitation tables.
-- Adds multi-tenant columns to user, session, system_settings.
-- Adds organization_id (nullable) to all 26 data tables.
-- Drops user_roles table and user_role enum.
-- ============================================================================

-- 1. Create organization table
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- 2. Create member table
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text NOT NULL,
	"role" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 3. Create invitation table
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"organizationId" text NOT NULL,
	"role" text,
	"inviterId" text NOT NULL,
	"status" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint

-- 4. Add foreign keys for member table
ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- 5. Add foreign keys for invitation table
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- 6. Add columns to user table
ALTER TABLE "user" ADD COLUMN "role" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banReason" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banExpires" timestamp;
--> statement-breakpoint

-- 7. Add activeOrganizationId to session table
ALTER TABLE "session" ADD COLUMN "activeOrganizationId" text;
--> statement-breakpoint

-- ============================================================================
-- 8. Transform system_settings: singleton integer PK -> uuid PK + organization_id
-- ============================================================================

-- 8a. Drop the singleton check constraint
ALTER TABLE "system_settings" DROP CONSTRAINT "singleton_row";
--> statement-breakpoint

-- 8b. Add a temporary uuid column
ALTER TABLE "system_settings" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
--> statement-breakpoint

-- 8c. Drop the old integer primary key
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_pkey";
--> statement-breakpoint

-- 8d. Drop the old id column
ALTER TABLE "system_settings" DROP COLUMN "id";
--> statement-breakpoint

-- 8e. Rename new_id to id
ALTER TABLE "system_settings" RENAME COLUMN "new_id" TO "id";
--> statement-breakpoint

-- 8f. Make id NOT NULL and set as primary key
ALTER TABLE "system_settings" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");
--> statement-breakpoint

-- 8g. Add organization_id to system_settings (nullable for now)
ALTER TABLE "system_settings" ADD COLUMN "organization_id" text;
--> statement-breakpoint

-- 8h. Add unique constraint and FK on organization_id (will enforce NOT NULL later)
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_unique" UNIQUE("organization_id");
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- 8i. Add index on organization_id
CREATE INDEX "system_settings_org_id_idx" ON "system_settings" USING btree ("organization_id");
--> statement-breakpoint

-- ============================================================================
-- 9. Add organization_id (nullable) to all 26 data tables + indexes
-- ============================================================================

-- seasons
ALTER TABLE "seasons" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "seasons_org_id_idx" ON "seasons" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- teams
ALTER TABLE "teams" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "teams_org_id_idx" ON "teams" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- players
ALTER TABLE "players" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "players_org_id_idx" ON "players" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- venues
ALTER TABLE "venues" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "venues_org_id_idx" ON "venues" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- news
ALTER TABLE "news" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "news_org_id_idx" ON "news" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- pages
ALTER TABLE "pages" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "pages_org_id_idx" ON "pages" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Update pages unique constraint to include organization_id
ALTER TABLE "pages" DROP CONSTRAINT "pages_slug_parent_unique";
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_slug_parent_org_unique" UNIQUE NULLS NOT DISTINCT("slug","parent_id","organization_id");
--> statement-breakpoint

-- sponsors
ALTER TABLE "sponsors" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "sponsors_org_id_idx" ON "sponsors" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- documents
ALTER TABLE "documents" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "documents_org_id_idx" ON "documents" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- trikots
ALTER TABLE "trikots" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "trikots_org_id_idx" ON "trikots" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "trikots" ADD CONSTRAINT "trikots_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- divisions
ALTER TABLE "divisions" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "divisions_org_id_idx" ON "divisions" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- contracts
ALTER TABLE "contracts" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "contracts_org_id_idx" ON "contracts" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- team_trikots
ALTER TABLE "team_trikots" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "team_trikots_org_id_idx" ON "team_trikots" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "team_trikots" ADD CONSTRAINT "team_trikots_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- page_aliases
ALTER TABLE "page_aliases" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "page_aliases_org_id_idx" ON "page_aliases" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "page_aliases" ADD CONSTRAINT "page_aliases_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- rounds
ALTER TABLE "rounds" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "rounds_org_id_idx" ON "rounds" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- team_divisions
ALTER TABLE "team_divisions" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "team_divisions_org_id_idx" ON "team_divisions" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "team_divisions" ADD CONSTRAINT "team_divisions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- games
ALTER TABLE "games" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "games_org_id_idx" ON "games" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- standings
ALTER TABLE "standings" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "standings_org_id_idx" ON "standings" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- bonus_points
ALTER TABLE "bonus_points" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "bonus_points_org_id_idx" ON "bonus_points" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- game_events
ALTER TABLE "game_events" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "game_events_org_id_idx" ON "game_events" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- game_lineups
ALTER TABLE "game_lineups" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "game_lineups_org_id_idx" ON "game_lineups" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "game_lineups" ADD CONSTRAINT "game_lineups_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- game_suspensions
ALTER TABLE "game_suspensions" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "game_suspensions_org_id_idx" ON "game_suspensions" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "game_suspensions" ADD CONSTRAINT "game_suspensions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- goalie_game_stats
ALTER TABLE "goalie_game_stats" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "goalie_game_stats_org_id_idx" ON "goalie_game_stats" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- player_season_stats
ALTER TABLE "player_season_stats" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "player_season_stats_org_id_idx" ON "player_season_stats" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- goalie_season_stats
ALTER TABLE "goalie_season_stats" ADD COLUMN "organization_id" text;
--> statement-breakpoint
CREATE INDEX "goalie_season_stats_org_id_idx" ON "goalie_season_stats" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "goalie_season_stats" ADD CONSTRAINT "goalie_season_stats_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ============================================================================
-- 10. Drop user_roles table and user_role enum type
-- ============================================================================

-- Drop FK constraint on user_roles first
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_team_id_teams_id_fk";
--> statement-breakpoint

-- Drop the user_roles table
DROP TABLE "user_roles";
--> statement-breakpoint

-- Drop the user_role enum type
DROP TYPE "public"."user_role";
