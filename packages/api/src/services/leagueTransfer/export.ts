import type { Database } from "@puckhub/db"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { buildAttachments, collectImageUrls } from "./attachments"
import { EXPORT_REGISTRY, getSortedRegistryEntries, pluralize } from "./registry"
import type { PuckHubExport } from "./schema"

// Convert Decimal/Date fields to portable strings
function sanitizeRecord(record: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      result[key] = value
    } else if (typeof value === "object" && typeof value.toFixed === "function") {
      // Decimal
      result[key] = value.toString()
    } else if (value instanceof Date) {
      result[key] = value.toISOString()
    } else {
      result[key] = value
    }
  }
  return result
}

export async function buildLeagueExport(db: Database, organizationId: string): Promise<PuckHubExport> {
  // 1. Fetch org
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logo: true, metadata: true },
  })
  if (!org) {
    throw createAppError("NOT_FOUND", APP_ERROR_CODES.ORG_NOT_FOUND, "Organisation nicht gefunden")
  }

  // 2. Fetch system settings
  const settings = await db.systemSettings.findUnique({
    where: { organizationId },
  })

  // 3. Fetch all data tables in parallel
  const sortedEntries = getSortedRegistryEntries()
  const results = await Promise.all(
    sortedEntries.map(async ([modelName]) => {
      const delegate = (db as any)[modelName]
      if (!delegate?.findMany) {
        throw createAppError(
          "INTERNAL_SERVER_ERROR",
          APP_ERROR_CODES.EXPORT_FAILED,
          `Model ${modelName} not found in Prisma client`,
        )
      }
      const records = await delegate.findMany({ where: { organizationId } })
      return [modelName, records] as [string, any[]]
    }),
  )

  // 4. Build global reference maps for reverse-lookup during export
  const penaltyTypes = await db.penaltyType.findMany()
  const penaltyTypeMap = new Map(penaltyTypes.map((pt) => [pt.id, pt.code]))

  const trikotTemplates = await db.trikotTemplate.findMany()
  const trikotTemplateMap = new Map(trikotTemplates.map((tt) => [tt.id, tt.name]))

  const globalRefMaps: Record<string, Map<string, string>> = {
    penaltyType: penaltyTypeMap,
    trikotTemplate: trikotTemplateMap,
  }

  // 5. Process records: strip organizationId, resolve global refs, sanitize types
  const dataMap: Record<string, any[]> = {}
  for (const [modelName, records] of results) {
    const config = EXPORT_REGISTRY[modelName]!
    dataMap[modelName] = records.map((record: any) => {
      const cleaned = { ...record }
      delete cleaned.organizationId

      // Resolve global refs to natural keys
      if (config.globalRefs) {
        for (const [fkField, ref] of Object.entries(config.globalRefs)) {
          const refMap = globalRefMaps[ref.model]
          if (refMap && cleaned[fkField]) {
            const naturalKey = refMap.get(cleaned[fkField])
            if (naturalKey) {
              // Store original ID as _ref for import, replace with natural key
              cleaned[`_${fkField}_ref`] = naturalKey
            }
          }
        }
      }

      // Nullify author-type fields on export
      if (config.nullifyOnImport) {
        for (const field of config.nullifyOnImport) {
          cleaned[field] = null
        }
      }

      return sanitizeRecord(cleaned)
    })
  }

  // 6. Build attachments
  const urls = collectImageUrls({ logo: org.logo }, dataMap)
  const { attachments, warnings } = await buildAttachments(urls)

  if (warnings.length > 0) {
    console.warn("[LeagueExport] Attachment warnings:", warnings)
  }

  // 7. Assemble export object with all entity arrays
  const entityArrays: Record<string, Record<string, any>[]> = {}
  for (const [modelName] of sortedEntries) {
    const key = pluralize(modelName)
    entityArrays[key] = dataMap[modelName] ?? []
  }

  const exportData = {
    _meta: {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      generator: "puckhub-cms" as const,
      sourceOrganizationId: organizationId,
      sourceOrganizationName: org.name,
    },
    organization: {
      name: org.name,
      logo: org.logo,
      metadata: org.metadata,
    },
    systemSettings: settings
      ? {
          leagueName: settings.leagueName,
          leagueShortName: settings.leagueShortName,
          locale: settings.locale,
          timezone: settings.timezone,
          pointsWin: settings.pointsWin,
          pointsDraw: settings.pointsDraw,
          pointsLoss: settings.pointsLoss,
        }
      : null,
    _attachments: attachments,
    ...entityArrays,
  } as PuckHubExport

  return exportData
}
