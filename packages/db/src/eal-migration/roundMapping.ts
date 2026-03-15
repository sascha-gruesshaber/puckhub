// ---------------------------------------------------------------------------
// Round → Division + Round mapping per playmode
//
// The legacy system uses a `round` field on alGames plus `playmode_id` on
// alSaison and `alGroups` (grpnameID 4=Liga I, 5=Liga II) to determine which
// division and round type a game belongs to.
//
// This module defines the mapping logic used during migration.
// ---------------------------------------------------------------------------

import type { RoundType } from "../generated/prisma/enums"
import type { LegacyGroup, LegacySeason } from "./legacyTypes"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DivisionDef {
  name: string
  sortOrder: number
  rounds: RoundDef[]
  /** Legacy grpnameIDs that belong to this division (for team assignment) */
  grpnameIds?: number[]
  /** All teams in the season belong (no group filtering) */
  allTeams?: boolean
}

export interface RoundDef {
  name: string
  roundType: RoundType
  sortOrder: number
  countsForPlayerStats: boolean
  countsForGoalieStats: boolean
  /** Which legacy round IDs map to this round */
  legacyRoundIds: number[]
  /**
   * For shared rounds (5, 7, 8, 9, 10), which grpnameIDs determine team
   * membership. If undefined, the parent division's grpnameIds or allTeams
   * is used to determine which games belong.
   */
  filterGrpnameIds?: number[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function regularRound(
  name: string,
  sortOrder: number,
  legacyRoundIds: number[],
  opts?: {
    filterGrpnameIds?: number[]
    countsForGoalieStats?: boolean
  },
): RoundDef {
  return {
    name,
    roundType: "regular",
    sortOrder,
    countsForPlayerStats: true,
    countsForGoalieStats: opts?.countsForGoalieStats ?? true,
    legacyRoundIds,
    filterGrpnameIds: opts?.filterGrpnameIds,
  }
}

function preroundRound(
  name: string,
  sortOrder: number,
  legacyRoundIds: number[],
  opts?: {
    filterGrpnameIds?: number[]
  },
): RoundDef {
  return {
    name,
    roundType: "preround",
    sortOrder,
    countsForPlayerStats: true,
    countsForGoalieStats: true,
    legacyRoundIds,
    filterGrpnameIds: opts?.filterGrpnameIds,
  }
}

function playoffsRound(
  name: string,
  sortOrder: number,
  legacyRoundIds: number[],
  opts?: {
    filterGrpnameIds?: number[]
  },
): RoundDef {
  return {
    name,
    roundType: "playoffs",
    sortOrder,
    countsForPlayerStats: true,
    countsForGoalieStats: false,
    legacyRoundIds,
    filterGrpnameIds: opts?.filterGrpnameIds,
  }
}

function playdownsRound(
  name: string,
  sortOrder: number,
  legacyRoundIds: number[],
  opts?: {
    filterGrpnameIds?: number[]
  },
): RoundDef {
  return {
    name,
    roundType: "playdowns",
    sortOrder,
    countsForPlayerStats: true,
    countsForGoalieStats: false,
    legacyRoundIds,
    filterGrpnameIds: opts?.filterGrpnameIds,
  }
}

function playupsRound(
  name: string,
  sortOrder: number,
  legacyRoundIds: number[],
  opts?: {
    filterGrpnameIds?: number[]
  },
): RoundDef {
  return {
    name,
    roundType: "playups",
    sortOrder,
    countsForPlayerStats: true,
    countsForGoalieStats: false,
    legacyRoundIds,
    filterGrpnameIds: opts?.filterGrpnameIds,
  }
}

// ---------------------------------------------------------------------------
// Playmode-specific division structures
// ---------------------------------------------------------------------------

/**
 * Playmode 1 (08/09): Vorrunde (2 Gruppen), Platzierungsrunde, Endrunde
 * Round 3 split by group (grp 1 = Gruppe A, grp 2 = Gruppe B)
 * Round 1 = Platzierungsrunde, Round 2 = Endrunde
 */
function playmode1(): DivisionDef[] {
  return [
    {
      name: "Gruppe A",
      sortOrder: 0,
      grpnameIds: [1],
      rounds: [regularRound("Vorrunde", 0, [3], { filterGrpnameIds: [1] })],
    },
    {
      name: "Gruppe B",
      sortOrder: 1,
      grpnameIds: [2],
      rounds: [regularRound("Vorrunde", 0, [3], { filterGrpnameIds: [2] })],
    },
    {
      name: "Platzierungsrunde",
      sortOrder: 2,
      allTeams: true,
      rounds: [
        {
          name: "Platzierungsrunde",
          roundType: "placement",
          sortOrder: 0,
          countsForPlayerStats: true,
          countsForGoalieStats: false,
          legacyRoundIds: [1],
        },
      ],
    },
    {
      name: "Endrunde",
      sortOrder: 3,
      allTeams: true,
      rounds: [
        {
          name: "Endrunde",
          roundType: "final",
          sortOrder: 0,
          countsForPlayerStats: true,
          countsForGoalieStats: false,
          legacyRoundIds: [2],
        },
      ],
    },
  ]
}

/**
 * Playmode 2 (09/10): Single table, no groups
 * Rounds 3 and 4 both map to regular season
 */
function playmode2(): DivisionDef[] {
  return [
    {
      name: "Tabelle",
      sortOrder: 0,
      allTeams: true,
      rounds: [regularRound("Saison", 0, [3, 4])],
    },
  ]
}

/**
 * Playmode 3 (10/11, 12/13, 13/14): 2 Ligen
 * Liga I: Vorrunde (5), Playoffs HF (7) + Finale (8) + Platz 3/4 (10), Playdowns (9)
 * Liga II: Vorrunde (5)
 * EAL Pokal: Rounds 21 (placement), 22+23+24 (QF/SF/Final)
 */
function playmode3(season: LegacySeason): DivisionDef[] {
  const l1Rounds: RoundDef[] = [
    regularRound(season.nameLeague1Preround || "Vorrunde", 0, [5], { filterGrpnameIds: [4] }),
  ]
  if (season.hasLeague1Playoffs) {
    l1Rounds.push(playoffsRound(season.nameLeague1Playoffs || "Playoffs", 1, [7, 8, 10], { filterGrpnameIds: [4] }))
  }
  if (season.hasLeague1Playdowns) {
    l1Rounds.push(playdownsRound(season.nameLeague1Playdowns || "Playdowns", 2, [9], { filterGrpnameIds: [4] }))
  }

  const l2Rounds: RoundDef[] = [
    regularRound(season.nameLeague2Preround || "Vorrunde", 0, [5], { filterGrpnameIds: [5] }),
  ]

  const divisions: DivisionDef[] = [
    { name: season.nameLeague1 || "Liga I", sortOrder: 0, grpnameIds: [4], rounds: l1Rounds },
    { name: season.nameLeague2 || "Liga II", sortOrder: 1, grpnameIds: [5], rounds: l2Rounds },
  ]

  // EAL Pokal (cup tournament): rounds 21 (earlier round), 22 (QF), 23 (SF), 24 (F)
  const pokalRounds: RoundDef[] = [
    {
      name: "Platzierungsrunde",
      roundType: "placement",
      sortOrder: 0,
      countsForPlayerStats: true,
      countsForGoalieStats: false,
      legacyRoundIds: [21],
    },
    playoffsRound("Pokal", 1, [22, 23, 24]),
  ]
  divisions.push({ name: "EAL Pokal", sortOrder: 2, allTeams: true, rounds: pokalRounds })

  return divisions
}

/**
 * Playmode 4 (11/12): 2 Ligen, simpler
 * Liga I: round 5, Liga II: round 5
 */
function playmode4(season: LegacySeason): DivisionDef[] {
  return [
    {
      name: season.nameLeague1 || "Liga I",
      sortOrder: 0,
      grpnameIds: [4],
      rounds: [regularRound(season.nameLeague1Preround || "Vorrunde", 0, [5], { filterGrpnameIds: [4] })],
    },
    {
      name: season.nameLeague2 || "Liga II",
      sortOrder: 1,
      grpnameIds: [5],
      rounds: [regularRound(season.nameLeague2Preround || "Vorrunde", 0, [5], { filterGrpnameIds: [5] })],
    },
  ]
}

/**
 * Playmode 5 (14/15 – 25/26): Full 2-liga system
 * Liga I: Preround, Playoffs, Playdowns (configurable per season)
 * Liga II: Preround, Playoffs, Playups (configurable)
 * Mixed League (Verzahnungsrunde): Preround (6,11), Playoffs (12-14), Playdowns (15-18)
 * EAL Pokal (cup): Placement (21), QF+SF+Final (22+23+24)
 *
 * Shared round IDs: 5 = league play, 7+8+10 = Liga I Playoffs, 9 = Playdowns
 * Mixed rounds: 6/11 = preround, 12+13+14 = mixed playoffs, 15-18 = mixed playdowns
 * Pokal rounds: 21 = earlier round, 22 = Viertelfinale, 23 = Halbfinale, 24 = Finale
 */
function playmode5(season: LegacySeason): DivisionDef[] {
  const divisions: DivisionDef[] = []

  // Liga I
  const l1Rounds: RoundDef[] = []
  if (season.hasLeague1Preround) {
    l1Rounds.push(preroundRound(season.nameLeague1Preround || "Vorrunde", 0, [5], { filterGrpnameIds: [4] }))
  }
  if (season.hasLeague1Playoffs) {
    l1Rounds.push(playoffsRound(season.nameLeague1Playoffs || "Playoffs", 1, [7, 8, 10], { filterGrpnameIds: [4] }))
  }
  if (season.hasLeague1Playdowns) {
    l1Rounds.push(playdownsRound(season.nameLeague1Playdowns || "Playdowns", 2, [9], { filterGrpnameIds: [4] }))
  }
  if (l1Rounds.length > 0) {
    divisions.push({ name: season.nameLeague1 || "Liga I", sortOrder: 0, grpnameIds: [4], rounds: l1Rounds })
  }

  // Liga II
  const l2Rounds: RoundDef[] = []
  if (season.hasLeague2Preround) {
    l2Rounds.push(preroundRound(season.nameLeague2Preround || "Vorrunde", 0, [5], { filterGrpnameIds: [5] }))
  }
  if (season.hasLeague2Playoffs) {
    l2Rounds.push(playoffsRound(season.nameLeague2Playoffs || "Playoffs", 1, [7, 8, 10], { filterGrpnameIds: [5] }))
  }
  if (season.hasLeague2Playups) {
    l2Rounds.push(playupsRound(season.nameLeague2Playups || "Platzierungsrunde", 2, [9], { filterGrpnameIds: [5] }))
  }
  if (l2Rounds.length > 0) {
    divisions.push({ name: season.nameLeague2 || "Liga II", sortOrder: 1, grpnameIds: [5], rounds: l2Rounds })
  }

  // Cross-league / Mixed League (Verzahnungsrunde / Überkreuzspiele)
  // Always create this division — rounds 6, 11, 12-14, 15-18, 21, 22-24
  // are cross-league and span both Liga I and Liga II teams.
  const hasMixed =
    season.hasMixedLeague ||
    season.hasLeagueMixedPreround ||
    season.hasLeagueMixedPlayoffs ||
    season.hasLeagueMixedPlaydowns
  if (hasMixed) {
    const mixedRounds: RoundDef[] = []
    if (season.hasLeagueMixedPreround) {
      // Round 6 (original) and round 11 (newer) both serve as mixed preround
      mixedRounds.push(preroundRound(season.nameLeagueMixedPreround || "Vorrunde", 0, [6, 11]))
    }
    if (season.hasLeagueMixedPlayoffs) {
      // Rounds 12+13+14 = mixed league playoffs (Verzahnungsrunde)
      mixedRounds.push(playoffsRound(season.nameLeagueMixedPlayoffs || "Playoffs", 1, [12, 13, 14]))
    }
    if (season.hasLeagueMixedPlaydowns) {
      mixedRounds.push(playdownsRound(season.nameLeagueMixedPlaydowns || "Playdowns", 2, [15, 16, 17, 18]))
    }
    // Round 21 = cross-league placement (appears in some seasons)
    mixedRounds.push({
      name: "Platzierungsrunde",
      roundType: "placement",
      sortOrder: 3,
      countsForPlayerStats: true,
      countsForGoalieStats: false,
      legacyRoundIds: [21],
    })

    if (mixedRounds.length > 0) {
      divisions.push({
        name: season.nameMixedLeague || "Verzahnungsrunde",
        sortOrder: 2,
        allTeams: true,
        rounds: mixedRounds,
      })
    }
  }

  // EAL Pokal: rounds 21 (earlier round), 22 (QF), 23 (SF), 24 (Final)
  // Always create this division — cup games exist in most seasons regardless of mixed league flags
  const pokalRounds: RoundDef[] = [
    {
      name: "Platzierungsrunde",
      roundType: "placement",
      sortOrder: 0,
      countsForPlayerStats: true,
      countsForGoalieStats: false,
      legacyRoundIds: [21],
    },
    playoffsRound("Pokal", 1, [22, 23, 24]),
  ]
  divisions.push({ name: "EAL Pokal", sortOrder: hasMixed ? 3 : 2, allTeams: true, rounds: pokalRounds })

  return divisions
}

/**
 * Playmode 6 (16/17): Table with 2 groups
 * Uses round 4 or 5 for regular season, plus EAL Pokal 22+23+24
 */
function playmode6(season: LegacySeason): DivisionDef[] {
  return [
    {
      name: season.nameLeague1 || "Liga I",
      sortOrder: 0,
      grpnameIds: [4],
      rounds: [regularRound(season.nameLeague1Preround || "Saison", 0, [4, 5], { filterGrpnameIds: [4] })],
    },
    {
      name: season.nameLeague2 || "Liga II",
      sortOrder: 1,
      grpnameIds: [5],
      rounds: [regularRound(season.nameLeague2Preround || "Saison", 0, [4, 5], { filterGrpnameIds: [5] })],
    },
    {
      name: "EAL Pokal",
      sortOrder: 2,
      allTeams: true,
      rounds: [playoffsRound("Pokal", 0, [22, 23, 24])],
    },
  ]
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Returns the division + round structure for a given season based on its playmode.
 */
export function getDivisionsForSeason(season: LegacySeason): DivisionDef[] {
  switch (season.playmode_id) {
    case 1:
      return playmode1()
    case 2:
      return playmode2()
    case 3:
      return playmode3(season)
    case 4:
      return playmode4(season)
    case 5:
      return playmode5(season)
    case 6:
      return playmode6(season)
    default:
      console.warn(
        `[round-mapping] Unknown playmode ${season.playmode_id} for season ${season.text}, defaulting to single-table`,
      )
      return playmode2()
  }
}

/**
 * Determines which division + round a game belongs to.
 * Returns null if no mapping can be found.
 */
export function resolveGameRound(
  gameRound: number,
  seasonId: number,
  homeTeamId: number,
  divisions: DivisionDef[],
  groups: LegacyGroup[],
): { divisionIndex: number; roundIndex: number } | null {
  // Find which group(s) the home team belongs to in this season
  const homeTeamGroups = groups
    .filter((g) => g.saisonID === seasonId && g.teamID === homeTeamId)
    .map((g) => g.grpnameID)

  for (let di = 0; di < divisions.length; di++) {
    const div = divisions[di]!
    for (let ri = 0; ri < div.rounds.length; ri++) {
      const round = div.rounds[ri]!

      // Check if this legacy round ID is handled by this round
      if (!round.legacyRoundIds.includes(gameRound)) continue

      // Check group filter
      if (round.filterGrpnameIds) {
        // Game belongs to this round only if the home team is in one of these groups
        if (homeTeamGroups.some((g) => round.filterGrpnameIds!.includes(g))) {
          return { divisionIndex: di, roundIndex: ri }
        }
      } else if (div.grpnameIds) {
        // Fall back to division-level group filter
        if (homeTeamGroups.some((g) => div.grpnameIds!.includes(g))) {
          return { divisionIndex: di, roundIndex: ri }
        }
      } else if (div.allTeams) {
        // No group filtering needed
        return { divisionIndex: di, roundIndex: ri }
      }
    }
  }

  return null
}
