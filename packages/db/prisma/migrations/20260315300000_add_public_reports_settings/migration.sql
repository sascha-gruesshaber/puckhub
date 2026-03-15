-- AlterTable: SystemSettings - add public reports settings
ALTER TABLE "system_settings" ADD COLUMN "public_reports_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "system_settings" ADD COLUMN "public_reports_require_email" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "system_settings" ADD COLUMN "public_reports_bot_detection" BOOLEAN NOT NULL DEFAULT true;
