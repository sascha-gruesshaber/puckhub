import type { Database } from "../index"
import type { OrgRole } from "../generated/prisma/enums"
import { recalculateStandings } from "../services/standingsService"
import { recalculateGoalieStats, recalculatePlayerStats } from "../services/statsService"
import { cleanOrgUploads, generateSeedImages } from "./seedImages"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const DEMO_ORG_ID = "demo-league"
const DEMO_EMAIL_SUFFIX = process.env.SUBDOMAIN_SUFFIX || ".puckhub.localhost"
const DEMO_EMAIL_DOMAIN = `@${DEMO_ORG_ID}${DEMO_EMAIL_SUFFIX}`

// ---------------------------------------------------------------------------
// Team data
// ---------------------------------------------------------------------------
const TEAMS = [
  { name: "Eisbären Karlsruhe", shortName: "EBK", city: "Karlsruhe" },
  { name: "Stuttgarter Eishexen", shortName: "SEH", city: "Stuttgart" },
  { name: "Heidelberg Wolves", shortName: "HDW", city: "Heidelberg" },
  { name: "Mannheimer Pinguine", shortName: "MHP", city: "Mannheim" },
  { name: "Freiburger Falken", shortName: "FRF", city: "Freiburg" },
  { name: "Ulmer Bisons", shortName: "ULB", city: "Ulm" },
  { name: "Pforzheim Hurricanes", shortName: "PFH", city: "Pforzheim" },
  { name: "Heilbronner Yetis", shortName: "HBY", city: "Heilbronn" },
  { name: "Reutlinger Foxes", shortName: "RTF", city: "Reutlingen" },
  { name: "Tübinger Eisbären", shortName: "TEB", city: "Tübingen" },
]

const VENUE_NAMES = [
  "Eisstadion am Fächerbad, Karlsruhe",
  "Eishalle Waldau, Stuttgart",
  "Heidelberg Ice Arena",
  "Eissporthalle Mannheim",
  "Eishalle Freiburg",
  "Ulmer Eishalle",
  "Eiszentrum Pforzheim",
  "Kolbenschmidt Arena, Heilbronn",
  "Eishalle Reutlingen",
  "Tübinger Eispalast",
]

// ---------------------------------------------------------------------------
// Player data - 10 per team (5 F, 3 D, 2 G)
// ---------------------------------------------------------------------------
type PlayerDef = {
  firstName: string
  lastName: string
  position: "forward" | "defense" | "goalie"
  dob: string
  jerseyNumber: number
}

const PLAYERS_PER_TEAM: PlayerDef[][] = [
  // Team 0 - Eisbären Karlsruhe
  [
    { firstName: "Lukas", lastName: "Müller", position: "forward", dob: "1990-03-15", jerseyNumber: 10 },
    { firstName: "Felix", lastName: "Weber", position: "forward", dob: "1992-07-22", jerseyNumber: 17 },
    { firstName: "Moritz", lastName: "Fischer", position: "forward", dob: "1988-11-08", jerseyNumber: 23 },
    { firstName: "Tim", lastName: "Koch", position: "forward", dob: "1995-01-30", jerseyNumber: 19 },
    { firstName: "Jan", lastName: "Bauer", position: "forward", dob: "1993-05-12", jerseyNumber: 14 },
    { firstName: "Niklas", lastName: "Richter", position: "defense", dob: "1991-09-25", jerseyNumber: 4 },
    { firstName: "David", lastName: "Klein", position: "defense", dob: "1989-12-03", jerseyNumber: 6 },
    { firstName: "Stefan", lastName: "Wolf", position: "defense", dob: "1994-04-18", jerseyNumber: 3 },
    { firstName: "Marcel", lastName: "Schwarz", position: "goalie", dob: "1990-08-07", jerseyNumber: 1 },
    { firstName: "Patrick", lastName: "Braun", position: "goalie", dob: "1996-02-14", jerseyNumber: 30 },
  ],
  // Team 1 - Stuttgarter Eishexen
  [
    { firstName: "Jonas", lastName: "Schneider", position: "forward", dob: "1991-06-10", jerseyNumber: 11 },
    { firstName: "Leon", lastName: "Hoffmann", position: "forward", dob: "1993-03-28", jerseyNumber: 22 },
    { firstName: "Maximilian", lastName: "Schäfer", position: "forward", dob: "1990-10-05", jerseyNumber: 9 },
    { firstName: "Simon", lastName: "Hartmann", position: "forward", dob: "1994-08-17", jerseyNumber: 16 },
    { firstName: "Tobias", lastName: "Krüger", position: "forward", dob: "1992-12-01", jerseyNumber: 21 },
    { firstName: "Fabian", lastName: "Werner", position: "defense", dob: "1989-04-23", jerseyNumber: 5 },
    { firstName: "Philipp", lastName: "Meier", position: "defense", dob: "1991-11-14", jerseyNumber: 2 },
    { firstName: "Christian", lastName: "Neumann", position: "defense", dob: "1993-07-09", jerseyNumber: 7 },
    { firstName: "Andreas", lastName: "Schmitz", position: "goalie", dob: "1988-01-26", jerseyNumber: 31 },
    { firstName: "Matthias", lastName: "Lehmann", position: "goalie", dob: "1995-09-30", jerseyNumber: 35 },
  ],
  // Team 2 - Heidelberg Wolves
  [
    { firstName: "Alexander", lastName: "Zimmermann", position: "forward", dob: "1990-05-20", jerseyNumber: 12 },
    { firstName: "Daniel", lastName: "Keller", position: "forward", dob: "1992-08-13", jerseyNumber: 18 },
    { firstName: "Sebastian", lastName: "Frank", position: "forward", dob: "1991-02-07", jerseyNumber: 8 },
    { firstName: "Michael", lastName: "Berger", position: "forward", dob: "1993-11-22", jerseyNumber: 15 },
    { firstName: "Florian", lastName: "Winkler", position: "forward", dob: "1989-06-04", jerseyNumber: 20 },
    { firstName: "Dominik", lastName: "Lorenz", position: "defense", dob: "1990-12-18", jerseyNumber: 44 },
    { firstName: "Martin", lastName: "Schuster", position: "defense", dob: "1994-03-31", jerseyNumber: 24 },
    { firstName: "Thomas", lastName: "Kaiser", position: "defense", dob: "1991-07-16", jerseyNumber: 28 },
    { firstName: "Christoph", lastName: "Fuchs", position: "goalie", dob: "1992-10-09", jerseyNumber: 33 },
    { firstName: "Benjamin", lastName: "Lang", position: "goalie", dob: "1995-04-25", jerseyNumber: 29 },
  ],
  // Team 3 - Mannheimer Pinguine
  [
    { firstName: "Kevin", lastName: "Baumann", position: "forward", dob: "1991-01-12", jerseyNumber: 13 },
    { firstName: "Marco", lastName: "Herrmann", position: "forward", dob: "1993-09-06", jerseyNumber: 77 },
    { firstName: "Dennis", lastName: "König", position: "forward", dob: "1990-04-28", jerseyNumber: 26 },
    { firstName: "Markus", lastName: "Walter", position: "forward", dob: "1992-06-15", jerseyNumber: 10 },
    { firstName: "Sven", lastName: "Mayer", position: "forward", dob: "1994-12-03", jerseyNumber: 19 },
    { firstName: "Steffen", lastName: "Peters", position: "defense", dob: "1989-08-21", jerseyNumber: 4 },
    { firstName: "Jens", lastName: "Jung", position: "defense", dob: "1991-03-14", jerseyNumber: 55 },
    { firstName: "Oliver", lastName: "Vogt", position: "defense", dob: "1993-10-27", jerseyNumber: 6 },
    { firstName: "Ralf", lastName: "Sommer", position: "goalie", dob: "1990-07-19", jerseyNumber: 1 },
    { firstName: "Kai", lastName: "Gross", position: "goalie", dob: "1996-05-08", jerseyNumber: 30 },
  ],
  // Team 4 - Freiburger Falken
  [
    { firstName: "Peter", lastName: "Haas", position: "forward", dob: "1990-02-25", jerseyNumber: 9 },
    { firstName: "André", lastName: "Graf", position: "forward", dob: "1992-11-17", jerseyNumber: 17 },
    { firstName: "Lars", lastName: "Engel", position: "forward", dob: "1991-05-09", jerseyNumber: 22 },
    { firstName: "Torsten", lastName: "Brandt", position: "forward", dob: "1993-08-02", jerseyNumber: 11 },
    { firstName: "Hendrik", lastName: "Schulz", position: "forward", dob: "1989-10-14", jerseyNumber: 14 },
    { firstName: "Nils", lastName: "Krause", position: "defense", dob: "1990-06-29", jerseyNumber: 3 },
    { firstName: "Erik", lastName: "Böhm", position: "defense", dob: "1994-01-11", jerseyNumber: 7 },
    { firstName: "Robert", lastName: "Vogel", position: "defense", dob: "1991-09-23", jerseyNumber: 27 },
    { firstName: "Manuel", lastName: "Schenk", position: "goalie", dob: "1992-04-06", jerseyNumber: 31 },
    { firstName: "Ingo", lastName: "Pohl", position: "goalie", dob: "1995-12-20", jerseyNumber: 35 },
  ],
  // Team 5 - Ulmer Bisons
  [
    { firstName: "Wolfgang", lastName: "Roth", position: "forward", dob: "1990-07-03", jerseyNumber: 10 },
    { firstName: "Holger", lastName: "Beck", position: "forward", dob: "1992-02-18", jerseyNumber: 16 },
    { firstName: "Bernd", lastName: "Schmid", position: "forward", dob: "1991-08-31", jerseyNumber: 23 },
    { firstName: "Uwe", lastName: "Maier", position: "forward", dob: "1993-04-15", jerseyNumber: 8 },
    { firstName: "Klaus", lastName: "Huber", position: "forward", dob: "1989-11-27", jerseyNumber: 20 },
    { firstName: "Ralph", lastName: "Dietrich", position: "defense", dob: "1990-03-10", jerseyNumber: 5 },
    { firstName: "Udo", lastName: "Kunz", position: "defense", dob: "1994-06-22", jerseyNumber: 44 },
    { firstName: "Gerd", lastName: "Ritter", position: "defense", dob: "1991-12-05", jerseyNumber: 2 },
    { firstName: "Werner", lastName: "Becker", position: "goalie", dob: "1992-09-18", jerseyNumber: 33 },
    { firstName: "Hans", lastName: "Albrecht", position: "goalie", dob: "1995-01-02", jerseyNumber: 29 },
  ],
  // Team 6 - Pforzheim Hurricanes
  [
    { firstName: "Achim", lastName: "Franke", position: "forward", dob: "1991-04-07", jerseyNumber: 12 },
    { firstName: "Dirk", lastName: "Wolff", position: "forward", dob: "1993-10-20", jerseyNumber: 18 },
    { firstName: "Frank", lastName: "Hahn", position: "forward", dob: "1990-01-13", jerseyNumber: 15 },
    { firstName: "Georg", lastName: "Busch", position: "forward", dob: "1992-07-25", jerseyNumber: 21 },
    { firstName: "Heinrich", lastName: "Seidel", position: "forward", dob: "1994-11-08", jerseyNumber: 26 },
    { firstName: "Joachim", lastName: "Lange", position: "defense", dob: "1989-05-21", jerseyNumber: 4 },
    { firstName: "Karl", lastName: "Ernst", position: "defense", dob: "1991-08-14", jerseyNumber: 6 },
    { firstName: "Ludwig", lastName: "Kraft", position: "defense", dob: "1993-02-26", jerseyNumber: 55 },
    { firstName: "Norbert", lastName: "Paul", position: "goalie", dob: "1990-10-09", jerseyNumber: 1 },
    { firstName: "Otto", lastName: "Jahn", position: "goalie", dob: "1996-06-12", jerseyNumber: 30 },
  ],
  // Team 7 - Heilbronner Yetis
  [
    { firstName: "Roland", lastName: "Friedrich", position: "forward", dob: "1990-09-01", jerseyNumber: 11 },
    { firstName: "Sascha", lastName: "Kessler", position: "forward", dob: "1992-12-14", jerseyNumber: 77 },
    { firstName: "Thorsten", lastName: "Pfeiffer", position: "forward", dob: "1991-03-27", jerseyNumber: 9 },
    { firstName: "Volker", lastName: "Brauer", position: "forward", dob: "1993-06-09", jerseyNumber: 13 },
    { firstName: "Walter", lastName: "Wendt", position: "forward", dob: "1989-08-22", jerseyNumber: 19 },
    { firstName: "Xaver", lastName: "Stark", position: "defense", dob: "1990-11-15", jerseyNumber: 3 },
    { firstName: "Yannick", lastName: "Horn", position: "defense", dob: "1994-02-28", jerseyNumber: 7 },
    { firstName: "Armin", lastName: "Steiner", position: "defense", dob: "1991-06-11", jerseyNumber: 24 },
    { firstName: "Bruno", lastName: "Sander", position: "goalie", dob: "1992-01-24", jerseyNumber: 31 },
    { firstName: "Clemens", lastName: "Marx", position: "goalie", dob: "1995-07-17", jerseyNumber: 35 },
  ],
  // Team 8 - Reutlinger Foxes
  [
    { firstName: "Erwin", lastName: "Fiedler", position: "forward", dob: "1990-04-19", jerseyNumber: 14 },
    { firstName: "Friedrich", lastName: "Henkel", position: "forward", dob: "1992-10-02", jerseyNumber: 22 },
    { firstName: "Gustav", lastName: "Reuter", position: "forward", dob: "1991-01-15", jerseyNumber: 17 },
    { firstName: "Hermann", lastName: "Decker", position: "forward", dob: "1993-05-28", jerseyNumber: 8 },
    { firstName: "Ingolf", lastName: "Strauss", position: "forward", dob: "1989-09-10", jerseyNumber: 20 },
    { firstName: "Julius", lastName: "Stein", position: "defense", dob: "1990-12-23", jerseyNumber: 5 },
    { firstName: "Kurt", lastName: "Ziegler", position: "defense", dob: "1994-04-06", jerseyNumber: 44 },
    { firstName: "Leopold", lastName: "Otto", position: "defense", dob: "1991-07-29", jerseyNumber: 28 },
    { firstName: "Manfred", lastName: "Simon", position: "goalie", dob: "1992-11-12", jerseyNumber: 33 },
    { firstName: "Norwin", lastName: "Grimm", position: "goalie", dob: "1995-03-25", jerseyNumber: 29 },
  ],
  // Team 9 - Tübinger Eisbären
  [
    { firstName: "Oskar", lastName: "Winter", position: "forward", dob: "1991-02-11", jerseyNumber: 10 },
    { firstName: "Paul", lastName: "Ludwig", position: "forward", dob: "1993-08-24", jerseyNumber: 16 },
    { firstName: "Quirin", lastName: "Hamann", position: "forward", dob: "1990-05-07", jerseyNumber: 23 },
    { firstName: "Reinhard", lastName: "Scholz", position: "forward", dob: "1992-09-19", jerseyNumber: 11 },
    { firstName: "Siegfried", lastName: "Weiß", position: "forward", dob: "1994-01-02", jerseyNumber: 19 },
    { firstName: "Theodor", lastName: "Schreiber", position: "defense", dob: "1989-07-15", jerseyNumber: 4 },
    { firstName: "Ulrich", lastName: "Krug", position: "defense", dob: "1991-10-28", jerseyNumber: 6 },
    { firstName: "Viktor", lastName: "Auer", position: "defense", dob: "1993-03-13", jerseyNumber: 2 },
    { firstName: "Wilhelm", lastName: "Conrad", position: "goalie", dob: "1992-06-26", jerseyNumber: 1 },
    { firstName: "Xander", lastName: "Lindner", position: "goalie", dob: "1995-11-09", jerseyNumber: 30 },
  ],
]

// ---------------------------------------------------------------------------
// Season structure
// ---------------------------------------------------------------------------
type RoundDef = {
  name: string
  roundType: "regular" | "playoffs" | "playdowns"
  countsForPlayerStats?: boolean
  countsForGoalieStats?: boolean
}
type DivisionDef = { name: string; rounds: RoundDef[]; teamIndices: number[] }
type SeasonDef = { name: string; year: number; divisions: DivisionDef[] }
const GAMES_PER_ROUND = 20
const SEASONS_BACK = 15
const TOTAL_SEASONS = SEASONS_BACK + 1
const CURRENT_SEASON_START_YEAR = new Date().getUTCFullYear()

const SEASON_STRUCTURE_TEMPLATES: Array<{ divisions: DivisionDef[] }> = [
  {
    divisions: [
      {
        name: "Recreational League",
        rounds: [{ name: "Regular Season", roundType: "regular" }],
        teamIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      {
        name: "Recreational League",
        rounds: [{ name: "Regular Season", roundType: "regular" }],
        teamIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      { name: "Group A", rounds: [{ name: "Regular Season", roundType: "regular" }], teamIndices: [0, 1, 2, 3, 4] },
      { name: "Group B", rounds: [{ name: "Regular Season", roundType: "regular" }], teamIndices: [5, 6, 7, 8, 9] },
    ],
  },
  {
    divisions: [
      {
        name: "Group A",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playoffs", roundType: "playoffs" },
        ],
        teamIndices: [0, 1, 2, 3, 4],
      },
      {
        name: "Group B",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playdowns", roundType: "playdowns" },
        ],
        teamIndices: [5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      {
        name: "Recreational League",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playoffs", roundType: "playoffs" },
        ],
        teamIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      {
        name: "1. Liga",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playoffs", roundType: "playoffs" },
        ],
        teamIndices: [0, 1, 2, 3, 4],
      },
      {
        name: "2. Liga",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playdowns", roundType: "playdowns" },
        ],
        teamIndices: [5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      {
        name: "Recreational League",
        rounds: [{ name: "Regular Season", roundType: "regular" }],
        teamIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      {
        name: "Group A",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playoffs", roundType: "playoffs" },
        ],
        teamIndices: [0, 1, 2, 3],
      },
      { name: "Group B", rounds: [{ name: "Regular Season", roundType: "regular" }], teamIndices: [4, 5, 6] },
      { name: "Group C", rounds: [{ name: "Regular Season", roundType: "regular" }], teamIndices: [7, 8, 9] },
    ],
  },
  {
    divisions: [
      {
        name: "1. Liga",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playoffs", roundType: "playoffs" },
        ],
        teamIndices: [0, 1, 2, 3, 4],
      },
      {
        name: "2. Liga",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playdowns", roundType: "playdowns" },
        ],
        teamIndices: [5, 6, 7, 8, 9],
      },
    ],
  },
  {
    divisions: [
      {
        name: "Recreational League",
        rounds: [
          { name: "Regular Season", roundType: "regular" },
          { name: "Playoffs", roundType: "playoffs" },
          { name: "Playdowns", roundType: "playdowns" },
        ],
        teamIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Trikot colors per team [home primary, home secondary, away primary, away secondary]
// ---------------------------------------------------------------------------
const TEAM_COLORS: [string, string, string, string][] = [
  ["#003366", "#FFFFFF", "#FFFFFF", "#003366"], // Eisbären Karlsruhe
  ["#CC0000", "#000000", "#FFFFFF", "#CC0000"], // Stuttgarter Eishexen
  ["#4B0082", "#FFD700", "#FFFFFF", "#4B0082"], // Heidelberg Wolves
  ["#FF8C00", "#000000", "#000000", "#FF8C00"], // Mannheimer Pinguine
  ["#228B22", "#FFFFFF", "#FFFFFF", "#228B22"], // Freiburger Falken
  ["#8B0000", "#FFD700", "#FFD700", "#8B0000"], // Ulmer Bisons
  ["#1E90FF", "#FFFFFF", "#FFFFFF", "#1E90FF"], // Pforzheim Hurricanes
  ["#006400", "#FFFFFF", "#FFFFFF", "#006400"], // Heilbronner Yetis
  ["#FF4500", "#000000", "#000000", "#FF4500"], // Reutlinger Foxes
  ["#000080", "#87CEEB", "#87CEEB", "#000080"], // Tübinger Eisbären
]

// ---------------------------------------------------------------------------
// Transfer & retirement config
// ---------------------------------------------------------------------------
const TRANSFERS: { teamIdx: number; playerIdx: number; toTeamIdx: number; afterSeasonOffset: number }[] = [
  { teamIdx: 0, playerIdx: 2, toTeamIdx: 4, afterSeasonOffset: 5 },
  { teamIdx: 1, playerIdx: 3, toTeamIdx: 7, afterSeasonOffset: 4 },
  { teamIdx: 3, playerIdx: 0, toTeamIdx: 9, afterSeasonOffset: 6 },
  { teamIdx: 5, playerIdx: 1, toTeamIdx: 2, afterSeasonOffset: 3 },
  { teamIdx: 8, playerIdx: 4, toTeamIdx: 6, afterSeasonOffset: 7 },
]

const RETIREMENTS: { teamIdx: number; playerIdx: number; afterSeasonOffset: number }[] = [
  { teamIdx: 0, playerIdx: 7, afterSeasonOffset: 4 },
  { teamIdx: 2, playerIdx: 5, afterSeasonOffset: 5 },
  { teamIdx: 4, playerIdx: 9, afterSeasonOffset: 3 },
  { teamIdx: 6, playerIdx: 6, afterSeasonOffset: 6 },
  { teamIdx: 9, playerIdx: 8, afterSeasonOffset: 2 },
]

const TRIKOT_TEMPLATE_SVG_EINFARBIG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
</svg>`

const TRIKOT_TEMPLATE_SVG_ZWEIFARBIG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
  <path id="brust" fill="{{color_brust}}" stroke="#000" stroke-width="3" d="m 10,46.999995 15,40 40,-25 0.7722,133.202495 121.2752,0.25633 -2.04741,-133.458825 40,25 15,-40 -50,-34.999995 h -28 C 139.83336,27.705749 110.16663,27.705749 88,12 H 60 Z" />
  <path id="schulter" fill="{{color_schulter}}" stroke="#000" stroke-width="0" d="m 11.281638,47.768982 14.298956,37.743671 c 0,0 0.07017,0.05963 40.892953,-26.364418 44.282223,-11.865387 74.894513,-11.712062 117.051423,-0.115073 40.82279,26.424051 40.70605,26.428872 40.70605,26.428872 l 14.23102,-37.693051 -48.97471,-34.6076 -27.231,0.376583 C 140.0897,29.243719 108.88499,28.731064 86.718361,13.025311 H 60.512656 Z"/>
</svg>`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSeasonStructure(): SeasonDef[] {
  const firstSeasonYear = CURRENT_SEASON_START_YEAR - SEASONS_BACK
  return Array.from({ length: TOTAL_SEASONS }, (_, idx) => {
    const year = firstSeasonYear + idx
    const template = SEASON_STRUCTURE_TEMPLATES[idx % SEASON_STRUCTURE_TEMPLATES.length]!
    return {
      name: `${year}/${String((year + 1) % 100).padStart(2, "0")}`,
      year,
      divisions: template.divisions.map((division) => ({
        ...division,
        rounds: division.rounds.map((round) => ({ ...round })),
        teamIndices: [...division.teamIndices],
      })),
    }
  })
}

const PENALTY_TYPES = [
  { code: "MINOR", name: "Minor Penalty", shortName: "2min", defaultMinutes: 2 },
  { code: "DOUBLE_MINOR", name: "Double Minor", shortName: "2+2min", defaultMinutes: 4 },
  { code: "MAJOR", name: "Major Penalty", shortName: "5min", defaultMinutes: 5 },
  { code: "MISCONDUCT", name: "Misconduct", shortName: "10min", defaultMinutes: 10 },
  { code: "GAME_MISCONDUCT", name: "Game Misconduct", shortName: "GM", defaultMinutes: 20 },
  { code: "MATCH_PENALTY", name: "Match Penalty", shortName: "MP", defaultMinutes: 25 },
]

function seededFraction(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededFraction(seed) * (max - min + 1)) + min
}

function generateRoundRobinMatchdays(teamIds: string[]): Array<Array<{ homeTeamId: string; awayTeamId: string }>> {
  if (teamIds.length < 2) return []
  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push("__bye__")

  const rounds = teams.length - 1
  const half = teams.length / 2
  const rotation = [...teams]
  const matchdays: Array<Array<{ homeTeamId: string; awayTeamId: string }>> = []

  for (let round = 0; round < rounds; round++) {
    const games: Array<{ homeTeamId: string; awayTeamId: string }> = []
    for (let i = 0; i < half; i++) {
      const a = rotation[i]!
      const b = rotation[rotation.length - 1 - i]!
      if (a === "__bye__" || b === "__bye__") continue
      const invert = i === 0 && round % 2 === 1
      games.push(invert ? { homeTeamId: b, awayTeamId: a } : { homeTeamId: a, awayTeamId: b })
    }
    matchdays.push(games)

    const fixed = rotation[0]!
    const moved = rotation.pop()!
    rotation.splice(1, 0, moved)
    rotation[0] = fixed
  }
  return matchdays
}

function generateFixtures(
  teamIds: string[],
  totalGames: number,
  seed: number,
): Array<{ homeTeamId: string; awayTeamId: string }> {
  const matchdays = generateRoundRobinMatchdays(teamIds)
  if (matchdays.length === 0) return []

  const fixtures: Array<{ homeTeamId: string; awayTeamId: string }> = []
  let phase = 0

  while (fixtures.length < totalGames) {
    const dayOffset = seededInt(seed + phase * 19, 0, matchdays.length - 1)
    const swapHomeAway = phase % 2 === 1

    for (let day = 0; day < matchdays.length; day++) {
      const games = matchdays[(day + dayOffset) % matchdays.length]!
      for (const g of games) {
        if (fixtures.length >= totalGames) break
        const next = swapHomeAway ? { homeTeamId: g.awayTeamId, awayTeamId: g.homeTeamId } : g
        const prev = fixtures[fixtures.length - 1]
        if (prev && prev.homeTeamId === next.awayTeamId && prev.awayTeamId === next.homeTeamId) {
          continue
        }
        fixtures.push(next)
      }
      if (fixtures.length >= totalGames) break
    }

    phase += 1
  }

  return fixtures
}

// ---------------------------------------------------------------------------
// Demo users
// ---------------------------------------------------------------------------

const DEMO_USERS = [
  {
    email: `admin${DEMO_EMAIL_DOMAIN}`,
    name: "Demo Admin",
    platformRole: "user" as const,
    memberRole: "owner" as const,
    memberRoles: ["owner"] as OrgRole[],
  },
  {
    email: `editor${DEMO_EMAIL_DOMAIN}`,
    name: "Demo Editor",
    platformRole: "user" as const,
    memberRole: "member" as const,
    memberRoles: ["editor"] as OrgRole[],
  },
  {
    email: `reporter${DEMO_EMAIL_DOMAIN}`,
    name: "Demo Reporter",
    platformRole: "user" as const,
    memberRole: "member" as const,
    memberRoles: ["game_reporter"] as OrgRole[],
  },
]

async function createDemoUsers(
  db: Database,
): Promise<Array<{ userId: string; email: string; name: string; memberId: string }>> {
  const results: Array<{ userId: string; email: string; name: string; memberId: string }> = []

  for (const userDef of DEMO_USERS) {
    const userId = crypto.randomUUID()

    await db.user.create({
      data: {
        id: userId,
        email: userDef.email,
        name: userDef.name,
        emailVerified: true,
        role: userDef.platformRole,
        isDemoUser: true,
      },
    })

    const memberId = crypto.randomUUID()
    await db.member.create({
      data: {
        id: memberId,
        userId,
        organizationId: DEMO_ORG_ID,
        role: userDef.memberRole,
        createdAt: new Date(),
      },
    })

    for (const role of userDef.memberRoles) {
      await db.memberRole.create({
        data: { memberId, role },
      })
    }

    results.push({ userId, email: userDef.email, name: userDef.name, memberId })
  }

  return results
}

// ---------------------------------------------------------------------------
// Org deletion and cleanup
// ---------------------------------------------------------------------------

/** Delete the demo organization. CASCADE deletes all org-scoped data. */
export async function deleteDemoOrg(db: Database): Promise<void> {
  await db.organization.deleteMany({ where: { id: DEMO_ORG_ID } })
}

/** Delete orphaned demo users who have no remaining memberships. */
export async function cleanupDemoUsers(db: Database): Promise<number> {
  const demoUsers = await db.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true, _count: { select: { members: true } } },
  })

  let deleted = 0
  for (const user of demoUsers) {
    if (user._count.members === 0) {
      await db.account.deleteMany({ where: { userId: user.id } })
      await db.session.deleteMany({ where: { userId: user.id } })
      await db.user.delete({ where: { id: user.id } })
      deleted++
    }
  }
  return deleted
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedDemoOrg(db: Database): Promise<void> {
  const seasonStructure = getSeasonStructure()
  console.log("[demo-seed] Seeding demo dataset...")

  // ── 1. Delete existing demo org (CASCADE cleans all related data) ────
  console.log("[demo-seed] Deleting existing demo org (if any)...")
  await deleteDemoOrg(db)
  await cleanupDemoUsers(db)

  // ── 1b. Clean and regenerate seed images ─────────────────────────────
  console.log("[demo-seed] Cleaning uploads directory...")
  await cleanOrgUploads(DEMO_ORG_ID)

  const seedImages = await generateSeedImages({
    orgId: DEMO_ORG_ID,
    teams: TEAMS.map((t, i) => ({
      shortName: t.shortName,
      primaryColor: TEAM_COLORS[i]?.[0] ?? "#333333",
      secondaryColor: TEAM_COLORS[i]?.[1] ?? "#FFFFFF",
    })),
    players: PLAYERS_PER_TEAM.flatMap((teamPlayers, teamIdx) =>
      teamPlayers.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        jerseyNumber: p.jerseyNumber,
        teamIdx,
        position: p.position,
      })),
    ),
    sponsors: [
      { name: "Karlsruhe Utilities" },
      { name: "Mueller Auto Group" },
      { name: "Swabian Brewery" },
      { name: "SportShop24" },
      { name: "Old Town Pharmacy" },
    ],
  })

  // ── 1c. Organization ─────────────────────────────────────────────────
  console.log("[demo-seed] Creating organization...")
  await db.organization.create({
    data: {
      id: DEMO_ORG_ID,
      name: "Demo League",
      slug: "demo-league",
      createdAt: new Date(),
    },
  })

  // ── 1d. Assign Pro plan (unlimited features) ──────────────────────────
  const proPlan = await db.plan.findUnique({ where: { slug: "pro" } })
  if (proPlan) {
    // Ensure Pro plan has AI features
    await db.plan.update({
      where: { id: proPlan.id },
      data: { featureAiRecaps: true, aiMonthlyTokenLimit: 500000 },
    })
    console.log("[demo-seed] Assigning Pro plan to demo org...")
    const now = new Date()
    const farFuture = new Date(now)
    farFuture.setFullYear(farFuture.getFullYear() + 100)
    await db.orgSubscription.upsert({
      where: { organizationId: DEMO_ORG_ID },
      create: {
        organizationId: DEMO_ORG_ID,
        planId: proPlan.id,
        interval: "monthly",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: farFuture,
      },
      update: {
        planId: proPlan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: farFuture,
      },
    })
  }

  // ── 1e. Website config (subdomain derived from organization.slug) ────
  console.log("[demo-seed] Creating website config...")
  await db.websiteConfig.upsert({
    where: { organizationId: DEMO_ORG_ID },
    create: {
      organizationId: DEMO_ORG_ID,
      isActive: true,
      templatePreset: "classic",
    },
    update: {
      isActive: true,
    },
  })

  // ── 2. Reference data ────────────────────────────────────────────────
  console.log("[demo-seed] Ensuring penalty types exist...")
  await db.penaltyType.createMany({ data: PENALTY_TYPES, skipDuplicates: true })
  const insertedPenaltyTypes = await db.penaltyType.findMany()

  console.log("[demo-seed] Ensuring trikot templates exist...")
  await db.trikotTemplate.createMany({
    data: [
      { name: "One-color", templateType: "one_color", colorCount: 1, svg: TRIKOT_TEMPLATE_SVG_EINFARBIG },
      { name: "Two-color", templateType: "two_color", colorCount: 2, svg: TRIKOT_TEMPLATE_SVG_ZWEIFARBIG },
    ],
    skipDuplicates: true,
  })
  const insertedTemplates = await db.trikotTemplate.findMany()

  const oneColorTemplate = insertedTemplates.find((t) => t.templateType === "one_color")!
  const twoColorTemplate = insertedTemplates.find((t) => t.templateType === "two_color")!

  // ── 2b. System settings ──────────────────────────────────────────────
  console.log("[demo-seed] Seeding system settings...")
  await db.systemSettings.create({
    data: {
      organizationId: DEMO_ORG_ID,
      leagueName: "PuckHub Demo League",
      leagueShortName: "PDL",
      locale: "en-US",
      timezone: "Europe/Berlin",
      pointsWin: 2,
      pointsDraw: 1,
      pointsLoss: 0,
    },
  })

  // ── 2c. Demo users ───────────────────────────────────────────────────
  console.log("[demo-seed] Creating demo users...")
  const demoUsers = await createDemoUsers(db)
  const adminUserId = demoUsers.find((u) => u.email === `admin${DEMO_EMAIL_DOMAIN}`)!.userId

  // ── 3. Seasons ───────────────────────────────────────────────────────
  console.log(`[demo-seed] Seeding ${seasonStructure.length} seasons...`)
  const insertedSeasons = await db.season.createManyAndReturn({
    data: seasonStructure.map((s) => ({
      organizationId: DEMO_ORG_ID,
      name: s.name,
      seasonStart: new Date(Date.UTC(s.year, 8, 1, 0, 0, 0)),
      seasonEnd: new Date(Date.UTC(s.year + 1, 3, 30, 23, 59, 59)),
    })),
  })

  const seasonByYear = new Map(seasonStructure.map((s, i) => [s.year, insertedSeasons[i]!]))

  // ── 4. Divisions ─────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding divisions...")
  const divisionValues: any[] = []
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (let i = 0; i < seasonDef.divisions.length; i++) {
      const div = seasonDef.divisions[i]!
      divisionValues.push({
        organizationId: DEMO_ORG_ID,
        seasonId: season.id,
        name: div.name,
        sortOrder: i,
        goalieMinGames: 3,
      })
    }
  }
  const insertedDivisions = await db.division.createManyAndReturn({ data: divisionValues })

  const divisionLookup = new Map(insertedDivisions.map((d) => [`${d.seasonId}:${d.name}`, d]))

  // ── 5. Rounds ────────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding rounds...")
  const roundValues: any[] = []
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (const divDef of seasonDef.divisions) {
      const division = divisionLookup.get(`${season.id}:${divDef.name}`)!
      for (let i = 0; i < divDef.rounds.length; i++) {
        const round = divDef.rounds[i]!
        roundValues.push({
          organizationId: DEMO_ORG_ID,
          divisionId: division.id,
          name: round.name,
          roundType: round.roundType,
          sortOrder: i,
          countsForPlayerStats: round.countsForPlayerStats ?? true,
          countsForGoalieStats: round.countsForGoalieStats ?? round.roundType === "regular",
        })
      }
    }
  }
  const insertedRounds = await db.round.createManyAndReturn({ data: roundValues })

  // ── 6. Teams ─────────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding 10 teams...")
  const insertedTeams = await db.team.createManyAndReturn({
    data: TEAMS.map((t, i) => ({
      organizationId: DEMO_ORG_ID,
      name: t.name,
      shortName: t.shortName,
      city: t.city,
      homeVenue: VENUE_NAMES[i] ?? null,
      logoUrl: seedImages.teamLogoUrls[i],
    })),
  })

  // ── 7. Team-Division assignments ─────────────────────────────────────
  console.log("[demo-seed] Seeding team-division assignments...")
  const tdValues: any[] = []
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (const divDef of seasonDef.divisions) {
      const division = divisionLookup.get(`${season.id}:${divDef.name}`)!
      for (const teamIdx of divDef.teamIndices) {
        const team = insertedTeams[teamIdx]
        if (!team) continue
        tdValues.push({
          organizationId: DEMO_ORG_ID,
          teamId: team.id,
          divisionId: division.id,
        })
      }
    }
  }
  await db.teamDivision.createMany({ data: tdValues })

  // ── 9. Games ─────────────────────────────────────────────────────────
  console.log(`[demo-seed] Seeding ~${GAMES_PER_ROUND} games per round...`)
  const gamesValues: any[] = []
  const seasonYearById = new Map(seasonStructure.map((s, i) => [insertedSeasons[i]?.id, s.year]))

  for (let seasonIdx = 0; seasonIdx < seasonStructure.length; seasonIdx++) {
    const seasonDef = seasonStructure[seasonIdx]!
    const season = seasonByYear.get(seasonDef.year)!
    const seasonYear = seasonDef.year
    for (const divDef of seasonDef.divisions) {
      const division = divisionLookup.get(`${season.id}:${divDef.name}`)!
      const teamIds = divDef.teamIndices.map((idx) => insertedTeams[idx]!.id)
      if (teamIds.length < 2) continue

      for (let roundIdx = 0; roundIdx < divDef.rounds.length; roundIdx++) {
        const roundDef = divDef.rounds[roundIdx]!
        const round = insertedRounds.find(
          (r) => r.divisionId === division.id && r.sortOrder === roundIdx && r.name === roundDef.name,
        )
        if (!round) continue

        const fixtures = generateFixtures(teamIds, GAMES_PER_ROUND, seasonYear * 100 + roundIdx * 7 + seasonIdx)
        const gamesPerMatchday = Math.max(1, Math.floor(teamIds.length / 2))
        const seasonStart = new Date(Date.UTC(seasonYear, 8, 1, 18, 0, 0))
        const seasonEnd = new Date(Date.UTC(seasonYear + 1, 3, 30, 22, 0, 0))
        const dayMs = 24 * 60 * 60 * 1000
        const seasonDaySpan = Math.max(1, Math.floor((seasonEnd.getTime() - seasonStart.getTime()) / dayMs))
        const roundCount = Math.max(1, divDef.rounds.length)
        const roundWindow = Math.max(14, Math.floor(seasonDaySpan / roundCount))
        const roundStartDay = roundIdx * roundWindow
        const roundEndDay =
          roundIdx === roundCount - 1 ? seasonDaySpan : Math.min(seasonDaySpan, (roundIdx + 1) * roundWindow - 1)
        const roundDaySpan = Math.max(1, roundEndDay - roundStartDay + 1)
        const eveningSlots: Array<[number, number]> = [
          [18, 0],
          [18, 30],
          [19, 0],
          [19, 30],
          [20, 0],
          [20, 30],
          [21, 0],
        ]
        const now = new Date()

        for (let gameIdx = 0; gameIdx < fixtures.length; gameIdx++) {
          const fixture = fixtures[gameIdx]!
          const matchday = Math.floor(gameIdx / gamesPerMatchday)
          const gameProgress = fixtures.length > 1 ? gameIdx / (fixtures.length - 1) : 0
          const baseRoundDay = roundStartDay + Math.floor(gameProgress * (roundDaySpan - 1))
          const scheduledAt = new Date(seasonStart)
          const dayJitter = seededInt(seasonYear * 500 + roundIdx * 50 + gameIdx, -1, 1)
          const dayOffset = Math.max(roundStartDay, Math.min(roundEndDay, baseRoundDay + dayJitter))
          const clampedOffset = Math.max(0, Math.min(seasonDaySpan, dayOffset + (matchday % 2)))
          scheduledAt.setUTCDate(seasonStart.getUTCDate() + clampedOffset)
          const slot = eveningSlots[(gameIdx + roundIdx + seasonIdx) % eveningSlots.length]!
          scheduledAt.setUTCHours(slot[0], slot[1], 0, 0)

          const locationName = VENUE_NAMES[(seasonIdx + roundIdx * 3 + gameIdx) % VENUE_NAMES.length]!
          const isCompleted = scheduledAt.getTime() < now.getTime()
          const scoreSeed = seasonIdx * 10000 + roundIdx * 1000 + gameIdx * 10

          gamesValues.push({
            organizationId: DEMO_ORG_ID,
            roundId: round.id,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            location: locationName,
            scheduledAt,
            status: isCompleted ? "completed" : "scheduled",
            homeScore: isCompleted ? seededInt(scoreSeed + 1, 0, 8) : null,
            awayScore: isCompleted ? seededInt(scoreSeed + 2, 0, 8) : null,
            gameNumber: gameIdx + 1,
            notes: isCompleted ? "Seeded demo result" : "Seeded demo fixture",
            finalizedAt: isCompleted ? new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000) : null,
            createdAt: new Date(Date.UTC((seasonYearById.get(season.id) ?? seasonYear) - 1, 6, 1)),
            updatedAt: new Date(),
          })
        }
      }
    }
  }
  const insertedGames = await db.game.createManyAndReturn({ data: gamesValues })

  // ── 9b. Fake AI Recaps for completed games ─────────────────────────
  const completedGames = insertedGames.filter((g) => g.status === "completed" && g.homeScore !== null)
  const teamNameById = new Map(insertedTeams.map((t) => [t.id, t.name]))

  function generateFakeRecap(home: string, away: string, homeScore: number, awayScore: number, location: string | null) {
    const winner = homeScore > awayScore ? home : away
    const loser = homeScore > awayScore ? away : home
    const winScore = Math.max(homeScore, awayScore)
    const loseScore = Math.min(homeScore, awayScore)
    const diff = winScore - loseScore
    const isDraw = homeScore === awayScore
    const venue = location ?? "home ice"

    if (isDraw) {
      return {
        title: `${home} and ${away} battle to a ${homeScore}–${awayScore} draw at ${venue}`,
        content: [
          `<p>In a fiercely contested matchup at ${venue}, <strong>${home}</strong> and <strong>${away}</strong> skated to a hard-fought ${homeScore}–${awayScore} draw. Both teams delivered a physical, gritty performance and refused to give an inch throughout the sixty minutes.</p>`,
          `<h3>1st Period</h3>`,
          `<p>The opening frame saw an end-to-end affair with both goaltenders forced into spectacular saves early on. ${home} controlled possession for long stretches but couldn't find the breakthrough, as ${away}'s defensive structure held firm. The period ended with the teams locked at 0–0.</p>`,
          `<h3>2nd Period</h3>`,
          `<p>${home} turned up the pressure in the middle frame and were rewarded when they finally broke the deadlock. But ${away} responded almost immediately with a clinical counter-attack, restoring parity and sending the home crowd into a nervous silence.</p>`,
          `<h3>3rd Period</h3>`,
          `<p>Both teams pushed hard for the winner in the final period, trading chances at a frantic pace. In the end, neither side could find the decisive goal, and the teams had to settle for a point each — a fair result given the balance of play.</p>`,
        ].join("\n"),
      }
    }

    if (diff >= 4) {
      return {
        title: `${winner} dominate in commanding ${winScore}–${loseScore} victory over ${loser}`,
        content: [
          `<p>In a one-sided affair at ${venue}, <strong>${winner}</strong> put on an offensive masterclass to cruise to a dominant ${homeScore}–${awayScore} win over <strong>${loser}</strong>. The result was never in doubt as ${winner} controlled the game from start to finish.</p>`,
          `<h3>1st Period</h3>`,
          `<p>${winner} came out firing from the opening face-off and wasted no time establishing their authority. Two quick goals in the opening minutes stunned ${loser} and set the tone for what would become a long evening for the visitors. The defensive pressure was relentless, and ${loser} struggled to create any meaningful chances of their own.</p>`,
          `<h3>2nd Period</h3>`,
          `<p>${loser} tried to regroup during the intermission, but ${winner} picked up right where they left off. A power-play goal midway through the period extended the lead further, and the floodgates opened. ${winner}'s passing game was crisp and clinical, carving through the opposition defense almost at will.</p>`,
          `<h3>3rd Period</h3>`,
          `<p>With the game already well beyond reach, ${winner} showed no mercy in the final frame, adding to their tally and capping off an emphatic performance. ${loser} managed a consolation effort late on, but it was merely a footnote in an otherwise dominant display.</p>`,
          `<p>An outstanding evening for ${winner}, who demonstrated their quality across all three periods. ${loser} will need to regroup quickly and put this result behind them ahead of their next fixture.</p>`,
        ].join("\n"),
      }
    }

    if (diff >= 2) {
      return {
        title: `${winner} secure convincing ${winScore}–${loseScore} win against ${loser}`,
        content: [
          `<p><strong>${winner}</strong> earned a well-deserved ${homeScore}–${awayScore} victory over <strong>${loser}</strong> at ${venue}. A strong start and disciplined defensive play proved to be the winning formula on the night.</p>`,
          `<h3>1st Period</h3>`,
          `<p>Both teams started cautiously, feeling each other out in the early exchanges. ${winner} found the breakthrough midway through the period with a well-worked goal that rewarded their patient build-up play. ${loser} responded with increased pressure but couldn't find the equalizer before the horn.</p>`,
          `<h3>2nd Period</h3>`,
          `<p>The middle frame belonged to ${winner}. A quick double strike early in the period extended the lead and took the wind out of ${loser}'s sails. The penalty kill also stood strong, denying ${loser} on two power-play opportunities and maintaining the comfortable cushion.</p>`,
          `<h3>3rd Period</h3>`,
          `<p>${loser} threw everything forward in a desperate attempt to get back into the game and managed to pull one back. However, ${winner} remained composed, managing the clock effectively and sealing the victory with a late empty-net goal.</p>`,
          `<p>A professional performance from ${winner}, who showed maturity beyond the scoreline. ${loser} showed fight in the third but ultimately left it too late to mount a serious comeback.</p>`,
        ].join("\n"),
      }
    }

    return {
      title: `${winner} edge past ${loser} in a tight ${winScore}–${loseScore} contest`,
      content: [
        `<p>It was a nail-biter at ${venue} as <strong>${winner}</strong> held on for a narrow ${homeScore}–${awayScore} victory over <strong>${loser}</strong>. The game could have gone either way, with both teams creating quality chances throughout.</p>`,
        `<h3>1st Period</h3>`,
        `<p>A cagey opening period saw both teams respect each other's threats. Chances were at a premium as the defenses dominated, with both goaltenders called into action only sparingly. The frame ended scoreless, setting the stage for an intense middle twenty minutes.</p>`,
        `<h3>2nd Period</h3>`,
        `<p>The deadlock was finally broken when ${winner} capitalized on a turnover in the neutral zone, converting a clinical two-on-one rush. ${loser} hit back almost immediately with a power-play goal, and the seesaw battle continued with end-to-end action that had the crowd on the edge of their seats.</p>`,
        `<h3>3rd Period</h3>`,
        `<p>With everything on the line, both teams traded blows in a tense final period. ${winner} found the decisive goal with just minutes remaining, sending the home fans into raptures. ${loser} pulled their goaltender in a last-ditch effort but couldn't find the equalizer.</p>`,
        `<p>A gutsy win for ${winner}, who showed real character when it mattered most. ${loser} can hold their heads high after a spirited performance that deserved more.</p>`,
      ].join("\n"),
    }
  }

  // Add recaps to all completed games in the current and previous season
  const roundToSeasonId = new Map<string, string>()
  for (const round of insertedRounds) {
    const division = insertedDivisions.find((d) => d.id === round.divisionId)
    if (division) roundToSeasonId.set(round.id, division.seasonId)
  }
  const currentSeasonId = seasonByYear.get(CURRENT_SEASON_START_YEAR)?.id
  const lastSeasonId = seasonByYear.get(CURRENT_SEASON_START_YEAR - 1)?.id
  const recentSeasonIds = new Set([currentSeasonId, lastSeasonId].filter(Boolean))

  const gamesForRecap = completedGames.filter((g) => {
    const seasonId = roundToSeasonId.get(g.roundId)
    return seasonId != null && recentSeasonIds.has(seasonId)
  })
  if (gamesForRecap.length > 0) {
    console.log(`[demo-seed] Adding AI recaps to ${gamesForRecap.length} completed games (current + last season)...`)
    for (const game of gamesForRecap) {
      const homeName = teamNameById.get(game.homeTeamId) ?? "Home"
      const awayName = teamNameById.get(game.awayTeamId) ?? "Away"
      const recap = generateFakeRecap(homeName, awayName, game.homeScore!, game.awayScore!, game.location)
      await db.game.update({
        where: { id: game.id },
        data: {
          recapTitle: recap.title,
          recapContent: recap.content,
          recapGeneratedAt: new Date(game.finalizedAt!.getTime() + 30 * 60 * 1000),
        },
      })
    }
  }

  // ── 10. Players ──────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding 100 players...")
  const allPlayerDefs: { teamIdx: number; playerIdx: number; def: PlayerDef }[] = []
  for (let t = 0; t < PLAYERS_PER_TEAM.length; t++) {
    const teamPlayers = PLAYERS_PER_TEAM[t]
    if (!teamPlayers) continue
    for (let p = 0; p < teamPlayers.length; p++) {
      const playerDef = teamPlayers[p]
      if (!playerDef) continue
      allPlayerDefs.push({ teamIdx: t, playerIdx: p, def: playerDef })
    }
  }
  const insertedPlayers = await db.player.createManyAndReturn({
    data: allPlayerDefs.map((pd, i) => ({
      organizationId: DEMO_ORG_ID,
      firstName: pd.def.firstName,
      lastName: pd.def.lastName,
      dateOfBirth: new Date(pd.def.dob),
      nationality: "DE",
      photoUrl: seedImages.playerPhotoUrls[i],
    })),
  })

  const playerLookup = new Map(allPlayerDefs.map((pd, i) => [`${pd.teamIdx}:${pd.playerIdx}`, insertedPlayers[i]!]))

  // ── 11. Contracts ────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding contracts...")
  const firstSeasonYear = Math.min(...seasonStructure.map((s) => s.year))
  const firstSeason = seasonByYear.get(firstSeasonYear)!
  const contractValues: any[] = []

  for (const pd of allPlayerDefs) {
    const player = playerLookup.get(`${pd.teamIdx}:${pd.playerIdx}`)!
    const team = insertedTeams[pd.teamIdx]!

    const transfer = TRANSFERS.find((tr) => tr.teamIdx === pd.teamIdx && tr.playerIdx === pd.playerIdx)
    const retirement = RETIREMENTS.find((rt) => rt.teamIdx === pd.teamIdx && rt.playerIdx === pd.playerIdx)

    if (transfer) {
      const endSeasonYear = firstSeasonYear + transfer.afterSeasonOffset
      const endSeason = seasonByYear.get(endSeasonYear)!
      contractValues.push({
        organizationId: DEMO_ORG_ID,
        playerId: player.id,
        teamId: team.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: firstSeason.id,
        endSeasonId: endSeason.id,
      })
      const newTeam = insertedTeams[transfer.toTeamIdx]!
      const nextYear = endSeasonYear + 1
      const startSeason = seasonByYear.get(nextYear)!
      contractValues.push({
        organizationId: DEMO_ORG_ID,
        playerId: player.id,
        teamId: newTeam.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: startSeason.id,
        endSeasonId: undefined,
      })
    } else if (retirement) {
      const endSeasonYear = firstSeasonYear + retirement.afterSeasonOffset
      const endSeason = seasonByYear.get(endSeasonYear)!
      contractValues.push({
        organizationId: DEMO_ORG_ID,
        playerId: player.id,
        teamId: team.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: firstSeason.id,
        endSeasonId: endSeason.id,
      })
    } else {
      contractValues.push({
        organizationId: DEMO_ORG_ID,
        playerId: player.id,
        teamId: team.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: firstSeason.id,
        endSeasonId: undefined,
      })
    }
  }
  await db.contract.createMany({ data: contractValues })

  // ── 11b. Game Reports (lineups, events, suspensions) ─────────────────
  console.log("[demo-seed] Seeding game reports for completed games...")

  const rosterByTeamId = new Map<
    string,
    Array<{ playerId: string; position: "forward" | "defense" | "goalie"; jerseyNumber: number }>
  >()
  for (const pd of allPlayerDefs) {
    const player = playerLookup.get(`${pd.teamIdx}:${pd.playerIdx}`)!
    const team = insertedTeams[pd.teamIdx]!
    if (!rosterByTeamId.has(team.id)) rosterByTeamId.set(team.id, [])
    rosterByTeamId.get(team.id)?.push({
      playerId: player.id,
      position: pd.def.position,
      jerseyNumber: pd.def.jerseyNumber,
    })
  }

  const penaltyTypeMinor = insertedPenaltyTypes.find((pt) => pt.code === "MINOR")!
  const penaltyTypeDoubleMinor = insertedPenaltyTypes.find((pt) => pt.code === "DOUBLE_MINOR")!
  const penaltyTypeMajor = insertedPenaltyTypes.find((pt) => pt.code === "MAJOR")!
  const penaltyTypeMisconduct = insertedPenaltyTypes.find((pt) => pt.code === "MISCONDUCT")!
  const penaltyPool = [
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeDoubleMinor,
    penaltyTypeMajor,
    penaltyTypeMisconduct,
  ]
  const penaltyReasons = [
    "Tripping",
    "Hooking",
    "Holding",
    "High-sticking",
    "Interference",
    "Boarding",
    "Elbowing",
    "Slashing",
    "Delay of game",
    "Too many men",
  ]

  const reportGames = insertedGames.filter(
    (g) => g.status === "completed" && g.homeScore != null && g.awayScore != null,
  )

  const lineupValues: any[] = []
  const eventValues: any[] = []
  const suspensionValues: any[] = []
  const goalieGameStatsValues: any[] = []

  let totalGoals = 0
  let totalPenalties = 0
  let totalSuspensions = 0

  for (let gi = 0; gi < reportGames.length; gi++) {
    const game = reportGames[gi]!
    const homeRoster = rosterByTeamId.get(game.homeTeamId) ?? []
    const awayRoster = rosterByTeamId.get(game.awayTeamId) ?? []

    if (homeRoster.length === 0 || awayRoster.length === 0) continue

    const gameSeed = gi * 137 + 42

    // Lineups
    for (const rp of homeRoster) {
      lineupValues.push({
        organizationId: DEMO_ORG_ID,
        gameId: game.id,
        playerId: rp.playerId,
        teamId: game.homeTeamId,
        position: rp.position,
        jerseyNumber: rp.jerseyNumber,
        isStartingGoalie:
          rp.position === "goalie" && homeRoster.filter((r) => r.position === "goalie").indexOf(rp) === 0,
      })
    }
    for (const rp of awayRoster) {
      lineupValues.push({
        organizationId: DEMO_ORG_ID,
        gameId: game.id,
        playerId: rp.playerId,
        teamId: game.awayTeamId,
        position: rp.position,
        jerseyNumber: rp.jerseyNumber,
        isStartingGoalie:
          rp.position === "goalie" && awayRoster.filter((r) => r.position === "goalie").indexOf(rp) === 0,
      })
    }

    // Goal events
    const homeGoals = game.homeScore!
    const awayGoals = game.awayScore!
    const homeSkaters = homeRoster.filter((r) => r.position !== "goalie")
    const awaySkaters = awayRoster.filter((r) => r.position !== "goalie")
    const homeGoalies = homeRoster.filter((r) => r.position === "goalie")
    const awayGoalies = awayRoster.filter((r) => r.position === "goalie")

    const allGoals: Array<{ teamId: string; isHome: boolean; period: number; min: number; sec: number }> = []
    for (let g = 0; g < homeGoals; g++) {
      const period = seededInt(gameSeed + g * 3, 1, 3)
      allGoals.push({
        teamId: game.homeTeamId,
        isHome: true,
        period,
        min: seededInt(gameSeed + g * 7 + 1, 0, 19),
        sec: seededInt(gameSeed + g * 7 + 2, 0, 59),
      })
    }
    for (let g = 0; g < awayGoals; g++) {
      const period = seededInt(gameSeed + 500 + g * 3, 1, 3)
      allGoals.push({
        teamId: game.awayTeamId,
        isHome: false,
        period,
        min: seededInt(gameSeed + 500 + g * 7 + 1, 0, 19),
        sec: seededInt(gameSeed + 500 + g * 7 + 2, 0, 59),
      })
    }
    allGoals.sort((a, b) => a.period - b.period || a.min - b.min || a.sec - b.sec)

    for (let g = 0; g < allGoals.length; g++) {
      const goal = allGoals[g]!
      const skaters = goal.isHome ? homeSkaters : awaySkaters
      const opposingGoalies = goal.isHome ? awayGoalies : homeGoalies
      if (skaters.length === 0) continue

      const scorerIdx = seededInt(gameSeed + g * 11, 0, skaters.length - 1)
      const scorer = skaters[scorerIdx]!

      let assist1Id: string | null = null
      if (seededFraction(gameSeed + g * 13) < 0.7 && skaters.length > 1) {
        let a1Idx = seededInt(gameSeed + g * 17, 0, skaters.length - 1)
        if (a1Idx === scorerIdx) a1Idx = (a1Idx + 1) % skaters.length
        assist1Id = skaters[a1Idx]?.playerId ?? null
      }

      let assist2Id: string | null = null
      if (assist1Id && seededFraction(gameSeed + g * 19) < 0.4 && skaters.length > 2) {
        let a2Idx = seededInt(gameSeed + g * 23, 0, skaters.length - 1)
        while (skaters[a2Idx]?.playerId === scorer.playerId || skaters[a2Idx]?.playerId === assist1Id) {
          a2Idx = (a2Idx + 1) % skaters.length
        }
        assist2Id = skaters[a2Idx]?.playerId ?? null
      }

      const goalieId = opposingGoalies.length > 0 ? opposingGoalies[0]?.playerId : null

      eventValues.push({
        organizationId: DEMO_ORG_ID,
        gameId: game.id,
        eventType: "goal",
        teamId: goal.teamId,
        period: goal.period,
        timeMinutes: goal.min,
        timeSeconds: goal.sec,
        scorerId: scorer.playerId,
        assist1Id,
        assist2Id,
        goalieId,
      })
      totalGoals++
    }

    // Penalty events
    const numPenalties = seededInt(gameSeed + 900, 2, 5)
    for (let p = 0; p < numPenalties; p++) {
      const isHome = seededFraction(gameSeed + 1000 + p * 7) < 0.5
      const teamId = isHome ? game.homeTeamId : game.awayTeamId
      const roster = isHome ? homeRoster : awayRoster
      if (roster.length === 0) continue

      const playerIdx = seededInt(gameSeed + 1000 + p * 11, 0, roster.length - 1)
      const player = roster[playerIdx]!
      const penaltyType = penaltyPool[seededInt(gameSeed + 1000 + p * 13, 0, penaltyPool.length - 1)]!
      const reason = penaltyReasons[seededInt(gameSeed + 1000 + p * 17, 0, penaltyReasons.length - 1)]!
      const period = seededInt(gameSeed + 1000 + p * 19, 1, 3)

      eventValues.push({
        organizationId: DEMO_ORG_ID,
        gameId: game.id,
        eventType: "penalty",
        teamId,
        period,
        timeMinutes: seededInt(gameSeed + 1000 + p * 23, 0, 19),
        timeSeconds: seededInt(gameSeed + 1000 + p * 29, 0, 59),
        penaltyPlayerId: player.playerId,
        penaltyTypeId: penaltyType.id,
        penaltyMinutes: penaltyType.defaultMinutes,
        penaltyDescription: reason,
      })
      totalPenalties++
    }

    // Suspensions
    if (seededFraction(gameSeed + 2000) < 0.1 && numPenalties > 0) {
      const isHome = seededFraction(gameSeed + 2001) < 0.5
      const teamId = isHome ? game.homeTeamId : game.awayTeamId
      const roster = isHome ? homeRoster : awayRoster
      if (roster.length > 0) {
        const playerIdx = seededInt(gameSeed + 2002, 0, roster.length - 1)
        const suspendedPlayer = roster[playerIdx]
        if (suspendedPlayer) {
          suspensionValues.push({
            organizationId: DEMO_ORG_ID,
            gameId: game.id,
            playerId: suspendedPlayer.playerId,
            teamId,
            suspensionType: seededFraction(gameSeed + 2003) < 0.6 ? "match_penalty" : "game_misconduct",
            suspendedGames: seededInt(gameSeed + 2004, 1, 3),
            servedGames: seededInt(gameSeed + 2005, 0, 1),
            reason: penaltyReasons[seededInt(gameSeed + 2006, 0, penaltyReasons.length - 1)],
          })
          totalSuspensions++
        }
      }
    }

    // Goalie game stats
    const homeStartingGoalie = homeGoalies[0]
    const awayStartingGoalie = awayGoalies[0]
    if (homeStartingGoalie) {
      goalieGameStatsValues.push({
        organizationId: DEMO_ORG_ID,
        gameId: game.id,
        playerId: homeStartingGoalie.playerId,
        teamId: game.homeTeamId,
        goalsAgainst: awayGoals,
      })
    }
    if (awayStartingGoalie) {
      goalieGameStatsValues.push({
        organizationId: DEMO_ORG_ID,
        gameId: game.id,
        playerId: awayStartingGoalie.playerId,
        teamId: game.awayTeamId,
        goalsAgainst: homeGoals,
      })
    }
  }

  // Insert in batches
  if (lineupValues.length > 0) {
    const BATCH = 500
    for (let i = 0; i < lineupValues.length; i += BATCH) {
      await db.gameLineup.createMany({ data: lineupValues.slice(i, i + BATCH) })
    }
  }
  if (eventValues.length > 0) {
    const BATCH = 500
    for (let i = 0; i < eventValues.length; i += BATCH) {
      await db.gameEvent.createMany({ data: eventValues.slice(i, i + BATCH) })
    }
  }
  if (suspensionValues.length > 0) {
    await db.gameSuspension.createMany({ data: suspensionValues })
  }
  if (goalieGameStatsValues.length > 0) {
    const BATCH = 500
    for (let i = 0; i < goalieGameStatsValues.length; i += BATCH) {
      await db.goalieGameStat.createMany({ data: goalieGameStatsValues.slice(i, i + BATCH) })
    }
  }

  console.log(
    `[demo-seed]    → ${reportGames.length} games with reports (${totalGoals} goals, ${totalPenalties} penalties, ${totalSuspensions} suspensions)`,
  )
  console.log(
    `[demo-seed]    → ${lineupValues.length} lineup entries, ${goalieGameStatsValues.length} goalie game stats`,
  )

  // ── 11c. Recalculate player + goalie season stats ────────────────────
  console.log("[demo-seed] Recalculating player and goalie season stats...")
  for (const season of insertedSeasons) {
    await recalculatePlayerStats(db, season.id)
    await recalculateGoalieStats(db, season.id)
  }
  console.log("[demo-seed]    → Player and goalie season stats recalculated")

  // ── 11d. Seed bonus points ───────────────────────────────────────────
  console.log("[demo-seed] Seeding bonus points...")
  const bonusReasons = [
    "Fair play award",
    "Delayed game start",
    "Lineup rule violation",
    "Youth development bonus",
    "Unsportsmanlike conduct penalty",
    "Forfeit of mandatory game",
  ]

  const bonusValues: any[] = []
  const roundTeamsMap = new Map<string, string[]>()
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (const divDef of seasonDef.divisions) {
      const division = divisionLookup.get(`${season.id}:${divDef.name}`)!
      const teamIds = divDef.teamIndices.map((idx) => insertedTeams[idx]!.id)
      for (const round of insertedRounds.filter((r) => r.divisionId === division.id)) {
        roundTeamsMap.set(round.id, teamIds)
      }
    }
  }

  let bonusSeed = 42
  for (let i = 0; i < insertedRounds.length; i++) {
    if (i % 3 !== 0) continue
    const round = insertedRounds[i]!
    const teamIds = roundTeamsMap.get(round.id)
    if (!teamIds || teamIds.length < 2) continue

    const count = (bonusSeed % 2) + 1
    for (let j = 0; j < count; j++) {
      const teamIdx = (bonusSeed + j * 3) % teamIds.length
      const reasonIdx = (bonusSeed + j) % bonusReasons.length
      const isPositive = reasonIdx < 4
      const pts = isPositive ? (bonusSeed % 3) + 1 : -(bonusSeed % 2) - 1
      bonusValues.push({
        organizationId: DEMO_ORG_ID,
        teamId: teamIds[teamIdx]!,
        roundId: round.id,
        points: pts,
        reason: bonusReasons[reasonIdx],
      })
      bonusSeed += 7
    }
  }
  if (bonusValues.length > 0) {
    await db.bonusPoint.createMany({ data: bonusValues })
  }
  console.log(`[demo-seed]    → ${bonusValues.length} bonus point entries`)

  // ── 11e. Recalculate standings ───────────────────────────────────────
  console.log("[demo-seed] Recalculating standings...")
  for (const round of insertedRounds) {
    await recalculateStandings(db, round.id)
  }
  console.log(`[demo-seed]    → Standings recalculated for ${insertedRounds.length} rounds`)

  // ── 12. Trikots + Team-Trikots ───────────────────────────────────────
  console.log("[demo-seed] Seeding trikots...")
  const trikotValues: any[] = []
  for (let t = 0; t < insertedTeams.length; t++) {
    const team = insertedTeams[t]!
    const colors = TEAM_COLORS[t]!
    trikotValues.push({
      organizationId: DEMO_ORG_ID,
      name: `${team.name} Home`,
      templateId: twoColorTemplate.id,
      primaryColor: colors[0],
      secondaryColor: colors[1],
    })
    trikotValues.push({
      organizationId: DEMO_ORG_ID,
      name: `${team.name} Away`,
      templateId: oneColorTemplate.id,
      primaryColor: colors[2],
      secondaryColor: colors[3],
    })
  }
  const insertedTrikots = await db.trikot.createManyAndReturn({ data: trikotValues })

  console.log("[demo-seed] Seeding team-trikots...")
  const teamTrikotValues: any[] = []
  for (let t = 0; t < insertedTeams.length; t++) {
    const team = insertedTeams[t]!
    const homeTrikot = insertedTrikots[t * 2]!
    const awayTrikot = insertedTrikots[t * 2 + 1]!
    teamTrikotValues.push({
      organizationId: DEMO_ORG_ID,
      teamId: team.id,
      trikotId: homeTrikot.id,
      name: "Home",
    })
    teamTrikotValues.push({
      organizationId: DEMO_ORG_ID,
      teamId: team.id,
      trikotId: awayTrikot.id,
      name: "Away",
    })
  }
  await db.teamTrikot.createMany({ data: teamTrikotValues })

  // ── 13. Sponsors ─────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding sponsors...")
  const sponsorValues: any[] = [
    {
      organizationId: DEMO_ORG_ID,
      name: "Karlsruhe Utilities",
      websiteUrl: "https://example.com/karlsruhe-utilities",
      hoverText: "Official energy partner",
      sortOrder: 1,
      isActive: true,
      logoUrl: seedImages.sponsorLogoUrls[0],
    },
    {
      organizationId: DEMO_ORG_ID,
      name: "Mueller Auto Group",
      websiteUrl: "https://example.com/mueller-auto",
      hoverText: "Local mobility partner",
      teamId: insertedTeams[0]?.id,
      sortOrder: 2,
      isActive: true,
      logoUrl: seedImages.sponsorLogoUrls[1],
    },
    {
      organizationId: DEMO_ORG_ID,
      name: "Swabian Brewery",
      websiteUrl: "https://example.com/swabian-brewery",
      hoverText: "Refreshment partner",
      teamId: insertedTeams[1]?.id,
      sortOrder: 3,
      isActive: true,
      logoUrl: seedImages.sponsorLogoUrls[2],
    },
    {
      organizationId: DEMO_ORG_ID,
      name: "SportShop24",
      websiteUrl: "https://example.com/sportshop24",
      hoverText: "Equipment partner",
      sortOrder: 4,
      isActive: true,
      logoUrl: seedImages.sponsorLogoUrls[3],
    },
    {
      organizationId: DEMO_ORG_ID,
      name: "Old Town Pharmacy",
      hoverText: "Former sponsor",
      sortOrder: 5,
      isActive: false,
      logoUrl: seedImages.sponsorLogoUrls[4],
    },
  ]
  await db.sponsor.createMany({ data: sponsorValues })

  // ── 14. News ─────────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding news...")
  const newsValues: any[] = [
    {
      organizationId: DEMO_ORG_ID,
      title: "2024/25 season kickoff: schedule is live",
      shortText: "The full fixture list is now available for all 10 teams.",
      content:
        "<h2>The new season starts now</h2><p>After the summer break, all teams return to the ice with a packed schedule.</p><p>Opening night begins on <strong>October 15, 2024</strong>. Playoffs and playdowns follow in spring 2025.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-09-15T10:00:00Z"),
      createdAt: new Date("2024-09-15T10:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Karlsruhe signs two forwards",
      shortText: "The club adds depth and speed up front.",
      content:
        "<h2>Roster update</h2><p>Karlsruhe added two experienced forwards from the region to strengthen the top six.</p><p>The coaching staff expects immediate impact in transition and special teams.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-10-01T14:30:00Z"),
      createdAt: new Date("2024-10-01T14:30:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "League confirms playoff format changes",
      shortText: "Best-of-three and updated overtime rules are approved.",
      content:
        "<h2>Playoff update</h2><p>The board approved key format changes for postseason play.</p><ul><li>Best-of-three in the first round</li><li>Home-ice advantage for higher seed</li><li>5-minute 3-on-3 overtime before shootout</li></ul>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-11-20T09:00:00Z"),
      createdAt: new Date("2024-11-20T09:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Holiday break schedule update",
      shortText: "Adjusted ice times apply from late December to early January.",
      content:
        "<h2>Holiday operations</h2><p>Training schedules are adjusted between <strong>December 23 and January 6</strong>.</p><p>League play resumes on <strong>January 11, 2025</strong>.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-12-18T16:00:00Z"),
      createdAt: new Date("2024-12-18T16:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Second half preview: race to playoffs",
      shortText: "The table is tight and every point matters.",
      content:
        "<h2>Mid-season outlook</h2><p>Five teams are within striking distance at the top, setting up a competitive run-in.</p><p>Expect decisive games through January and February as playoff positions are finalized.</p>",
      status: "draft",
      authorId: adminUserId,
      createdAt: new Date("2025-01-05T11:00:00Z"),
    },
    // ── Additional news for realistic pagination ──
    {
      organizationId: DEMO_ORG_ID,
      title: "Heidelberg Wolves announce new coaching staff",
      shortText: "Former pro-league assistant joins as head coach.",
      content:
        "<h2>New era in Heidelberg</h2><p>The Wolves have hired a new coaching team to lead the franchise into the next chapter.</p><p>The incoming head coach brings over 15 years of experience from higher-level leagues.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-09-20T08:00:00Z"),
      createdAt: new Date("2024-09-20T08:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Preseason tournament results",
      shortText: "Karlsruhe takes the preseason cup after a dominant weekend.",
      content:
        "<h2>Preseason wrap-up</h2><p>All ten teams competed in a two-day round-robin to warm up for the regular season.</p><p>Eisbären Karlsruhe went undefeated, winning four straight games including a convincing 5-1 final.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-09-28T17:00:00Z"),
      createdAt: new Date("2024-09-28T17:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Opening night recap: thrilling start to the season",
      shortText: "Five games produce 34 goals on a memorable opening night.",
      content:
        "<h2>What a start</h2><p>The 2024/25 season opened with a bang as five simultaneous games delivered drama across the board.</p><p>Highlights include a hat trick by Karlsruhe's top scorer and a last-second equalizer in Freiburg.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-10-15T21:30:00Z"),
      createdAt: new Date("2024-10-15T21:30:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Mannheimer Pinguine extend winning streak to five",
      shortText: "Strong defensive play anchors Mannheim's hot start.",
      content:
        "<h2>Dominant stretch</h2><p>Mannheim's penalty kill has been nearly perfect over the last five games, allowing just one power-play goal.</p><p>The Pinguine sit atop the table with a comfortable margin heading into November.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-10-22T19:00:00Z"),
      createdAt: new Date("2024-10-22T19:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Referee seminar: rule changes explained",
      shortText: "Officials and team captains attended a league-wide rules briefing.",
      content:
        "<h2>Rules update</h2><p>The league hosted a seminar to walk through updated rules for the current season.</p><p>Key topics included hybrid icing enforcement, delay-of-game penalties, and overtime procedures.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-10-28T10:00:00Z"),
      createdAt: new Date("2024-10-28T10:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Injury report: Stuttgarter Eishexen lose captain for four weeks",
      shortText: "A lower-body injury sidelines the veteran defenseman.",
      content:
        "<h2>Tough blow</h2><p>Stuttgart's captain suffered an injury in Saturday's game against Ulm and will miss approximately four weeks.</p><p>The team has called up a prospect from their development squad to fill the roster spot.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-11-05T12:00:00Z"),
      createdAt: new Date("2024-11-05T12:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Freiburger Falken host charity game for youth hockey",
      shortText: "All proceeds go to the local youth development program.",
      content:
        "<h2>Giving back</h2><p>The Falken organized a special exhibition game to raise funds for youth hockey in the Freiburg region.</p><p>Over 800 fans attended and the event raised more than €5,000 for equipment and ice time.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-11-10T15:00:00Z"),
      createdAt: new Date("2024-11-10T15:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Player of the month: October honors go to Mannheim's goaltender",
      shortText: "A .942 save percentage earned the league's top individual award.",
      content:
        "<h2>October MVP</h2><p>Mannheim's starting goaltender posted a stellar .942 save percentage across eight starts in October.</p><p>He recorded two shutouts and allowed more than two goals only once during the month.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-11-02T09:00:00Z"),
      createdAt: new Date("2024-11-02T09:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Ulmer Bisons snap losing streak with dramatic OT winner",
      shortText: "A five-game slide ends on a highlight-reel goal.",
      content:
        "<h2>Back on track</h2><p>Ulm's losing streak came to an end in dramatic fashion when a rookie forward scored in overtime against Reutlingen.</p><p>The goal came on a 2-on-1 rush with just 30 seconds remaining in the extra period.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-11-15T20:30:00Z"),
      createdAt: new Date("2024-11-15T20:30:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Tübinger Eisbären promote three from junior team",
      shortText: "Young talent gets a chance as injuries mount.",
      content:
        "<h2>Youth movement</h2><p>Tübingen have called up three players from their under-20 squad to address a growing injury list.</p><p>All three are expected to slot into the bottom six and see power-play time immediately.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-11-25T11:00:00Z"),
      createdAt: new Date("2024-11-25T11:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Pforzheim Hurricanes unveil alternate jersey",
      shortText: "A black-and-gold design pays tribute to the city's heritage.",
      content:
        "<h2>New threads</h2><p>Pforzheim revealed their new alternate jersey at a fan event downtown.</p><p>The design features a gold lightning bolt across the chest, inspired by the city's jewelry-making tradition.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-12-01T14:00:00Z"),
      createdAt: new Date("2024-12-01T14:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Heilbronner Yetis trade for experienced defenseman",
      shortText: "A mid-season acquisition shores up the blue line.",
      content:
        "<h2>Trade alert</h2><p>Heilbronn acquired a veteran defenseman in exchange for a draft pick and a prospect.</p><p>The new addition brings leadership and a physical presence to a young defensive corps.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-12-05T16:30:00Z"),
      createdAt: new Date("2024-12-05T16:30:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Reutlinger Foxes win winter classic outdoors",
      shortText: "Over 2,000 fans braved the cold for a special open-air matchup.",
      content:
        "<h2>Winter classic success</h2><p>Reutlingen hosted the league's first outdoor game at the city's main sports complex.</p><p>Despite near-freezing temperatures, the atmosphere was electric as the Foxes won 4-2 against Heidelberg.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-12-14T18:00:00Z"),
      createdAt: new Date("2024-12-14T18:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "League introduces live-streaming for all games",
      shortText: "Every regular-season and playoff game will be available online.",
      content:
        "<h2>Watch from anywhere</h2><p>Starting in January, all league games will be streamed live on the league's new platform.</p><p>Fans can purchase a season pass or single-game access at affordable prices.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2024-12-22T10:00:00Z"),
      createdAt: new Date("2024-12-22T10:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Season resumes after holiday break",
      shortText: "Teams return to competitive action this weekend.",
      content:
        "<h2>Welcome back</h2><p>After a two-week break over the holidays, all ten teams are back in action.</p><p>The race for playoff spots heats up with 14 regular-season games remaining per team.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-01-11T09:00:00Z"),
      createdAt: new Date("2025-01-11T09:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Karlsruhe retakes top spot after weekend sweep",
      shortText: "Two convincing road wins push the Eisbären back to first.",
      content:
        "<h2>Statement weekend</h2><p>Karlsruhe picked up six points with wins in Pforzheim (4-1) and Heilbronn (3-0).</p><p>Their goaltender stopped 54 of 55 shots across both games to earn player-of-the-week honors.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-01-19T20:00:00Z"),
      createdAt: new Date("2025-01-19T20:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Player of the month: December goes to Freiburg forward",
      shortText: "Nine goals and six assists in eight games earn the honor.",
      content:
        "<h2>December MVP</h2><p>Freiburg's top-line forward put together a dominant December, leading the league in points during the month.</p><p>His nine goals included three game-winners, propelling the Falken into a playoff spot.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-01-08T09:00:00Z"),
      createdAt: new Date("2025-01-08T09:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "All-star game rosters announced",
      shortText: "Fan voting and coaching staff picks determine the final squads.",
      content:
        "<h2>Stars on ice</h2><p>The league's annual all-star game rosters have been finalized. Each team is represented by at least one player.</p><p>The event takes place on February 8 in Mannheim, including a skills competition the night before.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-01-25T12:00:00Z"),
      createdAt: new Date("2025-01-25T12:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Stuttgart captain returns ahead of schedule",
      shortText: "The veteran defenseman is cleared for full contact after just three weeks.",
      content:
        "<h2>Welcome back, captain</h2><p>Stuttgart's captain has been medically cleared to return, one week ahead of the original timeline.</p><p>He is expected to slot back into the top pair and resume his role on the first power-play unit.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-01-28T14:00:00Z"),
      createdAt: new Date("2025-01-28T14:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Trade deadline day: four deals completed",
      shortText: "Teams make final roster moves before the February 5 cutoff.",
      content:
        "<h2>Deadline drama</h2><p>Four trades were completed on deadline day as contenders bolstered their rosters for the playoff push.</p><p>The biggest move saw Mannheim acquire a scoring winger from Tübingen in exchange for two prospects.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-02-05T18:00:00Z"),
      createdAt: new Date("2025-02-05T18:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "All-star weekend recap: Mannheim dazzles",
      shortText: "The host city delivered a memorable event with record attendance.",
      content:
        "<h2>A night to remember</h2><p>Over 3,500 fans packed into Mannheim's arena for the all-star festivities.</p><p>The skills competition was highlighted by a jaw-dropping shootout round, and the exhibition game finished 8-7.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-02-09T21:00:00Z"),
      createdAt: new Date("2025-02-09T21:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Playoff race tightens: four teams separated by two points",
      shortText: "Positions 3 through 6 remain wide open with five games left.",
      content:
        "<h2>Down to the wire</h2><p>With five regular-season games remaining, the battle for playoff seeding is as close as it gets.</p><p>Stuttgart, Freiburg, Heidelberg, and Heilbronn are all within two points of each other.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-02-15T16:00:00Z"),
      createdAt: new Date("2025-02-15T16:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "League awards voting opens for regular season honors",
      shortText: "Coaches and media vote for MVP, best goaltender, and rookie of the year.",
      content:
        "<h2>Cast your votes</h2><p>Voting is now open for the three major individual awards of the regular season.</p><p>Winners will be announced at a ceremony before game one of the playoff finals.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-02-20T10:00:00Z"),
      createdAt: new Date("2025-02-20T10:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Regular season ends: final standings confirmed",
      shortText: "Karlsruhe finishes first, Mannheim second — playoffs begin next weekend.",
      content:
        "<h2>Season wrap</h2><p>The regular season is in the books. Karlsruhe clinched the top seed with a final-day win over Stuttgart.</p><p>Playoff matchups: (1) Karlsruhe vs (6) Heilbronn, (2) Mannheim vs (5) Heidelberg, (3) Stuttgart vs (4) Freiburg.</p>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-03-01T22:00:00Z"),
      createdAt: new Date("2025-03-01T22:00:00Z"),
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Playoff preview: first round matchups analyzed",
      shortText: "Breaking down the three best-of-three series.",
      content:
        "<h2>Playoff time</h2><p>The first round of the playoffs begins this Saturday. Here's a quick look at each matchup:</p><ul><li><strong>Karlsruhe vs Heilbronn:</strong> Experience vs youth — Karlsruhe is the heavy favorite.</li><li><strong>Mannheim vs Heidelberg:</strong> A rivalry game that could go either way.</li><li><strong>Stuttgart vs Freiburg:</strong> Two evenly matched teams with playoff pedigree.</li></ul>",
      status: "published",
      authorId: adminUserId,
      publishedAt: new Date("2025-03-05T11:00:00Z"),
      createdAt: new Date("2025-03-05T11:00:00Z"),
    },
  ]
  await db.news.createMany({ data: newsValues })

  // ── 15. Pages ────────────────────────────────────────────────────────
  console.log("[demo-seed] Seeding pages...")

  // System route pages (navigation entries)
  const systemRoutePages: any[] = [
    { organizationId: DEMO_ORG_ID, title: "Home", slug: "_route-home", routePath: "/", content: "", status: "published", isSystemRoute: true, menuLocations: ["main_nav"], sortOrder: 0 },
    { organizationId: DEMO_ORG_ID, title: "Standings", slug: "_route-standings", routePath: "/standings", content: "", status: "published", isSystemRoute: true, menuLocations: ["main_nav"], sortOrder: 1 },
    { organizationId: DEMO_ORG_ID, title: "Schedule", slug: "_route-schedule", routePath: "/schedule", content: "", status: "published", isSystemRoute: true, menuLocations: ["main_nav"], sortOrder: 2 },
    { organizationId: DEMO_ORG_ID, title: "Teams", slug: "_route-teams", routePath: "/teams", content: "", status: "published", isSystemRoute: true, menuLocations: ["main_nav"], sortOrder: 3 },
    { organizationId: DEMO_ORG_ID, title: "Statistics", slug: "_route-stats", routePath: "/stats", content: "", status: "published", isSystemRoute: true, menuLocations: ["main_nav"], sortOrder: 4 },
  ]
  const insertedSystemRoutes = await db.page.createManyAndReturn({ data: systemRoutePages })

  // Sub-route system pages (children of top-level routes)
  const statsPageId = insertedSystemRoutes.find((p) => p.slug === "_route-stats")!.id
  const teamsPageId = insertedSystemRoutes.find((p) => p.slug === "_route-teams")!.id

  const systemSubRoutePages: any[] = [
    { organizationId: DEMO_ORG_ID, title: "Scorers", slug: "_route-stats-scorers", routePath: "/stats/scorers", content: "", status: "published", isSystemRoute: true, menuLocations: [], sortOrder: 0, parentId: statsPageId },
    { organizationId: DEMO_ORG_ID, title: "Goals", slug: "_route-stats-goals", routePath: "/stats/goals", content: "", status: "published", isSystemRoute: true, menuLocations: [], sortOrder: 1, parentId: statsPageId },
    { organizationId: DEMO_ORG_ID, title: "Assists", slug: "_route-stats-assists", routePath: "/stats/assists", content: "", status: "published", isSystemRoute: true, menuLocations: [], sortOrder: 2, parentId: statsPageId },
    { organizationId: DEMO_ORG_ID, title: "Penalties", slug: "_route-stats-penalties", routePath: "/stats/penalties", content: "", status: "published", isSystemRoute: true, menuLocations: [], sortOrder: 3, parentId: statsPageId },
    { organizationId: DEMO_ORG_ID, title: "Goalies", slug: "_route-stats-goalies", routePath: "/stats/goalies", content: "", status: "published", isSystemRoute: true, menuLocations: [], sortOrder: 4, parentId: statsPageId },
    { organizationId: DEMO_ORG_ID, title: "Team Comparison", slug: "_route-teams-compare", routePath: "/stats/compare-teams", content: "", status: "published", isSystemRoute: true, menuLocations: [], sortOrder: 0, parentId: teamsPageId },
  ]
  await db.page.createMany({ data: systemSubRoutePages })

  const topLevelPages: any[] = [
    {
      organizationId: DEMO_ORG_ID,
      title: "Legal Notice",
      slug: "legal-notice",
      content:
        "<h2>Legal Notice</h2><p>PuckHub Demo League e.V.<br/>Sample Street 1<br/>76131 Karlsruhe</p><p>Represented by: Max Mustermann (President)</p><h3>Contact</h3><p>Email: info@puckhub-demo.de<br/>Phone: +49 721 12345678</p>",
      status: "published",
      menuLocations: ["footer"],
      sortOrder: 100,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Privacy Policy",
      slug: "privacy-policy",
      content:
        "<h2>Privacy Policy</h2><p>This page explains what personal data is collected when using this website and how it is processed.</p><p>We handle personal data confidentially and in accordance with applicable regulations.</p>",
      status: "published",
      menuLocations: ["footer"],
      sortOrder: 101,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Contact",
      slug: "contact",
      content:
        '<h2>Contact</h2><p>PuckHub Demo League e.V.<br/>Sample Street 1<br/>76131 Karlsruhe</p><p>Email: <a href="mailto:info@puckhub-demo.de">info@puckhub-demo.de</a><br/>Phone: +49 721 12345678</p><h3>Office hours</h3><p>Mon-Fri: 9:00 AM - 5:00 PM</p>',
      status: "published",
      menuLocations: ["footer"],
      sortOrder: 102,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "About The League",
      slug: "about-the-league",
      content:
        "<h2>About PuckHub Demo League</h2><p>The demo league was founded in 2015 and has grown into a stable regional competition.</p><p>Today, <strong>10 teams</strong> compete across regular season and postseason rounds.</p><h3>Core values</h3><ul><li>Fair play on and off the ice</li><li>Community and team spirit</li><li>Accessible hockey for everyone</li></ul>",
      status: "published",
      menuLocations: ["main_nav"],
      sortOrder: 1,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Rules And Guidance",
      slug: "rules-and-guidance",
      content:
        "<h2>Rules and guidance</h2><p>IIHF rules apply with local recreational adjustments.</p><h3>Game format</h3><ul><li>3 x 15-minute periods</li><li>5-minute intermissions</li></ul><h3>Safety rules</h3><ul><li>No full body checking</li><li>Protective equipment is mandatory</li></ul>",
      status: "published",
      menuLocations: ["main_nav", "footer"],
      sortOrder: 2,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Tryout Registration",
      slug: "tryout-registration",
      content:
        "<h2>Tryout sessions</h2><p>Interested in playing? Teams regularly host beginner-friendly tryout sessions.</p><p>Basic gear can be rented at most arenas. Contact your preferred team by email to register.</p>",
      status: "draft",
      menuLocations: [],
      sortOrder: 3,
    },
  ]

  const insertedPages = await db.page.createManyAndReturn({ data: topLevelPages })

  const aboutLeague = insertedPages.find((p) => p.slug === "about-the-league")!
  const rulesPage = insertedPages.find((p) => p.slug === "rules-and-guidance")!

  const subPages: any[] = [
    {
      organizationId: DEMO_ORG_ID,
      title: "Board And Operations",
      slug: "board-and-operations",
      content:
        "<h2>Board and operations</h2><p><strong>President:</strong> Max Mustermann</p><p><strong>Vice President:</strong> Thomas Schmidt</p><p><strong>Treasurer:</strong> Sandra Weber</p>",
      status: "published",
      parentId: aboutLeague.id,
      menuLocations: [],
      sortOrder: 1,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "League History",
      slug: "league-history",
      content:
        "<h2>League history</h2><p>Founded in 2015 with four teams, the league expanded to ten teams by 2024 and now runs full seasonal operations.</p>",
      status: "published",
      parentId: aboutLeague.id,
      menuLocations: [],
      sortOrder: 2,
    },
    {
      organizationId: DEMO_ORG_ID,
      title: "Penalty Guide",
      slug: "penalty-guide",
      content:
        "<h2>Penalty guide</h2><p>In addition to IIHF rules, recreational safety standards are strictly enforced.</p><ul><li>Minor penalties: 2 minutes</li><li>Major penalties: 5 minutes</li><li>Misconduct penalties as applicable</li></ul>",
      status: "published",
      parentId: rulesPage.id,
      menuLocations: [],
      sortOrder: 1,
    },
  ]

  await db.page.createMany({ data: subPages })

  // Page aliases
  const contactPage = insertedPages.find((p) => p.slug === "contact")!
  const privacyPage = insertedPages.find((p) => p.slug === "privacy-policy")!

  console.log("[demo-seed] Seeding page aliases...")
  const aliasValues: any[] = [
    { organizationId: DEMO_ORG_ID, slug: "kontakt", targetPageId: contactPage.id },
    {
      organizationId: DEMO_ORG_ID,
      slug: "impressum",
      targetPageId: insertedPages.find((p) => p.slug === "legal-notice")!.id,
    },
    { organizationId: DEMO_ORG_ID, slug: "privacy", targetPageId: privacyPage.id },
    { organizationId: DEMO_ORG_ID, slug: "datenschutz", targetPageId: privacyPage.id },
  ]
  await db.pageAlias.createMany({ data: aliasValues })

  // ── Done ─────────────────────────────────────────────────────────────
  console.log("\n[demo-seed] Demo seed complete!")
  console.log(
    `   • ${seedImages.teamLogoUrls.length + seedImages.playerPhotoUrls.length + seedImages.sponsorLogoUrls.length} generated images (${seedImages.teamLogoUrls.length} team logos, ${seedImages.playerPhotoUrls.length} player avatars, ${seedImages.sponsorLogoUrls.length} sponsor logos)`,
  )
  console.log(`   • 1 organization (${DEMO_ORG_ID})`)
  console.log(`   • ${demoUsers.length} demo users:`)
  for (const u of demoUsers) {
    console.log(`     - ${u.name} (${u.email} / demo1234)`)
  }
  console.log(`   • 1 system settings row (PuckHub Demo League)`)
  console.log(`   • ${insertedSeasons.length} seasons`)
  console.log(`   • ${insertedDivisions.length} divisions`)
  console.log(`   • ${roundValues.length} rounds`)
  console.log(`   • ${insertedTeams.length} teams`)
  console.log(`   • ${tdValues.length} team-division assignments`)
  console.log(`   • ${gamesValues.length} games`)
  console.log(`   • ${insertedPlayers.length} players`)
  console.log(`   • ${contractValues.length} contracts`)
  console.log(`   • ${insertedTrikots.length} trikots`)
  console.log(`   • ${teamTrikotValues.length} team-trikots`)
  console.log(`   • ${sponsorValues.length} sponsors`)
  console.log(
    `   • ${newsValues.length} news (${newsValues.filter((n: any) => n.status === "published").length} published, ${newsValues.filter((n: any) => n.status === "draft").length} draft)`,
  )
  console.log(
    `   • ${systemRoutePages.length + systemSubRoutePages.length + topLevelPages.length + subPages.length} pages (${systemRoutePages.length} system routes, ${systemSubRoutePages.length} system sub-routes, ${subPages.length} custom sub-pages, ${aliasValues.length} aliases)`,
  )
  console.log(
    `   • ${reportGames.length} game reports (${totalGoals} goals, ${totalPenalties} penalties, ${totalSuspensions} suspensions, ${lineupValues.length} lineup entries)`,
  )
  console.log(`   • ${gamesForRecap.length} AI recaps (current + last season)`)
}
