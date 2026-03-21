-- Create enum for trikot assignment types
CREATE TYPE "trikot_assignment_type" AS ENUM ('home', 'away', 'alternate', 'custom');

-- Add assignment_type column with default 'custom' for existing rows
ALTER TABLE "team_trikots" ADD COLUMN "assignment_type" "trikot_assignment_type" NOT NULL DEFAULT 'custom';

-- Backfill: infer home/away from existing name values
UPDATE "team_trikots" SET "assignment_type" = 'home'
  WHERE LOWER("name") IN ('home', 'heim', 'heimtrikot', 'heim-trikot');
UPDATE "team_trikots" SET "assignment_type" = 'away'
  WHERE LOWER("name") IN ('away', 'auswärts', 'auswärtstrikot', 'auswärts-trikot');
UPDATE "team_trikots" SET "assignment_type" = 'alternate'
  WHERE LOWER("name") IN ('alternate', 'alternativ', 'third', 'third jersey', 'drittes trikot');
