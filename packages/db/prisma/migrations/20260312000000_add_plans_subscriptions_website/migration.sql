-- CreateEnum
CREATE TYPE "plan_interval" AS ENUM ('monthly', 'yearly');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "website_config" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain" TEXT,
    "subdomain" TEXT,
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
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "price_monthly" INTEGER NOT NULL DEFAULT 0,
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
    "feature_export_import" BOOLEAN NOT NULL DEFAULT false,
    "feature_game_reports" BOOLEAN NOT NULL DEFAULT true,
    "feature_player_stats" BOOLEAN NOT NULL DEFAULT true,
    "feature_scheduler" BOOLEAN NOT NULL DEFAULT false,
    "feature_scheduled_news" BOOLEAN NOT NULL DEFAULT false,
    "feature_advanced_roles" BOOLEAN NOT NULL DEFAULT false,
    "feature_advanced_stats" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" UUID NOT NULL,
    "interval" "plan_interval" NOT NULL DEFAULT 'monthly',
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

-- CreateIndex
CREATE UNIQUE INDEX "website_config_organization_id_key" ON "website_config"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_config_domain_key" ON "website_config"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "website_config_subdomain_key" ON "website_config"("subdomain");

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
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- AddForeignKey
ALTER TABLE "website_config" ADD CONSTRAINT "website_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
