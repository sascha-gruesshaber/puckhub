-- AlterTable: Add AI description fields to seasons
ALTER TABLE "seasons" ADD COLUMN "ai_description" TEXT;
ALTER TABLE "seasons" ADD COLUMN "ai_description_short" TEXT;
ALTER TABLE "seasons" ADD COLUMN "ai_description_generated_at" TIMESTAMPTZ;
ALTER TABLE "seasons" ADD COLUMN "ai_description_generating" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add season_id to ai_usage_log
ALTER TABLE "ai_usage_log" ADD COLUMN "season_id" UUID;

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
