-- AlterTable: Plan - add feature_public_reports flag
ALTER TABLE "plans" ADD COLUMN "feature_public_reports" BOOLEAN NOT NULL DEFAULT false;
