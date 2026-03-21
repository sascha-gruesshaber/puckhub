-- Add trikot assignment columns to games
ALTER TABLE "games" ADD COLUMN "home_trikot_id" UUID;
ALTER TABLE "games" ADD COLUMN "away_trikot_id" UUID;

-- Foreign key constraints (SET NULL on delete so deleting a trikot doesn't break games)
ALTER TABLE "games" ADD CONSTRAINT "games_home_trikot_id_fkey" FOREIGN KEY ("home_trikot_id") REFERENCES "trikots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "games" ADD CONSTRAINT "games_away_trikot_id_fkey" FOREIGN KEY ("away_trikot_id") REFERENCES "trikots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for FK lookups
CREATE INDEX "games_home_trikot_id_idx" ON "games"("home_trikot_id");
CREATE INDEX "games_away_trikot_id_idx" ON "games"("away_trikot_id");
