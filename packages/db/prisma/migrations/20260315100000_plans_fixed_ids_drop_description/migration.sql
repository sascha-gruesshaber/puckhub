-- AlterTable: drop description, remove default from id (fixed UUIDs)
ALTER TABLE "plans" DROP COLUMN IF EXISTS "description";
ALTER TABLE "plans" ALTER COLUMN "id" DROP DEFAULT;
