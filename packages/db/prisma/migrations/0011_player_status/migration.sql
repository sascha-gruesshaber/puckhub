-- CreateEnum
CREATE TYPE "player_status" AS ENUM ('hobby', 'licensed', 'tryout', 'inactive');

-- AlterTable
ALTER TABLE "players" ADD COLUMN "status" "player_status" NOT NULL DEFAULT 'hobby';
