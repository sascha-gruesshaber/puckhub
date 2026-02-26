import type { Database } from "@puckhub/db"
import { EXPORT_REGISTRY, getSortedRegistryEntries, pluralize } from "./registry"
import type { PuckHubExport } from "./schema"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: Record<string, number>
}

export async function validateLeagueData(db: Database, data: PuckHubExport): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const summary: Record<string, number> = {}

  // 1. Check version
  if (data._meta.version !== 1) {
    errors.push(`Unsupported export version: ${data._meta.version}`)
    return { valid: false, errors, warnings, summary }
  }

  // 2. Check organization data
  if (!data.organization?.name) {
    errors.push("Missing organization name")
  }

  // 3. Collect all IDs from all entity arrays
  const allIds = new Set<string>()
  const idsByModel = new Map<string, Set<string>>()
  const sortedEntries = getSortedRegistryEntries()

  for (const [modelName] of sortedEntries) {
    const key = pluralize(modelName)
    const records: any[] = (data as any)[key] ?? []
    summary[key] = records.length

    const modelIds = new Set<string>()
    for (const record of records) {
      if (record.id) {
        if (allIds.has(record.id)) {
          errors.push(`Duplicate ID found: ${record.id} in ${modelName}`)
        }
        allIds.add(record.id)
        modelIds.add(record.id)
      }
    }
    idsByModel.set(modelName, modelIds)
  }

  // 4. Validate FK references
  for (const [modelName, config] of sortedEntries) {
    const key = pluralize(modelName)
    const records: any[] = (data as any)[key] ?? []

    for (const record of records) {
      for (const [fkField, fkTarget] of Object.entries(config.fkFields)) {
        const value = record[fkField]
        if (value === null || value === undefined) continue

        const targetIds = idsByModel.get(fkTarget)
        if (targetIds && !targetIds.has(value)) {
          errors.push(`${modelName}.${fkField} references missing ${fkTarget} ID: ${value}`)
        }
      }
    }
  }

  // 5. Check global references exist in the target DB
  const globalRefChecks: Array<{ model: string; key: string; values: Set<string> }> = []

  for (const [modelName, config] of sortedEntries) {
    if (!config.globalRefs) continue
    const key = pluralize(modelName)
    const records: any[] = (data as any)[key] ?? []

    for (const [fkField, ref] of Object.entries(config.globalRefs)) {
      const refKey = `_${fkField}_ref`
      const values = new Set<string>()
      for (const record of records) {
        if (record[refKey]) values.add(record[refKey])
      }
      if (values.size > 0) {
        globalRefChecks.push({ model: ref.model, key: ref.key, values })
      }
    }
  }

  // Verify penalty types
  const penaltyRefCheck = globalRefChecks.find((c) => c.model === "penaltyType")
  if (penaltyRefCheck) {
    const existing = await db.penaltyType.findMany({ select: { code: true } })
    const existingCodes = new Set(existing.map((pt) => pt.code))
    for (const code of penaltyRefCheck.values) {
      if (!existingCodes.has(code)) {
        errors.push(`Missing penalty type: ${code}`)
      }
    }
  }

  // Verify trikot templates
  const trikotRefCheck = globalRefChecks.find((c) => c.model === "trikotTemplate")
  if (trikotRefCheck) {
    const existing = await db.trikotTemplate.findMany({ select: { name: true } })
    const existingNames = new Set(existing.map((tt) => tt.name))
    for (const name of trikotRefCheck.values) {
      if (!existingNames.has(name)) {
        errors.push(`Missing trikot template: ${name}`)
      }
    }
  }

  // 6. Warnings for empty entity arrays
  for (const [modelName] of sortedEntries) {
    const key = pluralize(modelName)
    const records: any[] = (data as any)[key] ?? []
    if (records.length === 0) {
      warnings.push(`No ${key} found in export`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  }
}
