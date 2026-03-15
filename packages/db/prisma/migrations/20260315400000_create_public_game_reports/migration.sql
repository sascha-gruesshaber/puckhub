-- CreateTable
CREATE TABLE "public_game_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" TEXT NOT NULL,
    "game_id" UUID NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,
    "comment" TEXT,
    "submitter_email" TEXT NOT NULL,
    "submitter_ip" TEXT,
    "reverted" BOOLEAN NOT NULL DEFAULT false,
    "reverted_by" TEXT,
    "reverted_at" TIMESTAMPTZ,
    "revert_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_game_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_game_reports_organization_id_idx" ON "public_game_reports"("organization_id");

-- CreateIndex
CREATE INDEX "public_game_reports_game_id_idx" ON "public_game_reports"("game_id");

-- AddForeignKey
ALTER TABLE "public_game_reports" ADD CONSTRAINT "public_game_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_game_reports" ADD CONSTRAINT "public_game_reports_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_game_reports" ADD CONSTRAINT "public_game_reports_reverted_by_fkey" FOREIGN KEY ("reverted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
