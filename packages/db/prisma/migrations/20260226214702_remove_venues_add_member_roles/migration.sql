/*
  Warnings:

  - You are about to drop the column `venue_id` on the `games` table. All the data in the column will be lost.
  - You are about to drop the column `default_venue_id` on the `teams` table. All the data in the column will be lost.
  - You are about to drop the `venues` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "org_role" AS ENUM ('owner', 'admin', 'game_manager', 'game_reporter', 'team_manager', 'editor');

-- DropForeignKey
ALTER TABLE "games" DROP CONSTRAINT "games_venue_id_fkey";

-- DropForeignKey
ALTER TABLE "teams" DROP CONSTRAINT "teams_default_venue_id_fkey";

-- DropForeignKey
ALTER TABLE "venues" DROP CONSTRAINT "venues_organization_id_fkey";

-- DropIndex
DROP INDEX "games_venue_id_idx";

-- AlterTable
ALTER TABLE "games" DROP COLUMN "venue_id",
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "teams" DROP COLUMN "default_venue_id",
ADD COLUMN     "home_venue" TEXT;

-- DropTable
DROP TABLE "venues";

-- CreateTable
CREATE TABLE "member_role" (
    "id" UUID NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" "org_role" NOT NULL,
    "team_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_role_member_id_idx" ON "member_role"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_role_member_id_role_team_id_key" ON "member_role"("member_id", "role", "team_id");

-- AddForeignKey
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
