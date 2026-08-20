-- AlterTable: link a contract to the earlier contract it continues
-- (position/jersey split, or a contract carried over by a team merge)
ALTER TABLE "contracts" ADD COLUMN "previous_contract_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "contracts_previous_contract_id_key" ON "contracts"("previous_contract_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_previous_contract_id_fkey" FOREIGN KEY ("previous_contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: former names of a team (written on rename / team merge)
CREATE TABLE "team_name_history" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "until_season_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_name_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_name_history_org_id_idx" ON "team_name_history"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_name_history_team_id_until_season_id_key" ON "team_name_history"("team_id", "until_season_id");

-- AddForeignKey
ALTER TABLE "team_name_history" ADD CONSTRAINT "team_name_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_name_history" ADD CONSTRAINT "team_name_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_name_history" ADD CONSTRAINT "team_name_history_until_season_id_fkey" FOREIGN KEY ("until_season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
