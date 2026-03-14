-- AlterTable: Organization - add ai_enabled
ALTER TABLE "organization" ADD COLUMN "ai_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Game - add recap fields
ALTER TABLE "games" ADD COLUMN "recap_title" TEXT;
ALTER TABLE "games" ADD COLUMN "recap_content" TEXT;
ALTER TABLE "games" ADD COLUMN "recap_generated_at" TIMESTAMPTZ;
ALTER TABLE "games" ADD COLUMN "recap_generating" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Plan - add AI feature flags
ALTER TABLE "plans" ADD COLUMN "feature_ai_recaps" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "ai_monthly_token_limit" INTEGER;

-- CreateTable: AiUsageLog
CREATE TABLE "ai_usage_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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
CREATE INDEX "ai_usage_log_organization_id_created_at_idx" ON "ai_usage_log"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
