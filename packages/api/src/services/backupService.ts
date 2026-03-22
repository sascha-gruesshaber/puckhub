import { gzipSync } from "node:zlib"
import type { Database } from "@puckhub/db"
import { deleteBackupObject, getBackupDownloadUrl as getS3DownloadUrl, uploadBackup } from "../lib/s3"
import { buildLeagueExport } from "./leagueTransfer/export"

/**
 * Create a backup for an organization by exporting all league data,
 * compressing it, and uploading to S3-compatible storage.
 */
export async function createBackup(db: Database, organizationId: string) {
  console.log(`[backup] Creating backup for org ${organizationId}...`)

  const exportData = await buildLeagueExport(db, organizationId)
  const json = JSON.stringify(exportData)
  const compressed = gzipSync(Buffer.from(json, "utf-8"))

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const storageKey = `backups/${organizationId}/${timestamp}.json.gz`

  await uploadBackup(storageKey, compressed)

  const backup = await db.backup.create({
    data: {
      organizationId,
      storageKey,
      sizeBytes: compressed.length,
    },
  })

  console.log(`[backup] Created backup ${backup.id} (${(compressed.length / 1024).toFixed(1)} KB)`)
  return backup
}

/**
 * Enforce rolling retention: keep only the N most recent backups,
 * delete older ones from both S3 and the database.
 */
export async function enforceRetention(db: Database, organizationId: string, maxBackups: number) {
  const backups = await db.backup.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })

  if (backups.length <= maxBackups) return

  const toDelete = backups.slice(maxBackups)
  for (const backup of toDelete) {
    try {
      await deleteBackupObject(backup.storageKey)
    } catch (err) {
      console.warn(`[backup] Failed to delete S3 object ${backup.storageKey}:`, err)
    }
    await db.backup.delete({ where: { id: backup.id } })
  }

  console.log(`[backup] Pruned ${toDelete.length} old backup(s) for org ${organizationId}`)
}

/**
 * Check whether a backup should run based on the frequency setting.
 * Returns true if no previous backup exists or enough time has elapsed.
 */
export async function shouldRunBackup(
  db: Database,
  organizationId: string,
  frequencyDays: number,
): Promise<boolean> {
  const latest = await db.backup.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  if (!latest) return true

  const elapsed = Date.now() - latest.createdAt.getTime()
  const thresholdMs = frequencyDays * 24 * 60 * 60 * 1000
  return elapsed >= thresholdMs
}

/**
 * Generate a pre-signed download URL for a backup.
 * Verifies the backup belongs to the given organization.
 */
export async function getBackupUrl(
  db: Database,
  backupId: string,
  organizationId: string,
): Promise<string> {
  const backup = await db.backup.findFirst({
    where: { id: backupId, organizationId },
  })
  if (!backup) {
    throw new Error("Backup not found")
  }
  return getS3DownloadUrl(backup.storageKey)
}

/**
 * List all backups for an organization, newest first.
 */
export async function listBackups(db: Database, organizationId: string) {
  return db.backup.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sizeBytes: true,
      createdAt: true,
    },
  })
}
