-- AlterTable: Remove AI description fields from seasons (keep ai_description_short for SEO)
ALTER TABLE "seasons" DROP COLUMN IF EXISTS "ai_description";
ALTER TABLE "seasons" DROP COLUMN IF EXISTS "ai_description_generated_at";
ALTER TABLE "seasons" DROP COLUMN IF EXISTS "ai_description_generating";
