import type { PrismaClient } from "@puckhub/db"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SeasonRange {
  seasonStart: Date
  seasonEnd: Date
}

export interface TeamNameSnapshot {
  name: string
  shortName: string
  logoUrl: string | null
}

export interface NameHistoryEntry extends TeamNameSnapshot {
  untilSeason: SeasonRange
}

interface ContinuableContract {
  id: string
  previousContractId: string | null
}

// ─── Season-scoped positions ─────────────────────────────────────────────────

/**
 * Resolve the position every player held in one specific season, per team.
 *
 * A player's position is stored on the contract, and a player can hold several
 * contracts with the same team over time (a goalie who later played forward is
 * two contracts, see `contract.splitContract`). Season stats therefore must not
 * be matched against "any" contract of that player — only against the contract
 * that actually covers the season the stats belong to.
 *
 * Returns a map keyed `playerId:teamId`.
 */
export async function resolveSeasonPositions(
  db: PrismaClient,
  args: { organizationId: string; seasonId: string; playerIds: string[] },
): Promise<Map<string, string>> {
  const positions = new Map<string, string>()
  if (args.playerIds.length === 0) return positions

  const season = await db.season.findFirst({
    where: { id: args.seasonId, organizationId: args.organizationId },
    select: { seasonStart: true, seasonEnd: true },
  })
  if (!season) return positions

  const contracts = await db.contract.findMany({
    where: {
      organizationId: args.organizationId,
      playerId: { in: args.playerIds },
      startSeason: { seasonStart: { lte: season.seasonEnd } },
      OR: [{ endSeasonId: null }, { endSeason: { seasonEnd: { gte: season.seasonStart } } }],
    },
    select: {
      playerId: true,
      teamId: true,
      position: true,
      startSeason: { select: { seasonStart: true } },
    },
  })

  // Several contracts can still overlap one season (a split takes effect mid-season
  // range); the one that started last is the one in force.
  const startedAt = new Map<string, number>()
  for (const c of contracts) {
    const key = `${c.playerId}:${c.teamId}`
    const start = c.startSeason.seasonStart.getTime()
    const known = startedAt.get(key)
    if (known === undefined || start > known) {
      startedAt.set(key, start)
      positions.set(key, c.position)
    }
  }

  return positions
}

// ─── Contract continuations ──────────────────────────────────────────────────

/**
 * Ids of contracts that are continued by a later contract for the same player
 * and team. Together with `previousContractId` this tells roster change lists
 * which start/end seasons are real signings and departures, and which are only
 * the seam between two contracts of one uninterrupted spell.
 */
export function collectContinuedContractIds(contracts: ContinuableContract[]): Set<string> {
  const continued = new Set<string>()
  for (const c of contracts) {
    if (c.previousContractId) continued.add(c.previousContractId)
  }
  return continued
}

// ─── Team names over time ────────────────────────────────────────────────────

/**
 * The name a team carried in a given season. Former names live in
 * `team_name_history`, each valid up to and including one season; anything after
 * the most recent entry uses the team's current name.
 */
export function resolveTeamNameForSeason<T extends TeamNameSnapshot>(
  team: T,
  nameHistory: NameHistoryEntry[],
  season: SeasonRange,
): TeamNameSnapshot {
  const applicable = [...nameHistory]
    .sort((a, b) => a.untilSeason.seasonEnd.getTime() - b.untilSeason.seasonEnd.getTime())
    .find((entry) => entry.untilSeason.seasonEnd >= season.seasonStart)

  if (!applicable) {
    return { name: team.name, shortName: team.shortName, logoUrl: team.logoUrl }
  }
  return { name: applicable.name, shortName: applicable.shortName, logoUrl: applicable.logoUrl }
}
