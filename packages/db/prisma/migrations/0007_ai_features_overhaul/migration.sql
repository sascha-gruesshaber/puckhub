-- Part A: Rename plan feature flag
ALTER TABLE "plans" RENAME COLUMN "feature_ai_recaps" TO "feature_ai";

-- Part B: Add granular AI feature toggles to organizations
ALTER TABLE "organization" ADD COLUMN "ai_game_recaps" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization" ADD COLUMN "ai_news_seo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization" ADD COLUMN "ai_page_seo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization" ADD COLUMN "ai_widget_league_pulse" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organization" ADD COLUMN "ai_widget_headlines_ticker" BOOLEAN NOT NULL DEFAULT false;

-- Part C: AI Home Widgets
CREATE TYPE "ai_home_widget_type" AS ENUM ('league_pulse_digest', 'headlines_ticker');

CREATE TABLE "ai_home_widgets" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "season_id" UUID NOT NULL,
    "widget_type" "ai_home_widget_type" NOT NULL,
    "content" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generating" BOOLEAN NOT NULL DEFAULT false,
    "data_hash" TEXT,

    CONSTRAINT "ai_home_widgets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_home_widgets_organization_id_season_id_widget_type_key" ON "ai_home_widgets"("organization_id", "season_id", "widget_type");
CREATE INDEX "ai_home_widgets_org_id_idx" ON "ai_home_widgets"("organization_id");

ALTER TABLE "ai_home_widgets" ADD CONSTRAINT "ai_home_widgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_home_widgets" ADD CONSTRAINT "ai_home_widgets_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
