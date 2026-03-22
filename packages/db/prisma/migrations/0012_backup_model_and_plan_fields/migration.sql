-- AlterTable: Add backup fields to plans
ALTER TABLE "plans" ADD COLUMN "backup_frequency_days" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "plans" ADD COLUMN "max_backups" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: backups
CREATE TABLE "backups" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backups_organization_id_created_at_idx" ON "backups"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
