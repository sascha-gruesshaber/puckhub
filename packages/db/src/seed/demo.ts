import { dirname, resolve } from "node:path"
import * as readline from "node:readline"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const seedDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(seedDir, "../../../../.env") })

import { hashPassword } from "better-auth/crypto"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../schema"
import { recalculateStandings } from "../services/standingsService"
import { recalculateGoalieStats, recalculatePlayerStats } from "../services/statsService"
import { cleanUploads, generateSeedImages } from "./seedImages"

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

const VENUES = [
  { name: "Eisstadion am Fächerbad", city: "Karlsruhe", address: "Am Fächerbad 4, 76131 Karlsruhe" },
  { name: "Eishalle Waldau", city: "Stuttgart", address: "Stuttgarter Str. 106, 70469 Stuttgart" },
  { name: "Heidelberg Ice Arena", city: "Heidelberg", address: "Im Neuenheimer Feld 700, 69120 Heidelberg" },
  { name: "Eissporthalle Mannheim", city: "Mannheim", address: "Xaver-Fuhr-Str. 63, 68163 Mannheim" },
  { name: "Eishalle Freiburg", city: "Freiburg", address: "Ensisheimer Str. 9, 79110 Freiburg" },
  { name: "Ulmer Eishalle", city: "Ulm", address: "Friedrichsau 72, 89073 Ulm" },
  { name: "Eiszentrum Pforzheim", city: "Pforzheim", address: "Am Wartberg 1, 75175 Pforzheim" },
  { name: "Kolbenschmidt Arena", city: "Heilbronn", address: "Stuttgarter Str. 130, 74078 Heilbronn" },
  { name: "Eishalle Reutlingen", city: "Reutlingen", address: "Markwiesenstr. 40, 72770 Reutlingen" },
  { name: "Tübinger Eispalast", city: "Tübingen", address: "Europastr. 2, 72072 Tübingen" },
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
type DemoLang = "en" | "de"
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
        name: "Recreational League",
        rounds: [{ name: "Regular Season", roundType: "regular" }],
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
// Transfers: player index within a team, from team -> to team, after season year
// Retirements: player index within a team, after season year
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

function parseDemoLang(args: string[]): DemoLang {
  const inline = args.find((a) => a.startsWith("--lang=") || a.startsWith("--locale="))
  const pairIdx = args.findIndex((a) => a === "--lang" || a === "--locale")
  const pairValue = pairIdx >= 0 ? args[pairIdx + 1] : undefined
  const raw = (inline?.split("=")[1] ?? pairValue ?? "en").toLowerCase()
  return raw.startsWith("de") ? "de" : "en"
}

function getSeasonStructure(lang: DemoLang): SeasonDef[] {
  const firstSeasonYear = CURRENT_SEASON_START_YEAR - SEASONS_BACK
  const englishSeasons: SeasonDef[] = Array.from({ length: TOTAL_SEASONS }, (_, idx) => {
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

  if (lang === "en") return englishSeasons

  return englishSeasons.map((season) => ({
    ...season,
    divisions: season.divisions.map((division) => ({
      ...division,
      name:
        division.name === "Recreational League"
          ? "Hobbyliga"
          : division.name.startsWith("Group ")
            ? division.name.replace("Group", "Gruppe")
            : division.name,
      rounds: division.rounds.map((round) => ({
        ...round,
        name: round.name === "Regular Season" ? "Hauptrunde" : round.name,
      })),
    })),
  }))
}

function getPenaltyTypes(lang: DemoLang) {
  if (lang === "de") {
    return [
      { code: "MINOR", name: "Kleine Strafe", shortName: "2min", defaultMinutes: 2 },
      { code: "DOUBLE_MINOR", name: "Doppelte Kleine Strafe", shortName: "2+2min", defaultMinutes: 4 },
      { code: "MAJOR", name: "Große Strafe", shortName: "5min", defaultMinutes: 5 },
      { code: "MISCONDUCT", name: "Disziplinarstrafe", shortName: "10min", defaultMinutes: 10 },
      { code: "GAME_MISCONDUCT", name: "Spieldauer-Disziplinarstrafe", shortName: "SD", defaultMinutes: 20 },
      { code: "MATCH_PENALTY", name: "Matchstrafe", shortName: "MS", defaultMinutes: 25 },
    ]
  }
  return [
    { code: "MINOR", name: "Minor Penalty", shortName: "2min", defaultMinutes: 2 },
    { code: "DOUBLE_MINOR", name: "Double Minor", shortName: "2+2min", defaultMinutes: 4 },
    { code: "MAJOR", name: "Major Penalty", shortName: "5min", defaultMinutes: 5 },
    { code: "MISCONDUCT", name: "Misconduct", shortName: "10min", defaultMinutes: 10 },
    { code: "GAME_MISCONDUCT", name: "Game Misconduct", shortName: "GM", defaultMinutes: 20 },
    { code: "MATCH_PENALTY", name: "Match Penalty", shortName: "MP", defaultMinutes: 25 },
  ]
}

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
// Main seed function
// ---------------------------------------------------------------------------
async function seedDemo() {
  const force = process.argv.includes("--force")
  const demoLang = parseDemoLang(process.argv)
  const seasonStructure = getSeasonStructure(demoLang)
  console.log(`Seeding demo dataset language: ${demoLang}`)

  if (!force) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>((resolve) => {
      rl.question("⚠️  This will TRUNCATE ALL TABLES and re-seed with demo data.\n   Continue? (y/N) ", resolve)
    })
    rl.close()
    if (answer.toLowerCase() !== "y") {
      console.log("Aborted.")
      process.exit(0)
    }
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required")
  }

  const client = postgres(connectionString)
  const db = drizzle(client, { schema })

  // ── 1. Truncate all public tables ──────────────────────────────────────
  console.log("Truncating all tables...")
  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      SET client_min_messages TO WARNING;
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
      ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `)

  // ── 1b. Generate seed images ─────────────────────────────────────────
  console.log("Cleaning uploads directory...")
  await cleanUploads()

  const seedImages = await generateSeedImages({
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
    sponsors:
      demoLang === "de"
        ? [
            { name: "Stadtwerke Karlsruhe" },
            { name: "Autohaus Mueller" },
            { name: "Brauerei Schwaben" },
            { name: "SportShop24" },
            { name: "Alte Apotheke" },
          ]
        : [
            { name: "Karlsruhe Utilities" },
            { name: "Mueller Auto Group" },
            { name: "Swabian Brewery" },
            { name: "SportShop24" },
            { name: "Old Town Pharmacy" },
          ],
  })

  // ── 2. Reference data ─────────────────────────────────────────────────
  console.log("Seeding penalty types...")
  const insertedPenaltyTypes = await db.insert(schema.penaltyTypes).values(getPenaltyTypes(demoLang)).returning()

  console.log("Seeding trikot templates...")
  const insertedTemplates = await db
    .insert(schema.trikotTemplates)
    .values([
      { name: "One-color", templateType: "one_color", colorCount: 1, svg: TRIKOT_TEMPLATE_SVG_EINFARBIG },
      { name: "Two-color", templateType: "two_color", colorCount: 2, svg: TRIKOT_TEMPLATE_SVG_ZWEIFARBIG },
    ])
    .returning()

  const oneColorTemplate = insertedTemplates.find((t) => t.templateType === "one_color")!
  const twoColorTemplate = insertedTemplates.find((t) => t.templateType === "two_color")!

  // ── 2b. System settings ─────────────────────────────────────────────
  console.log("Seeding system settings...")
  await db.insert(schema.systemSettings).values({
    id: 1,
    leagueName: demoLang === "de" ? "PuckHub Demo Liga" : "PuckHub Demo League",
    leagueShortName: "PDL",
    locale: demoLang === "de" ? "de-DE" : "en-US",
    timezone: "Europe/Berlin",
    pointsWin: 2,
    pointsDraw: 1,
    pointsLoss: 0,
  })

  // ── 2c. Demo admin user ─────────────────────────────────────────────
  console.log("Seeding demo admin user...")
  const adminUserId = crypto.randomUUID()
  const adminEmail = "admin@demo.local"
  const adminPassword = "demo1234"
  const hashedPw = await hashPassword(adminPassword)

  await db.insert(schema.user).values({
    id: adminUserId,
    email: adminEmail,
    name: "Demo Admin",
    emailVerified: true,
  })

  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: adminUserId,
    providerId: "credential",
    password: hashedPw,
    userId: adminUserId,
  })

  await db.insert(schema.userRoles).values({
    userId: adminUserId,
    role: "super_admin",
  })

  // ── 3. Seasons ────────────────────────────────────────────────────────
  console.log(`Seeding ${seasonStructure.length} seasons...`)
  const insertedSeasons = await db
    .insert(schema.seasons)
    .values(
      seasonStructure.map((s) => ({
        name: s.name,
        seasonStart: new Date(Date.UTC(s.year, 8, 1, 0, 0, 0)),
        seasonEnd: new Date(Date.UTC(s.year + 1, 3, 30, 23, 59, 59)),
      })),
    )
    .returning()

  // Map by year for easy lookup
  const seasonByYear = new Map(seasonStructure.map((s, i) => [s.year, insertedSeasons[i]!]))

  // ── 4. Divisions ──────────────────────────────────────────────────────
  console.log("Seeding divisions...")
  type DivisionRow = typeof schema.divisions.$inferInsert & { id?: string }
  const divisionValues: DivisionRow[] = []
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (let i = 0; i < seasonDef.divisions.length; i++) {
      const div = seasonDef.divisions[i]!
      divisionValues.push({ seasonId: season.id, name: div.name, sortOrder: i, goalieMinGames: 3 })
    }
  }
  const insertedDivisions = await db.insert(schema.divisions).values(divisionValues).returning()

  // Build a lookup: "seasonId:divName" -> division row
  const divisionLookup = new Map(insertedDivisions.map((d) => [`${d.seasonId}:${d.name}`, d]))

  // ── 5. Rounds ─────────────────────────────────────────────────────────
  console.log("Seeding rounds...")
  const roundValues: (typeof schema.rounds.$inferInsert)[] = []
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (const divDef of seasonDef.divisions) {
      const division = divisionLookup.get(`${season.id}:${divDef.name}`)!
      for (let i = 0; i < divDef.rounds.length; i++) {
        const round = divDef.rounds[i]!
        roundValues.push({
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
  const insertedRounds = await db.insert(schema.rounds).values(roundValues).returning()

  // ── 6. Teams ──────────────────────────────────────────────────────────
  console.log("Seeding 10 teams...")
  const insertedTeams = await db
    .insert(schema.teams)
    .values(
      TEAMS.map((t, i) => ({
        name: t.name,
        shortName: t.shortName,
        city: t.city,
        logoUrl: seedImages.teamLogoUrls[i],
      })),
    )
    .returning()

  // ── 7. Venues ─────────────────────────────────────────────────────────
  console.log("Seeding 10 venues...")
  const insertedVenues = await db
    .insert(schema.venues)
    .values(VENUES.map((v) => ({ name: v.name, city: v.city, address: v.address })))
    .returning()

  // ── 8. Team-Division assignments ──────────────────────────────────────
  console.log("Seeding team-division assignments...")
  const tdValues: (typeof schema.teamDivisions.$inferInsert)[] = []
  for (const seasonDef of seasonStructure) {
    const season = seasonByYear.get(seasonDef.year)!
    for (const divDef of seasonDef.divisions) {
      const division = divisionLookup.get(`${season.id}:${divDef.name}`)!
      for (const teamIdx of divDef.teamIndices) {
        const team = insertedTeams[teamIdx]
        if (!team) continue
        tdValues.push({ teamId: team.id, divisionId: division.id })
      }
    }
  }
  await db.insert(schema.teamDivisions).values(tdValues)

  // ── 9. Games ──────────────────────────────────────────────────────────
  console.log(`Seeding ~${GAMES_PER_ROUND} games per round...`)
  const gamesValues: (typeof schema.games.$inferInsert)[] = []
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
        const seasonStart = new Date(Date.UTC(seasonYear, 8, 1, 18, 0, 0)) // Sep 1
        const seasonEnd = new Date(Date.UTC(seasonYear + 1, 3, 30, 22, 0, 0)) // Apr 30 next year
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

          const venue = insertedVenues[(seasonIdx + roundIdx * 3 + gameIdx) % insertedVenues.length]!
          const isCompleted = scheduledAt.getTime() < now.getTime()
          const scoreSeed = seasonIdx * 10000 + roundIdx * 1000 + gameIdx * 10

          gamesValues.push({
            roundId: round.id,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            venueId: venue.id,
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
  const insertedGames = await db.insert(schema.games).values(gamesValues).returning()

  // ── 10. Players ───────────────────────────────────────────────────────
  console.log("Seeding 100 players...")
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
  const insertedPlayers = await db
    .insert(schema.players)
    .values(
      allPlayerDefs.map((pd, i) => ({
        firstName: pd.def.firstName,
        lastName: pd.def.lastName,
        dateOfBirth: pd.def.dob,
        nationality: "DE",
        photoUrl: seedImages.playerPhotoUrls[i],
      })),
    )
    .returning()

  // Build a quick lookup: "teamIdx:playerIdx" -> player row
  const playerLookup = new Map(allPlayerDefs.map((pd, i) => [`${pd.teamIdx}:${pd.playerIdx}`, insertedPlayers[i]!]))

  // ── 11. Contracts ─────────────────────────────────────────────────────
  console.log("Seeding contracts...")
  const firstSeasonYear = Math.min(...seasonStructure.map((s) => s.year))
  const firstSeason = seasonByYear.get(firstSeasonYear)!
  const contractValues: (typeof schema.contracts.$inferInsert)[] = []

  for (const pd of allPlayerDefs) {
    const player = playerLookup.get(`${pd.teamIdx}:${pd.playerIdx}`)!
    const team = insertedTeams[pd.teamIdx]!

    // Check if this player transfers or retires
    const transfer = TRANSFERS.find((tr) => tr.teamIdx === pd.teamIdx && tr.playerIdx === pd.playerIdx)
    const retirement = RETIREMENTS.find((rt) => rt.teamIdx === pd.teamIdx && rt.playerIdx === pd.playerIdx)

    if (transfer) {
      // Original contract: first season -> season of transfer (inclusive)
      const endSeasonYear = firstSeasonYear + transfer.afterSeasonOffset
      const endSeason = seasonByYear.get(endSeasonYear)!
      contractValues.push({
        playerId: player.id,
        teamId: team.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: firstSeason.id,
        endSeasonId: endSeason.id,
      })
      // New contract: season after transfer -> open-ended (null endSeasonId)
      const newTeam = insertedTeams[transfer.toTeamIdx]!
      const nextYear = endSeasonYear + 1
      const startSeason = seasonByYear.get(nextYear)!
      contractValues.push({
        playerId: player.id,
        teamId: newTeam.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: startSeason.id,
        endSeasonId: undefined,
      })
    } else if (retirement) {
      // Contract with end date
      const endSeasonYear = firstSeasonYear + retirement.afterSeasonOffset
      const endSeason = seasonByYear.get(endSeasonYear)!
      contractValues.push({
        playerId: player.id,
        teamId: team.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: firstSeason.id,
        endSeasonId: endSeason.id,
      })
    } else {
      // Regular active contract: first season -> open-ended
      contractValues.push({
        playerId: player.id,
        teamId: team.id,
        position: pd.def.position,
        jerseyNumber: pd.def.jerseyNumber,
        startSeasonId: firstSeason.id,
        endSeasonId: undefined,
      })
    }
  }
  await db.insert(schema.contracts).values(contractValues)

  // ── 11b. Game Reports (lineups, events, suspensions) ───────────────────
  console.log("Seeding game reports for completed games...")

  // Build player roster per team: teamId -> array of { playerId, position, jerseyNumber }
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
  const _penaltyTypeGameMisconduct = insertedPenaltyTypes.find((pt) => pt.code === "GAME_MISCONDUCT")!
  const _penaltyTypeMatchPenalty = insertedPenaltyTypes.find((pt) => pt.code === "MATCH_PENALTY")!
  const penaltyPool = [
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeMinor, // weighted toward minors
    penaltyTypeMinor,
    penaltyTypeMinor,
    penaltyTypeDoubleMinor,
    penaltyTypeMajor,
    penaltyTypeMisconduct,
  ]
  const penaltyReasons = [
    "Beinstellen",
    "Haken",
    "Halten",
    "Hoher Stock",
    "Behinderung",
    "Bandencheck",
    "Ellbogencheck",
    "Stockschlag",
    "Spielverzögerung",
    "Zu viele Spieler",
  ]

  // Seed reports for ALL completed games
  const reportGames = insertedGames.filter(
    (g) => g.status === "completed" && g.homeScore != null && g.awayScore != null,
  )

  const lineupValues: (typeof schema.gameLineups.$inferInsert)[] = []
  const eventValues: (typeof schema.gameEvents.$inferInsert & { _tempId?: string })[] = []
  const suspensionValues: (typeof schema.gameSuspensions.$inferInsert)[] = []
  const goalieGameStatsValues: (typeof schema.goalieGameStats.$inferInsert)[] = []

  let totalGoals = 0
  let totalPenalties = 0
  let totalSuspensions = 0

  for (let gi = 0; gi < reportGames.length; gi++) {
    const game = reportGames[gi]!
    const homeRoster = rosterByTeamId.get(game.homeTeamId) ?? []
    const awayRoster = rosterByTeamId.get(game.awayTeamId) ?? []

    if (homeRoster.length === 0 || awayRoster.length === 0) continue

    const gameSeed = gi * 137 + 42

    // ── Lineups: add all roster players
    for (const rp of homeRoster) {
      lineupValues.push({
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
        gameId: game.id,
        playerId: rp.playerId,
        teamId: game.awayTeamId,
        position: rp.position,
        jerseyNumber: rp.jerseyNumber,
        isStartingGoalie:
          rp.position === "goalie" && awayRoster.filter((r) => r.position === "goalie").indexOf(rp) === 0,
      })
    }

    // ── Goal events: generate goals to match the score
    const homeGoals = game.homeScore!
    const awayGoals = game.awayScore!
    const homeSkaters = homeRoster.filter((r) => r.position !== "goalie")
    const awaySkaters = awayRoster.filter((r) => r.position !== "goalie")
    const homeGoalies = homeRoster.filter((r) => r.position === "goalie")
    const awayGoalies = awayRoster.filter((r) => r.position === "goalie")

    // Generate goals chronologically across 3 periods
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

      // Assist 1 (70% chance)
      let assist1Id: string | null = null
      if (seededFraction(gameSeed + g * 13) < 0.7 && skaters.length > 1) {
        let a1Idx = seededInt(gameSeed + g * 17, 0, skaters.length - 1)
        if (a1Idx === scorerIdx) a1Idx = (a1Idx + 1) % skaters.length
        assist1Id = skaters[a1Idx]?.playerId ?? null
      }

      // Assist 2 (40% chance, only if assist 1 exists)
      let assist2Id: string | null = null
      if (assist1Id && seededFraction(gameSeed + g * 19) < 0.4 && skaters.length > 2) {
        let a2Idx = seededInt(gameSeed + g * 23, 0, skaters.length - 1)
        while (skaters[a2Idx]?.playerId === scorer.playerId || skaters[a2Idx]?.playerId === assist1Id) {
          a2Idx = (a2Idx + 1) % skaters.length
        }
        assist2Id = skaters[a2Idx]?.playerId ?? null
      }

      // Goalie scored on
      const goalieId = opposingGoalies.length > 0 ? opposingGoalies[0]?.playerId : null

      eventValues.push({
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

    // ── Penalty events: 2-5 per game
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

    // ── Suspension: ~10% chance per game (for the last penalty if it's a major+)
    if (seededFraction(gameSeed + 2000) < 0.1 && numPenalties > 0) {
      const isHome = seededFraction(gameSeed + 2001) < 0.5
      const teamId = isHome ? game.homeTeamId : game.awayTeamId
      const roster = isHome ? homeRoster : awayRoster
      if (roster.length > 0) {
        const playerIdx = seededInt(gameSeed + 2002, 0, roster.length - 1)
        const suspendedPlayer = roster[playerIdx]
        if (!suspendedPlayer) continue
        suspensionValues.push({
          gameId: game.id,
          playerId: suspendedPlayer.playerId,
          teamId,
          suspensionType: seededFraction(gameSeed + 2003) < 0.6 ? "match_penalty" : "game_misconduct",
          suspendedGames: seededInt(gameSeed + 2004, 1, 3),
          servedGames: seededInt(gameSeed + 2005, 0, 1), // may have served some already
          reason: penaltyReasons[seededInt(gameSeed + 2006, 0, penaltyReasons.length - 1)],
        })
        totalSuspensions++
      }
    }

    // ── Goalie game stats: starting goalie of each team gets goals-against = opponent score
    const homeStartingGoalie = homeGoalies[0]
    const awayStartingGoalie = awayGoalies[0]
    if (homeStartingGoalie) {
      goalieGameStatsValues.push({
        gameId: game.id,
        playerId: homeStartingGoalie.playerId,
        teamId: game.homeTeamId,
        goalsAgainst: awayGoals,
      })
    }
    if (awayStartingGoalie) {
      goalieGameStatsValues.push({
        gameId: game.id,
        playerId: awayStartingGoalie.playerId,
        teamId: game.awayTeamId,
        goalsAgainst: homeGoals,
      })
    }
  }

  // Insert in batches to avoid parameter limits
  if (lineupValues.length > 0) {
    const BATCH = 500
    for (let i = 0; i < lineupValues.length; i += BATCH) {
      await db.insert(schema.gameLineups).values(lineupValues.slice(i, i + BATCH))
    }
  }
  if (eventValues.length > 0) {
    const BATCH = 500
    for (let i = 0; i < eventValues.length; i += BATCH) {
      await db.insert(schema.gameEvents).values(eventValues.slice(i, i + BATCH))
    }
  }
  if (suspensionValues.length > 0) {
    await db.insert(schema.gameSuspensions).values(suspensionValues)
  }
  if (goalieGameStatsValues.length > 0) {
    const BATCH = 500
    for (let i = 0; i < goalieGameStatsValues.length; i += BATCH) {
      await db.insert(schema.goalieGameStats).values(goalieGameStatsValues.slice(i, i + BATCH))
    }
  }

  console.log(
    `   → ${reportGames.length} games with reports (${totalGoals} goals, ${totalPenalties} penalties, ${totalSuspensions} suspensions)`,
  )
  console.log(`   → ${lineupValues.length} lineup entries, ${goalieGameStatsValues.length} goalie game stats`)

  // ── 11c. Recalculate player + goalie season stats ──────────────────────
  console.log("Recalculating player and goalie season stats...")
  for (const season of insertedSeasons) {
    await recalculatePlayerStats(db, season.id)
    await recalculateGoalieStats(db, season.id)
  }
  console.log("   → Player and goalie season stats recalculated")

  // ── 11d. Seed bonus points for some rounds ───────────────────────────
  console.log("Seeding bonus points...")
  const bonusReasons =
    demoLang === "de"
      ? [
          "Fairplay-Auszeichnung",
          "Verspäteter Spielbeginn",
          "Regelverstoß Aufstellung",
          "Sonderpunkte Jugendförderung",
          "Strafpunkte unsportliches Verhalten",
          "Nichtantritt Pflichtspiel",
        ]
      : [
          "Fair play award",
          "Delayed game start",
          "Lineup rule violation",
          "Youth development bonus",
          "Unsportsmanlike conduct penalty",
          "Forfeit of mandatory game",
        ]

  const bonusValues: (typeof schema.bonusPoints.$inferInsert)[] = []
  // Build a lookup: roundId -> teamIds that play in that round's division
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
    // Add bonus points to roughly every 3rd round
    if (i % 3 !== 0) continue
    const round = insertedRounds[i]!
    const teamIds = roundTeamsMap.get(round.id)
    if (!teamIds || teamIds.length < 2) continue

    // Pick 1-2 bonus point entries per qualifying round
    const count = (bonusSeed % 2) + 1
    for (let j = 0; j < count; j++) {
      const teamIdx = (bonusSeed + j * 3) % teamIds.length
      const reasonIdx = (bonusSeed + j) % bonusReasons.length
      // Positive bonus (1-3) for awards, negative (-1 to -2) for penalties
      const isPositive = reasonIdx < 4
      const pts = isPositive ? (bonusSeed % 3) + 1 : -(bonusSeed % 2) - 1
      bonusValues.push({
        teamId: teamIds[teamIdx]!,
        roundId: round.id,
        points: pts,
        reason: bonusReasons[reasonIdx],
      })
      bonusSeed += 7
    }
  }
  if (bonusValues.length > 0) {
    await db.insert(schema.bonusPoints).values(bonusValues)
  }
  console.log(`   → ${bonusValues.length} bonus point entries`)

  // ── 11e. Recalculate standings per round ──────────────────────────────
  console.log("Recalculating standings...")
  for (const round of insertedRounds) {
    await recalculateStandings(db, round.id)
  }
  console.log(`   → Standings recalculated for ${insertedRounds.length} rounds`)

  // ── 12. Trikots + Team-Trikots ────────────────────────────────────────
  console.log("Seeding trikots...")
  const trikotValues: (typeof schema.trikots.$inferInsert)[] = []
  for (let t = 0; t < insertedTeams.length; t++) {
    const team = insertedTeams[t]!
    const colors = TEAM_COLORS[t]!
    // Home trikot (two-color)
    trikotValues.push({
      name: `${team.name} Heim`,
      templateId: twoColorTemplate.id,
      primaryColor: colors[0],
      secondaryColor: colors[1],
    })
    // Away trikot (one-color)
    trikotValues.push({
      name: `${team.name} Auswärts`,
      templateId: oneColorTemplate.id,
      primaryColor: colors[2],
      secondaryColor: colors[3],
    })
  }
  const insertedTrikots = await db.insert(schema.trikots).values(trikotValues).returning()

  console.log("Seeding team-trikots...")
  const teamTrikotValues: (typeof schema.teamTrikots.$inferInsert)[] = []
  for (let t = 0; t < insertedTeams.length; t++) {
    const team = insertedTeams[t]!
    const homeTrikot = insertedTrikots[t * 2]!
    const awayTrikot = insertedTrikots[t * 2 + 1]!
    teamTrikotValues.push({ teamId: team.id, trikotId: homeTrikot.id, name: demoLang === "de" ? "Heim" : "Home" })
    teamTrikotValues.push({ teamId: team.id, trikotId: awayTrikot.id, name: demoLang === "de" ? "Auswaerts" : "Away" })
  }
  await db.insert(schema.teamTrikots).values(teamTrikotValues)

  // ── 13. Sponsors ──────────────────────────────────────────────────────
  console.log("Seeding sponsors...")
  const sponsorValues: (typeof schema.sponsors.$inferInsert)[] =
    demoLang === "de"
      ? [
          {
            name: "Stadtwerke Karlsruhe",
            websiteUrl: "https://www.stadtwerke-karlsruhe.de",
            hoverText: "Offizieller Energiepartner",
            sortOrder: 1,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[0],
          },
          {
            name: "Autohaus Mueller",
            websiteUrl: "https://www.autohaus-mueller.de",
            hoverText: "Ihr Autohaus in der Region",
            teamId: insertedTeams[0]?.id,
            sortOrder: 2,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[1],
          },
          {
            name: "Brauerei Schwaben",
            websiteUrl: "https://www.brauerei-schwaben.de",
            hoverText: "Erfrischung fuer Champions",
            teamId: insertedTeams[1]?.id,
            sortOrder: 3,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[2],
          },
          {
            name: "SportShop24",
            websiteUrl: "https://www.sportshop24.de",
            hoverText: "Ausruestungspartner",
            sortOrder: 4,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[3],
          },
          {
            name: "Alte Apotheke",
            hoverText: "Ehemaliger Sponsor",
            sortOrder: 5,
            isActive: false,
            logoUrl: seedImages.sponsorLogoUrls[4],
          },
        ]
      : [
          {
            name: "Karlsruhe Utilities",
            websiteUrl: "https://www.stadtwerke-karlsruhe.de",
            hoverText: "Official energy partner",
            sortOrder: 1,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[0],
          },
          {
            name: "Mueller Auto Group",
            websiteUrl: "https://www.autohaus-mueller.de",
            hoverText: "Local mobility partner",
            teamId: insertedTeams[0]?.id,
            sortOrder: 2,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[1],
          },
          {
            name: "Swabian Brewery",
            websiteUrl: "https://www.brauerei-schwaben.de",
            hoverText: "Refreshment partner",
            teamId: insertedTeams[1]?.id,
            sortOrder: 3,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[2],
          },
          {
            name: "SportShop24",
            websiteUrl: "https://www.sportshop24.de",
            hoverText: "Equipment partner",
            sortOrder: 4,
            isActive: true,
            logoUrl: seedImages.sponsorLogoUrls[3],
          },
          {
            name: "Old Town Pharmacy",
            hoverText: "Former sponsor",
            sortOrder: 5,
            isActive: false,
            logoUrl: seedImages.sponsorLogoUrls[4],
          },
        ]
  await db.insert(schema.sponsors).values(sponsorValues)

  // ── 14. News ──────────────────────────────────────────────────────────
  console.log("Seeding news...")
  const newsValues: (typeof schema.news.$inferInsert)[] =
    demoLang === "de"
      ? [
          {
            title: "Saisonstart 2024/25: Spielplan ist online",
            shortText: "Alle Termine fuer die 10 Teams sind jetzt verfuegbar.",
            content:
              "<h2>Die neue Saison startet</h2><p>Nach der Sommerpause geht es wieder aufs Eis. Der komplette Spielplan ist jetzt verfuegbar.</p>",
            status: "published",
            authorId: adminUserId,
            publishedAt: new Date("2024-09-15T10:00:00Z"),
            createdAt: new Date("2024-09-15T10:00:00Z"),
          },
          {
            title: "Karlsruhe verstaerkt den Sturm",
            shortText: "Zwei neue Angreifer stoessen zum Kader.",
            content:
              "<h2>Kaderupdate</h2><p>Das Team verstaerkt die Offensive mit zwei erfahrenen Spielern aus der Region.</p>",
            status: "published",
            authorId: adminUserId,
            publishedAt: new Date("2024-10-01T14:30:00Z"),
            createdAt: new Date("2024-10-01T14:30:00Z"),
          },
          {
            title: "Liga beschliesst neues Playoff-Format",
            shortText: "Best-of-Three und neue Overtime-Regel kommen.",
            content: "<h2>Playoff-Update</h2><p>Die Liga fuehrt ein angepasstes Playoff-Format ein.</p>",
            status: "published",
            authorId: adminUserId,
            publishedAt: new Date("2024-11-20T09:00:00Z"),
            createdAt: new Date("2024-11-20T09:00:00Z"),
          },
          {
            title: "Winterpause: Anpassung der Eiszeiten",
            shortText: "Zwischen Feiertagen gelten geaenderte Hallenzeiten.",
            content:
              "<h2>Hinweis zum Spielbetrieb</h2><p>Der Ligabetrieb setzt vom 23. Dezember bis 6. Januar aus.</p>",
            status: "published",
            authorId: adminUserId,
            publishedAt: new Date("2024-12-18T16:00:00Z"),
            createdAt: new Date("2024-12-18T16:00:00Z"),
          },
          {
            title: "Ausblick auf die Rueckrunde",
            shortText: "Der Kampf um die Playoff-Plaetze ist offen.",
            content:
              "<h2>Spannende zweite Saisonhaelfte</h2><p>Mehrere Teams liegen eng zusammen. Jeder Punkt zaehlt.</p>",
            status: "draft",
            authorId: adminUserId,
            createdAt: new Date("2025-01-05T11:00:00Z"),
          },
        ]
      : [
          {
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
            title: "Second half preview: race to playoffs",
            shortText: "The table is tight and every point matters.",
            content:
              "<h2>Mid-season outlook</h2><p>Five teams are within striking distance at the top, setting up a competitive run-in.</p><p>Expect decisive games through January and February as playoff positions are finalized.</p>",
            status: "draft",
            authorId: adminUserId,
            createdAt: new Date("2025-01-05T11:00:00Z"),
          },
        ]
  await db.insert(schema.news).values(newsValues)

  // ── 14. Pages ──────────────────────────────────────────────────────────
  console.log("Seeding pages...")

  const topLevelPages: (typeof schema.pages.$inferInsert)[] =
    demoLang === "de"
      ? [
          {
            title: "Impressum",
            slug: "legal-notice",
            content:
              "<h2>Impressum</h2><p>PuckHub Demo Liga e.V.<br/>Musterstrasse 1<br/>76131 Karlsruhe</p><p>E-Mail: info@puckhub-demo.de</p>",
            status: "published",
            isStatic: true,
            menuLocations: ["footer"],
            sortOrder: 100,
          },
          {
            title: "Datenschutz",
            slug: "privacy-policy",
            content:
              "<h2>Datenschutz</h2><p>Hier finden Sie Informationen zur Verarbeitung personenbezogener Daten.</p>",
            status: "published",
            isStatic: true,
            menuLocations: ["footer"],
            sortOrder: 101,
          },
          {
            title: "Kontakt",
            slug: "contact",
            content:
              '<h2>Kontakt</h2><p>PuckHub Demo Liga e.V.<br/>Musterstrasse 1<br/>76131 Karlsruhe</p><p>E-Mail: <a href="mailto:info@puckhub-demo.de">info@puckhub-demo.de</a></p>',
            status: "published",
            isStatic: true,
            menuLocations: ["footer", "main_nav"],
            sortOrder: 102,
          },
          {
            title: "Ueber die Liga",
            slug: "about-the-league",
            content:
              "<h2>Ueber die Liga</h2><p>Die PuckHub Demo Liga wurde 2015 gegruendet und umfasst heute 10 Teams.</p>",
            status: "published",
            isStatic: false,
            menuLocations: ["main_nav"],
            sortOrder: 1,
          },
          {
            title: "Regeln und Hinweise",
            slug: "rules-and-guidance",
            content:
              "<h2>Regeln und Hinweise</h2><p>Es gelten IIHF-Regeln mit ligaweiten Anpassungen fuer den Freizeitbetrieb.</p>",
            status: "published",
            isStatic: false,
            menuLocations: ["main_nav", "footer"],
            sortOrder: 2,
          },
          {
            title: "Schnuppertraining",
            slug: "tryout-registration",
            content: "<h2>Schnuppertraining</h2><p>Teams bieten regelmaessig offene Einheiten fuer Einsteiger an.</p>",
            status: "draft",
            isStatic: false,
            menuLocations: [],
            sortOrder: 3,
          },
        ]
      : [
          {
            title: "Legal Notice",
            slug: "legal-notice",
            content:
              "<h2>Legal Notice</h2><p>PuckHub Demo League e.V.<br/>Sample Street 1<br/>76131 Karlsruhe</p><p>Represented by: Max Mustermann (President)</p><h3>Contact</h3><p>Email: info@puckhub-demo.de<br/>Phone: +49 721 12345678</p>",
            status: "published",
            isStatic: true,
            menuLocations: ["footer"],
            sortOrder: 100,
          },
          {
            title: "Privacy Policy",
            slug: "privacy-policy",
            content:
              "<h2>Privacy Policy</h2><p>This page explains what personal data is collected when using this website and how it is processed.</p><p>We handle personal data confidentially and in accordance with applicable regulations.</p>",
            status: "published",
            isStatic: true,
            menuLocations: ["footer"],
            sortOrder: 101,
          },
          {
            title: "Contact",
            slug: "contact",
            content:
              '<h2>Contact</h2><p>PuckHub Demo League e.V.<br/>Sample Street 1<br/>76131 Karlsruhe</p><p>Email: <a href="mailto:info@puckhub-demo.de">info@puckhub-demo.de</a><br/>Phone: +49 721 12345678</p><h3>Office hours</h3><p>Mon-Fri: 9:00 AM - 5:00 PM</p>',
            status: "published",
            isStatic: true,
            menuLocations: ["footer", "main_nav"],
            sortOrder: 102,
          },
          {
            title: "About The League",
            slug: "about-the-league",
            content:
              "<h2>About PuckHub Demo League</h2><p>The demo league was founded in 2015 and has grown into a stable regional competition.</p><p>Today, <strong>10 teams</strong> compete across regular season and postseason rounds.</p><h3>Core values</h3><ul><li>Fair play on and off the ice</li><li>Community and team spirit</li><li>Accessible hockey for everyone</li></ul>",
            status: "published",
            isStatic: false,
            menuLocations: ["main_nav"],
            sortOrder: 1,
          },
          {
            title: "Rules And Guidance",
            slug: "rules-and-guidance",
            content:
              "<h2>Rules and guidance</h2><p>IIHF rules apply with local recreational adjustments.</p><h3>Game format</h3><ul><li>3 x 15-minute periods</li><li>5-minute intermissions</li></ul><h3>Safety rules</h3><ul><li>No full body checking</li><li>Protective equipment is mandatory</li></ul>",
            status: "published",
            isStatic: false,
            menuLocations: ["main_nav", "footer"],
            sortOrder: 2,
          },
          {
            title: "Tryout Registration",
            slug: "tryout-registration",
            content:
              "<h2>Tryout sessions</h2><p>Interested in playing? Teams regularly host beginner-friendly tryout sessions.</p><p>Basic gear can be rented at most arenas. Contact your preferred team by email to register.</p>",
            status: "draft",
            isStatic: false,
            menuLocations: [],
            sortOrder: 3,
          },
        ]

  const insertedPages = await db.insert(schema.pages).values(topLevelPages).returning()

  const aboutLeague = insertedPages.find((p) => p.slug === "about-the-league")!
  const rulesPage = insertedPages.find((p) => p.slug === "rules-and-guidance")!

  const subPages: (typeof schema.pages.$inferInsert)[] =
    demoLang === "de"
      ? [
          {
            title: "Vorstand und Organisation",
            slug: "board-and-operations",
            content:
              "<h2>Vorstand und Organisation</h2><p>Praesident: Max Mustermann</p><p>Vizepraesident: Thomas Schmidt</p>",
            status: "published",
            isStatic: false,
            parentId: aboutLeague.id,
            menuLocations: [],
            sortOrder: 1,
          },
          {
            title: "Ligageschichte",
            slug: "league-history",
            content: "<h2>Ligageschichte</h2><p>Von 4 auf 10 Teams in weniger als 10 Jahren.</p>",
            status: "published",
            isStatic: false,
            parentId: aboutLeague.id,
            menuLocations: [],
            sortOrder: 2,
          },
          {
            title: "Strafenkatalog",
            slug: "penalty-guide",
            content: "<h2>Strafenkatalog</h2><p>Uebersicht ueber kleine, grosse und Disziplinarstrafen.</p>",
            status: "published",
            isStatic: false,
            parentId: rulesPage.id,
            menuLocations: [],
            sortOrder: 1,
          },
        ]
      : [
          {
            title: "Board And Operations",
            slug: "board-and-operations",
            content:
              "<h2>Board and operations</h2><p><strong>President:</strong> Max Mustermann</p><p><strong>Vice President:</strong> Thomas Schmidt</p><p><strong>Treasurer:</strong> Sandra Weber</p>",
            status: "published",
            isStatic: false,
            parentId: aboutLeague.id,
            menuLocations: [],
            sortOrder: 1,
          },
          {
            title: "League History",
            slug: "league-history",
            content:
              "<h2>League history</h2><p>Founded in 2015 with four teams, the league expanded to ten teams by 2024 and now runs full seasonal operations.</p>",
            status: "published",
            isStatic: false,
            parentId: aboutLeague.id,
            menuLocations: [],
            sortOrder: 2,
          },
          {
            title: "Penalty Guide",
            slug: "penalty-guide",
            content:
              "<h2>Penalty guide</h2><p>In addition to IIHF rules, recreational safety standards are strictly enforced.</p><ul><li>Minor penalties: 2 minutes</li><li>Major penalties: 5 minutes</li><li>Misconduct penalties as applicable</li></ul>",
            status: "published",
            isStatic: false,
            parentId: rulesPage.id,
            menuLocations: [],
            sortOrder: 1,
          },
        ]

  await db.insert(schema.pages).values(subPages)

  // Page aliases
  const contactPage = insertedPages.find((p) => p.slug === "contact")!
  const privacyPage = insertedPages.find((p) => p.slug === "privacy-policy")!

  console.log("Seeding page aliases...")
  const aliasValues: (typeof schema.pageAliases.$inferInsert)[] = [
    { slug: "kontakt", targetPageId: contactPage.id },
    { slug: "impressum", targetPageId: insertedPages.find((p) => p.slug === "legal-notice")!.id },
    { slug: "privacy", targetPageId: privacyPage.id },
    { slug: "datenschutz", targetPageId: privacyPage.id },
  ]
  await db.insert(schema.pageAliases).values(aliasValues)

  // ── Done ──────────────────────────────────────────────────────────────
  await client.end()

  console.log("\n✅ Demo seed complete!")
  console.log(
    `   • ${seedImages.teamLogoUrls.length + seedImages.playerPhotoUrls.length + seedImages.sponsorLogoUrls.length} generated images (${seedImages.teamLogoUrls.length} team logos, ${seedImages.playerPhotoUrls.length} player avatars, ${seedImages.sponsorLogoUrls.length} sponsor logos)`,
  )
  console.log(`   • 1 admin user (${adminEmail} / ${adminPassword})`)
  console.log(`   • 1 system settings row (${demoLang === "de" ? "PuckHub Demo Liga" : "PuckHub Demo League"})`)
  console.log(`   • ${insertedSeasons.length} seasons`)
  console.log(`   • ${insertedDivisions.length} divisions`)
  console.log(`   • ${roundValues.length} rounds`)
  console.log(`   • ${insertedTeams.length} teams`)
  console.log(`   • ${VENUES.length} venues`)
  console.log(`   • ${tdValues.length} team-division assignments`)
  console.log(`   • ${gamesValues.length} games`)
  console.log(`   • ${insertedPlayers.length} players`)
  console.log(`   • ${contractValues.length} contracts`)
  console.log(`   • ${insertedTrikots.length} trikots`)
  console.log(`   • ${teamTrikotValues.length} team-trikots`)
  console.log(`   • ${sponsorValues.length} sponsors`)
  console.log(
    `   • ${newsValues.length} news (${newsValues.filter((n) => n.status === "published").length} published, ${newsValues.filter((n) => n.status === "draft").length} draft)`,
  )
  console.log(
    `   • ${topLevelPages.length + subPages.length} pages (${topLevelPages.filter((p) => p.isStatic).length} static, ${subPages.length} sub-pages, ${aliasValues.length} aliases)`,
  )
  console.log(
    `   • ${reportGames.length} game reports (${totalGoals} goals, ${totalPenalties} penalties, ${totalSuspensions} suspensions, ${lineupValues.length} lineup entries)`,
  )
}

seedDemo().catch((err) => {
  console.error("Demo seed failed:", err)
  process.exit(1)
})
