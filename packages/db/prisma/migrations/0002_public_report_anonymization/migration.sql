-- Add anonymized public report submitter fields
ALTER TABLE "public_game_reports"
  ADD COLUMN "submitter_email_hash" TEXT,
  ADD COLUMN "submitter_email_masked" TEXT,
  ADD COLUMN "submitter_ip_hash" TEXT;

-- Drop raw personal data fields
ALTER TABLE "public_game_reports"
  DROP COLUMN "submitter_email",
  DROP COLUMN "submitter_ip";

CREATE INDEX "public_game_reports_org_email_hash_idx"
  ON "public_game_reports"("organization_id", "submitter_email_hash");

CREATE INDEX "public_game_reports_org_ip_hash_idx"
  ON "public_game_reports"("organization_id", "submitter_ip_hash");
