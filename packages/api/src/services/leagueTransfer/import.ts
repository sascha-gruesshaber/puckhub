import { randomUUID } from "node:crypto"
import type { Database } from "@puckhub/db"
import { recalculateGoalieStats, recalculatePlayerStats, recalculateStandings } from "@puckhub/db/services"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { IMAGE_FIELDS, rewriteNewsContent, rewriteUrls, writeAttachments } from "./attachments"
import { EXPORT_REGISTRY, getSortedRegistryEntries, pluralize } from "./registry"
import type { PuckHubExport } from "./schema"

export interface ImportResult {
  organizationId: string
  organizationName: string
  summary: Record<string, number>
}

export interface ImportOptions {
  /** Override the organization (and league) name instead of using the exported one. */
  name?: string
}

export async function importLeagueData(
  db: Database,
  data: PuckHubExport,
  callerUserId: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  // 1. Validate version
  if (data._meta.version !== 1) {
    throw createAppError(
      "BAD_REQUEST",
      APP_ERROR_CODES.IMPORT_VERSION_UNSUPPORTED,
      `Unsupported export version: ${data._meta.version}`,
    )
  }

  const sourceOrgId = data._meta.sourceOrganizationId
  const newOrgId = randomUUID()
  const orgName = options.name || data.organization.name

  // 2. Build global reference maps from the target DB
  const penaltyTypes = await db.penaltyType.findMany()
  const penaltyCodeToId = new Map(penaltyTypes.map((pt) => [pt.code, pt.id]))

  const trikotTemplates = await db.trikotTemplate.findMany()
  const trikotNameToId = new Map(trikotTemplates.map((tt) => [tt.name, tt.id]))

  const globalRefResolvers: Record<string, Map<string, string>> = {
    penaltyType: penaltyCodeToId,
    trikotTemplate: trikotNameToId,
  }

  // 3. Pre-generate all new UUIDs: oldId -> newId
  const idMap = new Map<string, string>()
  const sortedEntries = getSortedRegistryEntries()
  const summary: Record<string, number> = {}

  for (const [modelName] of sortedEntries) {
    const key = pluralize(modelName)
    const records: any[] = (data as any)[key] ?? []
    summary[key] = records.length
    for (const record of records) {
      if (record.id) {
        idMap.set(record.id, randomUUID())
      }
    }
  }

  // Helper: remap a single FK field value
  function remapId(value: string | null | undefined, fkTarget: string, modelName: string): string | null {
    if (!value) return null
    const newId = idMap.get(value)
    if (!newId) {
      throw createAppError(
        "BAD_REQUEST",
        APP_ERROR_CODES.IMPORT_VALIDATION_FAILED,
        `Missing ID mapping for ${fkTarget} ref in ${modelName}: ${value}`,
      )
    }
    return newId
  }

  // 4. Run everything in a transaction
  await db.$transaction(
    async (tx) => {
      // Create Organization
      // Generate slug from org name
      let orgSlug = orgName
        .toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      if (!orgSlug) orgSlug = newOrgId.slice(0, 8)
      let baseSlug = orgSlug
      let counter = 1
      while (await tx.organization.findFirst({ where: { slug: orgSlug } })) {
        orgSlug = `${baseSlug}-${counter++}`
      }

      await tx.organization.create({
        data: {
          id: newOrgId,
          name: orgName,
          slug: orgSlug,
          logo: data.organization.logo,
          metadata: data.organization.metadata,
        },
      })

      // Create SystemSettings
      if (data.systemSettings) {
        await tx.systemSettings.create({
          data: {
            organizationId: newOrgId,
            leagueName: options.name || data.systemSettings.leagueName,
            leagueShortName: data.systemSettings.leagueShortName,
            locale: data.systemSettings.locale,
            timezone: data.systemSettings.timezone,
            pointsWin: data.systemSettings.pointsWin,
            pointsDraw: data.systemSettings.pointsDraw,
            pointsLoss: data.systemSettings.pointsLoss,
          },
        })
      }

      // Process each entity in dependency order
      for (const [modelName, config] of sortedEntries) {
        const key = pluralize(modelName)
        const records: any[] = (data as any)[key] ?? []
        if (records.length === 0) continue

        const delegate = (tx as any)[modelName]

        // Self-referential model (page): BFS level-by-level insert
        if (config.selfRef) {
          await insertSelfRefRecords(delegate, records, modelName, config, newOrgId, idMap, globalRefResolvers)
          continue
        }

        // Normal model: batch createMany
        const mappedRecords = records.map((record: any) => {
          const mapped = { ...record }

          // Set new ID
          mapped.id = idMap.get(record.id) ?? randomUUID()

          // Set org ID
          mapped.organizationId = newOrgId

          // Remap FK fields
          for (const [fkField, fkTarget] of Object.entries(config.fkFields)) {
            mapped[fkField] = remapId(record[fkField], fkTarget, modelName)
          }

          // Resolve global refs
          if (config.globalRefs) {
            for (const [fkField, ref] of Object.entries(config.globalRefs)) {
              const refKey = record[`_${fkField}_ref`]
              if (refKey) {
                const resolver = globalRefResolvers[ref.model]
                const resolvedId = resolver?.get(refKey)
                if (!resolvedId) {
                  throw createAppError(
                    "BAD_REQUEST",
                    APP_ERROR_CODES.IMPORT_REFERENCE_MISSING,
                    `Global reference not found: ${ref.model}.${ref.key} = "${refKey}"`,
                  )
                }
                mapped[fkField] = resolvedId
              }
              // Remove the temporary _ref field
              delete mapped[`_${fkField}_ref`]
            }
          }

          // Nullify fields
          if (config.nullifyOnImport) {
            for (const field of config.nullifyOnImport) {
              mapped[field] = null
            }
          }

          // Remove relation fields and updatedAt (let DB handle it)
          delete mapped.updatedAt

          return mapped
        })

        await delegate.createMany({ data: mappedRecords })
      }

      // Create Member + owner role for the calling user
      const memberId = randomUUID()
      await tx.member.create({
        data: {
          id: memberId,
          userId: callerUserId,
          organizationId: newOrgId,
          role: "owner",
        },
      })
      await tx.memberRole.create({
        data: {
          memberId,
          role: "owner",
        },
      })
    },
    { timeout: 120_000 },
  )

  // 5. Write attachments to disk (outside transaction)
  if (data._attachments && Object.keys(data._attachments).length > 0) {
    // Rewrite org logo URL
    if (data.organization.logo) {
      await db.organization.update({
        where: { id: newOrgId },
        data: { logo: data.organization.logo.replace(sourceOrgId, newOrgId) },
      })
    }

    // Rewrite image URLs in records
    for (const [modelName, fields] of Object.entries(IMAGE_FIELDS)) {
      const delegate = (db as any)[modelName]
      const records = await delegate.findMany({
        where: { organizationId: newOrgId },
        select: { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) },
      })
      for (const record of records) {
        const updates: Record<string, string> = {}
        let hasUpdate = false
        for (const field of fields) {
          if (record[field] && typeof record[field] === "string" && record[field].includes(sourceOrgId)) {
            updates[field] = record[field].replace(sourceOrgId, newOrgId)
            hasUpdate = true
          }
        }
        if (hasUpdate) {
          await delegate.update({ where: { id: record.id }, data: updates })
        }
      }
    }

    // Rewrite news content URLs
    const newsRecords = await db.news.findMany({
      where: { organizationId: newOrgId },
      select: { id: true, content: true },
    })
    for (const news of newsRecords) {
      if (news.content.includes(sourceOrgId)) {
        await db.news.update({
          where: { id: news.id },
          data: { content: rewriteNewsContent(news.content, sourceOrgId, newOrgId) },
        })
      }
    }

    await writeAttachments(data._attachments, sourceOrgId, newOrgId)
  }

  // 6. Recalculate standings and stats
  const seasons = await db.season.findMany({
    where: { organizationId: newOrgId },
    select: { id: true },
  })
  const rounds = await db.round.findMany({
    where: { organizationId: newOrgId },
    select: { id: true },
  })

  for (const round of rounds) {
    await recalculateStandings(db, round.id, newOrgId)
  }
  for (const season of seasons) {
    await recalculatePlayerStats(db, season.id, newOrgId)
    await recalculateGoalieStats(db, season.id, newOrgId)
  }

  return {
    organizationId: newOrgId,
    organizationName: orgName,
    summary,
  }
}

// BFS insert for self-referential models (pages with parentId)
async function insertSelfRefRecords(
  delegate: any,
  records: any[],
  modelName: string,
  config: any,
  newOrgId: string,
  idMap: Map<string, string>,
  globalRefResolvers: Record<string, Map<string, string>>,
): Promise<void> {
  // Build parent-child graph
  const childrenMap = new Map<string | null, any[]>()
  for (const record of records) {
    const parentId = record.parentId ?? null
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, [])
    childrenMap.get(parentId)!.push(record)
  }

  // BFS: start with roots (parentId = null), then process level by level
  const queue: Array<string | null> = [null]
  while (queue.length > 0) {
    const parentId = queue.shift()!
    const children = childrenMap.get(parentId) ?? []
    if (children.length === 0) continue

    const mappedRecords = children.map((record: any) => {
      const mapped = { ...record }
      mapped.id = idMap.get(record.id) ?? randomUUID()
      mapped.organizationId = newOrgId

      // Remap FK fields
      for (const [fkField, fkTarget] of Object.entries(config.fkFields as Record<string, string>)) {
        if (fkField === "parentId") {
          mapped[fkField] = record[fkField] ? (idMap.get(record[fkField]) ?? null) : null
        } else {
          mapped[fkField] = record[fkField] ? (idMap.get(record[fkField]) ?? null) : null
        }
      }

      delete mapped.updatedAt
      return mapped
    })

    await delegate.createMany({ data: mappedRecords })

    // Queue children of this level
    for (const child of children) {
      if (childrenMap.has(child.id)) {
        queue.push(child.id)
      }
    }
  }
}
