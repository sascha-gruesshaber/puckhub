/**
 * Which tables point at a team, and how `team.merge` moves them.
 *
 * Merging deletes the source team once its rows have been moved, and every team
 * reference cascades on delete — so a table that is missing here is not merged, it is
 * destroyed. The completeness test in `teamMerge.test.ts` parses `schema.prisma` and
 * fails when a new team-referencing model is not accounted for in one of these lists.
 */

/** Models with a plain `teamId` that the merge repoints in bulk. */
export const TEAM_SCOPED_MERGE_MODELS = [
  "contract",
  "gameEvent",
  "gameLineup",
  "gameSuspension",
  "standing",
  "bonusPoint",
  "teamDivision",
  "playerSeasonStat",
  "goalieSeasonStat",
  "goalieGameStat",
  "sponsor",
  "teamTrikot",
  "teamNameHistory",
] as const

export type TeamScopedMergeModel = (typeof TEAM_SCOPED_MERGE_MODELS)[number]

/** Models the merge handles by hand, with the reason they cannot be done in bulk. */
export const TEAM_MERGE_SPECIAL_MODELS: Record<string, string> = {
  game: "two team columns (home and away) that are moved separately",
  memberRole: "not organization-scoped, and unique per member, role and team",
}

/**
 * Model names (camelCase) that reference a team, parsed from the Prisma schema.
 * Used by tests to validate that the merge covers every one of them.
 */
export function parseTeamReferencingModelsFromSchema(schemaContent: string): string[] {
  const models: string[] = []
  const modelRegex = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  let match: RegExpExecArray | null = modelRegex.exec(schemaContent)

  while (match !== null) {
    const modelName = match[1]!
    const body = match[2]!
    // A scalar FK column pointing at teams — relation fields are typed `Team`, the
    // columns are what the merge has to rewrite.
    if (/^\s*\w*[tT]eamId\s+String/m.test(body)) {
      models.push(modelName.charAt(0).toLowerCase() + modelName.slice(1))
    }
    match = modelRegex.exec(schemaContent)
  }
  return models
}

/** Team-referencing models that neither list accounts for. */
export function findUnhandledTeamModels(teamReferencingModels: string[]): string[] {
  const covered = new Set<string>([...TEAM_SCOPED_MERGE_MODELS, ...Object.keys(TEAM_MERGE_SPECIAL_MODELS), "team"])
  return teamReferencingModels.filter((m) => !covered.has(m))
}
