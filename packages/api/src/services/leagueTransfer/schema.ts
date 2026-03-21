import { z } from "zod"

const attachmentSchema = z.object({
  data: z.string(),
  mimeType: z.string(),
})

const metaSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  generator: z.literal("puckhub-cms"),
  sourceOrganizationId: z.string(),
  sourceOrganizationName: z.string(),
})

const organizationSchema = z.object({
  name: z.string().min(1),
  logo: z.string().nullable(),
  metadata: z.string().nullable(),
})

const systemSettingsSchema = z
  .object({
    leagueName: z.string(),
    leagueShortName: z.string(),
    locale: z.string(),
    timezone: z.string(),
    pointsWin: z.number().int(),
    pointsDraw: z.number().int(),
    pointsLoss: z.number().int(),
  })
  .nullable()

// Generic record schema: all entity arrays contain objects with at least an id
const entityRecord = z.record(z.string(), z.any())
const entityArray = z.array(entityRecord).default([])

export const leagueExportSchema = z
  .object({
    _meta: metaSchema,
    organization: organizationSchema,
    systemSettings: systemSettingsSchema,
    _attachments: z.record(z.string(), attachmentSchema).default({}),
    // Entity arrays — use passthrough to allow all pluralized model keys
    seasons: entityArray,
    divisions: entityArray,
    rounds: entityArray,
    teams: entityArray,
    teamDivisions: entityArray,
    players: entityArray,
    contracts: entityArray,
    trikots: entityArray,
    teamTrikots: entityArray,
    games: entityArray,
    gameLineups: entityArray,
    gameEvents: entityArray,
    gameSuspensions: entityArray,
    goalieGameStats: entityArray,
    bonusPoints: entityArray,
    sponsors: entityArray,
    news: entityArray,
    pages: entityArray,
    pageAliases: entityArray,
    documents: entityArray,
    websiteConfigs: entityArray,
  })
  .passthrough()

export type PuckHubExport = z.infer<typeof leagueExportSchema>
