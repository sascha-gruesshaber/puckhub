// ---------------------------------------------------------------------------
// TypeScript interfaces for legacy MySQL (MariaDB) row shapes
// Database: eal_local (EAL Hockey Allgäuliga)
// ---------------------------------------------------------------------------

/** alTeams — Teams */
export interface LegacyTeam {
  id: number
  name: string
  kontakt1: string | null
  telefon1: string | null
  email1: string | null
  homepage: string | null
  logo: string | null
  shortname: string
  active: number // 0 or 1
  trikot_1: number | null
  trikot_2: number | null
  trikot_3: number | null
}

/** alTrikots — Jerseys */
export interface LegacyTrikot {
  id: number
  name: string
  template_id: number
  color_brust: string | null
  color_schulter: string | null
  editable: number
}

/** alSaison — Seasons */
export interface LegacySeason {
  id: number
  saison: string // e.g. '0809', '2526'
  text: string // e.g. '2008/2009'
  current_saison: number
  visible: number
  playmode_id: number
  sort: number | null
  hasLeague1Preround: number
  hasLeague1Playoffs: number
  hasLeague1Playdowns: number
  hasLeague2Preround: number
  hasLeague2Playoffs: number
  hasLeague2Playups: number
  hasMixedLeague: number
  hasLeagueMixedPreround: number
  hasLeagueMixedPlayoffs: number
  hasLeagueMixedPlaydowns: number
  nameLeague1: string
  nameLeague1Preround: string
  nameLeague1Playoffs: string
  nameLeague1Playdowns: string
  nameLeague2: string
  nameLeague2Preround: string
  nameLeague2Playoffs: string
  nameLeague2Playups: string
  nameMixedLeague: string
  nameLeagueMixedPreround: string
  nameLeagueMixedPlayoffs: string
  nameLeagueMixedPlaydowns: string
}

/** alGroupnames — Group name lookup */
export interface LegacyGroupName {
  id: number
  name: string
  comment: string | null
}

/** alGroups — Team-group-season assignments */
export interface LegacyGroup {
  id: number
  saisonID: number
  grpnameID: number
  teamID: number
}

/** alPlayers — Players */
export interface LegacyPlayer {
  id: number
  teamID: number | null
  firstname: string
  lastname: string
  number: number
  captain: number
  assistant: number
  status: number
  posID: number // 1=Forward, 2=Defense, 3=Goalie, 4=Unknown
  birthday: string | null // 'DD.MM.YYYY'
  active: number
}

/** alPlayersPosition — Position lookup */
export interface LegacyPlayerPosition {
  id: number
  position: string
  pos_order: number
}

/** alPlayerTeam — Player-team-season roster */
export interface LegacyPlayerTeam {
  id: number
  playersID: number
  teamsID: number
  saisonID: number
  active: number
  kommentar: string | null
}

/** alGames — Games */
export interface LegacyGame {
  id: number
  team_home: number
  team_guest: number
  term: Date
  location: string
  goals_home: number | null
  goals_guest: number | null
  decided: number // 0 or 1
  round: number // FK to alPlayrounds
  saisonID: number
  game_nr: number | null
  home_trikot: number
  guest_trikot: number
}

/** alReport — Game events (goals + penalties in same table) */
export interface LegacyReport {
  id: number
  gameID: number
  goal: number // playerID who scored (0 = not a goal entry)
  assist: number // playerID who assisted (0 = no assist)
  penalty: number // playerID penalized (0 = not a penalty entry)
  playminute: number
  playsecond: number
  teamID: number
  penaltyID: number // FK to alPenalty (0 = no penalty)
  penaltytime: number // minutes
}

/** alPenalty — Penalty type lookup */
export interface LegacyPenalty {
  id: number
  name: string
}

/** alPlayrounds — Round type lookup */
export interface LegacyPlayround {
  id: number
  round: string
}

/** alPlayMode — Season play mode */
export interface LegacyPlayMode {
  id: number
  description: string
}

/** alGoalieStatistic — Goalie game stats */
export interface LegacyGoalieStat {
  id: number
  gameID: number
  playerID: number
  statistic: number // 1 = include in stats
  received_goals: number
  teamID: number
  comment: string | null
}

/** alBonuspoints — Team bonus points per season */
export interface LegacyBonusPoint {
  id: number
  teamID: number
  bonuspoints: number
  saisonID: number
}

/** alNews — News articles */
export interface LegacyNews {
  id: number
  text: string | null
  datetime: Date
  ueberschrift: string // headline
  infozeile: string // subtitle
  show_complete: number
  saisonID: number
}

/** alResultService — Public game reports submitted by team contacts */
export interface LegacyResultService {
  id: number
  home: number // team ID
  guest: number // team ID
  comment: string | null
  postername: string
  postdate: Date
  homegoals: number
  guestgoals: number
  posterteam: number // team ID of the submitter
  protest: number // 0 or 1
  saisonID: number
  penaltycomment: string | null
  group_id: number
}

/** alTeamLineUp — Game lineups */
export interface LegacyTeamLineUp {
  id: number
  gameID: number
  playerID: number
  teamID: number
  saisonID: number
}
