-- AlterEnum
ALTER TYPE "game_event_type" ADD VALUE 'note';

-- AlterTable: make columns nullable for note events
ALTER TABLE "game_events" ALTER COLUMN "team_id" DROP NOT NULL;
ALTER TABLE "game_events" ALTER COLUMN "period" DROP NOT NULL;
ALTER TABLE "game_events" ALTER COLUMN "time_minutes" DROP NOT NULL;
ALTER TABLE "game_events" ALTER COLUMN "time_seconds" DROP NOT NULL;

-- AlterTable: add note columns
ALTER TABLE "game_events" ADD COLUMN "note_text" TEXT;
ALTER TABLE "game_events" ADD COLUMN "note_public" BOOLEAN NOT NULL DEFAULT true;

-- RenameIndex
ALTER INDEX "public_game_reports_org_email_hash_idx" RENAME TO "public_game_reports_organization_id_submitter_email_hash_idx";

-- RenameIndex
ALTER INDEX "public_game_reports_org_ip_hash_idx" RENAME TO "public_game_reports_organization_id_submitter_ip_hash_idx";
