// --- Export Registry ---
// Every org-scoped model must appear here or in EXCLUDED_FROM_EXPORT.
// The safety-net test (schema coverage) ensures no new table is forgotten.

export interface GlobalRef {
  model: string
  key: string
}

export interface ModelConfig {
  order: number
  fkFields: Record<string, string>
  globalRefs?: Record<string, GlobalRef>
  selfRef?: boolean
  nullifyOnImport?: string[]
}

export const EXPORT_REGISTRY: Record<string, ModelConfig> = {
  season: { order: 1, fkFields: {} },
  division: { order: 2, fkFields: { seasonId: "season" } },
  round: { order: 3, fkFields: { divisionId: "division" } },
  team: { order: 4, fkFields: {} },
  teamDivision: { order: 5, fkFields: { teamId: "team", divisionId: "division" } },
  player: { order: 6, fkFields: {} },
  contract: {
    order: 7,
    fkFields: { playerId: "player", teamId: "team", startSeasonId: "season", endSeasonId: "season" },
  },
  trikot: {
    order: 8,
    fkFields: {},
    globalRefs: { templateId: { model: "trikotTemplate", key: "name" } },
  },
  teamTrikot: { order: 9, fkFields: { teamId: "team", trikotId: "trikot" } },
  game: { order: 10, fkFields: { roundId: "round", homeTeamId: "team", awayTeamId: "team" } },
  gameLineup: { order: 11, fkFields: { gameId: "game", playerId: "player", teamId: "team" } },
  gameEvent: {
    order: 12,
    fkFields: {
      gameId: "game",
      teamId: "team",
      scorerId: "player",
      assist1Id: "player",
      assist2Id: "player",
      goalieId: "player",
      penaltyPlayerId: "player",
    },
    globalRefs: { penaltyTypeId: { model: "penaltyType", key: "code" } },
  },
  gameSuspension: {
    order: 13,
    fkFields: { gameId: "game", gameEventId: "gameEvent", playerId: "player", teamId: "team" },
  },
  goalieGameStat: { order: 14, fkFields: { gameId: "game", playerId: "player", teamId: "team" } },
  bonusPoint: { order: 15, fkFields: { teamId: "team", roundId: "round" } },
  sponsor: { order: 16, fkFields: { teamId: "team" } },
  news: { order: 17, fkFields: {}, nullifyOnImport: ["authorId"] },
  page: { order: 18, fkFields: { parentId: "page" }, selfRef: true },
  pageAlias: { order: 19, fkFields: { targetPageId: "page" } },
  document: { order: 20, fkFields: {} },
} as const

export const EXCLUDED_FROM_EXPORT: Record<string, string> = {
  systemSettings: "exported separately as a singleton",
  member: "user-binding, not league data",
  invitation: "user-binding, not league data",
  standing: "recalculated on import",
  playerSeasonStat: "recalculated on import",
  goalieSeasonStat: "recalculated on import",
} as const

// Pluralize model name for JSON keys
export function pluralize(modelName: string): string {
  if (modelName.endsWith("s")) return `${modelName}es`
  if (modelName.endsWith("y") && !modelName.endsWith("ey")) return `${modelName.slice(0, -1)}ies`
  return `${modelName}s`
}

// Get the sorted registry entries by order
export function getSortedRegistryEntries(): Array<[string, ModelConfig]> {
  return Object.entries(EXPORT_REGISTRY).sort(([, a], [, b]) => a.order - b.order)
}

// Parse the Prisma schema file to find all models with organizationId field.
// Used by tests to validate registry completeness.
export function parseOrgScopedModelsFromSchema(schemaContent: string): string[] {
  const models: string[] = []
  const modelRegex = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  let match: RegExpExecArray | null = modelRegex.exec(schemaContent)

  while (match !== null) {
    const modelName = match[1]!
    const body = match[2]!
    if (body.includes("organizationId")) {
      // Convert PascalCase to camelCase
      models.push(modelName.charAt(0).toLowerCase() + modelName.slice(1))
    }
    match = modelRegex.exec(schemaContent)
  }
  return models
}

// Validate that every org-scoped model is accounted for
export function validateRegistryCompleteness(orgScopedModels: string[]): { valid: boolean; missing: string[] } {
  const covered = new Set([...Object.keys(EXPORT_REGISTRY), ...Object.keys(EXCLUDED_FROM_EXPORT), "organization"])
  const missing = orgScopedModels.filter((m) => !covered.has(m))
  return { valid: missing.length === 0, missing }
}
