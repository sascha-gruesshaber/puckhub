/*
  Warnings:

  - You are about to drop the column `slug` on the `organization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "organization_slug_key";

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "slug";
