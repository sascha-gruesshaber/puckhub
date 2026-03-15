import { useSettings } from "./context"

// ---------------------------------------------------------------------------
// English translations (source of truth for types)
// ---------------------------------------------------------------------------
const en = {
  common: {
    back: "Back",
    loading: "Loading...",
    loadMore: "Load more",
    all: "All",
    readMore: "Read more",
    current: "Current",
    noDate: "No date",
    less: "Less",
    details: "Details",
    website: "Website",
    contact: "Contact",
  },

  status: {
    scheduled: "Scheduled",
    live: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
    postponed: "Postponed",
  },

  positions: {
    goalie: "Goalie",
    defense: "Defense",
    forward: "Forward",
  },

  months: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ] as readonly string[],

  // Short column-header abbreviations
  abbr: {
    gp: "GP",
    g: "G",
    a: "A",
    pts: "Pts",
    ga: "GA",
    gaa: "GAA",
    pim: "PIM",
    w: "W",
    d: "D",
    l: "L",
    period: "P",
    min: "Min",
    diff: "Diff",
  },

  // Full-text tooltips for abbreviated column headers
  tooltip: {
    gamesPlayed: "Games Played",
    goals: "Goals",
    assists: "Assists",
    points: "Points",
    pointsTotal: "Points (Goals + Assists)",
    goalsAgainst: "Goals Against",
    goalsAgainstAvg: "Goals Against Average",
    penaltyMinutes: "Penalty Minutes",
    penaltyMinutesTotal: "Total penalty minutes",
    penalties: "Penalties",
    win: "Win",
    draw: "Draw",
    loss: "Loss",
    wins: "Wins",
    draws: "Draws",
    losses: "Losses",
    goalsForAgainst: "Goals (for:against)",
    goalDifference: "Goal Difference",
    last5Games: "Last 5 Games",
  },

  home: {
    title: "Home",
    subtitle: "Latest results, standings, schedules and news",
    standings: "Standings",
    schedule: "Schedule",
    latestResult: "Latest Result",
    nextGame: "Next Game",
    full: "Full",
    upcomingGames: "Upcoming Games",
    results: "Results",
    allNews: "All News",
    noNews: "No news available",
    noNewsDesc: "The latest news will appear here soon.",
    sponsors: "Sponsors",
  },

  standings: {
    title: "Standings",
    noData: "No standings data available yet",
    noDataDesc: "Standings will appear after the first games.",
  },

  schedule: {
    title: "Schedule",
    titleFull: "Schedule & Results",
    allTeams: "All Teams",
    scheduled: "Scheduled",
    completed: "Completed",
    live: "Live",
    cancelled: "Cancelled",
    noGames: "No games found",
    noGamesDesc: "Try adjusting the filters.",
  },

  gameDetail: {
    title: "Game Details",
    notFound: "Game not found",
    backToSchedule: "Back to Schedule",
    home: "Home",
    away: "Away",
    gameReport: "Game Report",
    reportGenerating: "Game report is being generated...",
    goals: "Goals",
    penalties: "Penalties",
    noDetailedReports: "No detailed game reports available for this game.",
    lineups: "Lineups",
    noLineup: "No lineup available",
  },

  news: {
    title: "News",
    articleNotFound: "Article not found",
    backToNews: "Back to News",
    noNews: "No news available",
    noNewsDesc: "The latest news will appear here soon.",
    loadMore: "Load more articles",
  },

  teams: {
    title: "Teams",
    noTeams: "No teams available",
    notFound: "Team not found",
    backToTeams: "Back to Teams",
    roster: "Roster",
    seasonHistory: "Season History",
    teamPhoto: "Team photo",
    noRoster: "No roster available",
    noSeasons: "No seasons available",
    noSeasonsDesc: "No season data available for this team yet.",
  },

  statsOverview: {
    title: "Statistics Overview",
    top10Scorers: "Top 10 Scorers",
    goaliesQualified: "Goalies (qualified)",
  },

  statsScorers: {
    title: "Scorer Statistics",
    topScorers: "Top Scorers",
    allPositions: "All Positions",
  },

  statsGoals: {
    title: "Goal Statistics",
    topScorers: "Top Goal Scorers",
  },

  statsAssists: {
    title: "Assist Statistics",
    topAssists: "Top Assist Leaders",
  },

  statsGoalies: {
    title: "Goalie Statistics",
    comparison: "Goalie Comparison (GAA)",
  },

  statsPenalties: {
    title: "Penalty Statistics",
    byTeam: "Penalty Minutes by Team",
    types: "Penalty Types",
  },

  statsTables: {
    player: "Player",
    goalies: "Goalies",
    noStats: "No statistics available",
    noStatsDesc: "No player statistics for this season yet.",
    noGoalieStats: "No goalie statistics available",
    noGoalieStatsDesc: "No goalie statistics for this season yet.",
    belowMinGames: "Below minimum games",
    noPenaltyStats: "No penalty statistics available",
    noPenaltyStatsDesc: "No penalty statistics for this season yet.",
  },

  compareTeams: {
    title: "Team Comparison",
    selectTeams: "Select teams to compare",
    radarTitle: "Radar Comparison",
    barTitle: "Bar Comparison",
    hintOneMore: "Select at least one more team to compare wins, losses, goals, goals against and penalty minutes in radar and bar charts.",
    hintSelectTwo: "Select at least two teams to compare them directly. Data is based on the current season standings.",
    notEnoughTeams: "Not enough teams",
    notEnoughTeamsDesc: "At least two teams are required for a comparison.",
  },

  playerDetail: {
    title: "Player",
    backToStats: "Back to Statistics",
    notAvailable: "Not available",
    notAvailableDesc: "Player history is part of advanced statistics.",
    notFound: "Player not found",
    notFoundDesc: "The requested player could not be found.",
    noStats: "No statistics available",
    noStatsDesc: "No statistics available for this player yet.",
    career: "Career",
    contracts: "Contracts",
    suspensions: "Suspensions",
  },

  playerTimeline: {
    noEntries: "No entries available",
    suspension: "Suspension:",
    served: "served",
  },

  careerStats: {
    title: "Career Statistics",
  },

  playerSeasonStats: {
    title: "Season Statistics",
    season: "Season",
    team: "Team",
    career: "Career",
  },

  seasonTimeline: {
    title: "Season by Season",
    noSeasons: "No seasons available",
  },

  allTimeStats: {
    title: "All-Time Stats",
    seasons: "Seasons",
    games: "Games",
    winRate: "Win Rate",
    bestPlace: "Best Place",
    goalDiff: "Goal Diff.",
  },

  roundNavigator: {
    group: "Group",
  },

  layout: {
    openMenu: "Open menu",
    resetFilters: "Reset filters",
    selectTeam: "Select team",
    ourSponsors: "Our Sponsors",
    admin: "Admin",
  },

  charts: {
    goals: "Goals",
    assists: "Assists",
    points: "Points",
    wins: "Wins",
    losses: "Losses",
    goalsAgainst: "Goals Against",
    pim: "PIM",
    penaltyMinutes: "Penalty Minutes",
    difference: "Difference",
    winsPoints: "Wins/Points",
    placement: "Placement",
    placementAndPoints: "Placement & Points",
    goalRatio: "Goal Ratio",
    seasonProgression: "Season Progression",
    gaaProgression: "GAA Progression",
    pimPerSeason: "PIM per Season",
  },

  positionLabels: {
    forward: "Forward",
    defense: "Defenseman",
    goalie: "Goaltender",
  },

  playerHoverCard: {
    viewProfile: "View player profile",
    years: "years",
  },

  teamHoverCard: {
    viewTeamPage: "View team page",
    noMoreInfo: "No further information",
  },

  statsSummary: {
    topScorer: "Top Scorer",
    bestGoalie: "Best Goalie",
    mostPenalties: "Most Penalties",
  },
}

// ---------------------------------------------------------------------------
// German translations
// ---------------------------------------------------------------------------
const de: Translations = {
  common: {
    back: "Zurück",
    loading: "Laden...",
    loadMore: "Mehr laden",
    all: "Alle",
    readMore: "Weiterlesen",
    current: "Aktuell",
    noDate: "Ohne Datum",
    less: "Weniger",
    details: "Details",
    website: "Website",
    contact: "Kontakt",
  },

  status: {
    scheduled: "Geplant",
    live: "Live",
    completed: "Beendet",
    cancelled: "Abgesagt",
    postponed: "Verschoben",
  },

  positions: {
    goalie: "Torwart",
    defense: "Verteidigung",
    forward: "Sturm",
  },

  months: [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ],

  abbr: {
    gp: "Sp",
    g: "T",
    a: "V",
    pts: "Pkt",
    ga: "GT",
    gaa: "GAA",
    pim: "Strafmin.",
    w: "S",
    d: "U",
    l: "N",
    period: "D",
    min: "Min",
    diff: "Diff",
  },

  tooltip: {
    gamesPlayed: "Spiele",
    goals: "Tore",
    assists: "Vorlagen",
    points: "Punkte",
    pointsTotal: "Punkte (Tore + Vorlagen)",
    goalsAgainst: "Gegentore",
    goalsAgainstAvg: "Gegentorschnitt",
    penaltyMinutes: "Strafminuten",
    penaltyMinutesTotal: "Strafminuten gesamt",
    penalties: "Anzahl der Strafen",
    win: "Sieg",
    draw: "Unentschieden",
    loss: "Niederlage",
    wins: "Siege",
    draws: "Unentschieden",
    losses: "Niederlagen",
    goalsForAgainst: "Tore (erzielt:kassiert)",
    goalDifference: "Tordifferenz",
    last5Games: "Letzte 5 Spiele",
  },

  home: {
    title: "Start",
    subtitle: "Aktuelle Ergebnisse, Tabellen, Spielpläne und News",
    standings: "Tabelle",
    schedule: "Spielplan",
    latestResult: "Letztes Ergebnis",
    nextGame: "Nächstes Spiel",
    full: "Vollständig",
    upcomingGames: "Nächste Spiele",
    results: "Ergebnisse",
    allNews: "Alle Neuigkeiten",
    noNews: "Keine News vorhanden",
    noNewsDesc: "Hier erscheinen bald die neuesten Nachrichten.",
    sponsors: "Sponsoren",
  },

  standings: {
    title: "Tabelle",
    noData: "Noch keine Tabellendaten vorhanden",
    noDataDesc: "Die Tabelle wird nach den ersten Spielen angezeigt.",
  },

  schedule: {
    title: "Spielplan",
    titleFull: "Spielplan & Ergebnisse",
    allTeams: "Alle Teams",
    scheduled: "Geplant",
    completed: "Beendet",
    live: "Live",
    cancelled: "Abgesagt",
    noGames: "Keine Spiele gefunden",
    noGamesDesc: "Versuche die Filter anzupassen.",
  },

  gameDetail: {
    title: "Spieldetails",
    notFound: "Spiel nicht gefunden",
    backToSchedule: "Zurück zum Spielplan",
    home: "Heim",
    away: "Gast",
    gameReport: "Spielbericht",
    reportGenerating: "Spielbericht wird erstellt...",
    goals: "Tore",
    penalties: "Strafen",
    noDetailedReports: "Für dieses Spiel sind keine detaillierten Spielberichte verfügbar.",
    lineups: "Aufstellungen",
    noLineup: "Keine Aufstellung verfügbar",
  },

  news: {
    title: "News",
    articleNotFound: "Artikel nicht gefunden",
    backToNews: "Zurück zu News",
    noNews: "Keine News vorhanden",
    noNewsDesc: "Hier erscheinen bald die neuesten Nachrichten.",
    loadMore: "Weitere Artikel laden",
  },

  teams: {
    title: "Teams",
    noTeams: "Keine Teams vorhanden",
    notFound: "Team nicht gefunden",
    backToTeams: "Zurück zur Teamliste",
    roster: "Kader",
    seasonHistory: "Saisonverlauf",
    teamPhoto: "Teamfoto",
    noRoster: "Kein Kader verfügbar",
    noSeasons: "Keine Saisons vorhanden",
    noSeasonsDesc: "Für dieses Team liegen noch keine Saisondaten vor.",
  },

  statsOverview: {
    title: "Statistik-Übersicht",
    top10Scorers: "Top 10 Scorer",
    goaliesQualified: "Torhüter (qualifiziert)",
  },

  statsScorers: {
    title: "Scorer-Statistiken",
    topScorers: "Top-Scorer",
    allPositions: "Alle Positionen",
  },

  statsGoals: {
    title: "Torstatistiken",
    topScorers: "Top-Torschützen",
  },

  statsAssists: {
    title: "Vorlagen-Statistiken",
    topAssists: "Top-Vorlagengeber",
  },

  statsGoalies: {
    title: "Torhüter-Statistiken",
    comparison: "Torhüter-Vergleich (GAA)",
  },

  statsPenalties: {
    title: "Strafstatistiken",
    byTeam: "Strafminuten nach Team",
    types: "Strafarten",
  },

  statsTables: {
    player: "Spieler",
    goalies: "Torhüter",
    noStats: "Keine Statistiken vorhanden",
    noStatsDesc: "Es liegen noch keine Spielerstatistiken für diese Saison vor.",
    noGoalieStats: "Keine Torhüterstatistiken vorhanden",
    noGoalieStatsDesc: "Es liegen noch keine Torhüterstatistiken für diese Saison vor.",
    belowMinGames: "Unter Mindestspielanzahl",
    noPenaltyStats: "Keine Strafstatistiken vorhanden",
    noPenaltyStatsDesc: "Es liegen noch keine Strafstatistiken für diese Saison vor.",
  },

  compareTeams: {
    title: "Teamvergleich",
    selectTeams: "Teams zum Vergleich auswählen",
    radarTitle: "Radar-Vergleich",
    barTitle: "Balken-Vergleich",
    hintOneMore: "Wähle mindestens ein weiteres Team, um Siege, Niederlagen, Tore, Gegentore und Strafminuten im Radar- und Balkendiagramm zu vergleichen.",
    hintSelectTwo: "Wähle mindestens zwei Teams aus, um sie direkt miteinander zu vergleichen. Die Daten basieren auf der aktuellen Saisontabelle.",
    notEnoughTeams: "Nicht genügend Teams",
    notEnoughTeamsDesc: "Für einen Vergleich werden mindestens zwei Teams benötigt.",
  },

  playerDetail: {
    title: "Spieler",
    backToStats: "Zurück zu Statistiken",
    notAvailable: "Nicht verfügbar",
    notAvailableDesc: "Spielerhistorie ist Teil der erweiterten Statistiken.",
    notFound: "Spieler nicht gefunden",
    notFoundDesc: "Der gesuchte Spieler konnte nicht gefunden werden.",
    noStats: "Keine Statistiken vorhanden",
    noStatsDesc: "Für diesen Spieler liegen noch keine Statistiken vor.",
    career: "Karriere",
    contracts: "Verträge",
    suspensions: "Sperren",
  },

  playerTimeline: {
    noEntries: "Keine Einträge vorhanden",
    suspension: "Sperre:",
    served: "abgesessen",
  },

  careerStats: {
    title: "Karrierestatistiken",
  },

  playerSeasonStats: {
    title: "Saisonstatistiken",
    season: "Saison",
    team: "Team",
    career: "Karriere",
  },

  seasonTimeline: {
    title: "Saison für Saison",
    noSeasons: "Keine Saisons vorhanden",
  },

  allTimeStats: {
    title: "Gesamtstatistik",
    seasons: "Saisons",
    games: "Spiele",
    winRate: "Siegquote",
    bestPlace: "Beste Platz.",
    goalDiff: "Tordifferenz",
  },

  roundNavigator: {
    group: "Gruppe",
  },

  layout: {
    openMenu: "Menü öffnen",
    resetFilters: "Filter zurücksetzen",
    selectTeam: "Team auswählen",
    ourSponsors: "Unsere Sponsoren",
    admin: "Admin",
  },

  charts: {
    goals: "Tore",
    assists: "Vorlagen",
    points: "Punkte",
    wins: "Siege",
    losses: "Niederlagen",
    goalsAgainst: "Gegentore",
    pim: "Strafmin.",
    penaltyMinutes: "Strafminuten",
    difference: "Differenz",
    winsPoints: "Siege/Punkte",
    placement: "Platzierung",
    placementAndPoints: "Platzierung & Punkte",
    goalRatio: "Torverhältnis",
    seasonProgression: "Saisonverlauf",
    gaaProgression: "GAA-Verlauf",
    pimPerSeason: "Strafminuten pro Saison",
  },

  positionLabels: {
    forward: "Stürmer",
    defense: "Verteidiger",
    goalie: "Torhüter",
  },

  playerHoverCard: {
    viewProfile: "Spielerprofil ansehen",
    years: "Jahre",
  },

  teamHoverCard: {
    viewTeamPage: "Teamseite ansehen",
    noMoreInfo: "Keine weiteren Informationen",
  },

  statsSummary: {
    topScorer: "Top Scorer",
    bestGoalie: "Bester Torhüter",
    mostPenalties: "Meiste Strafen",
  },
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export type Translations = typeof en

export function useT(): Translations {
  const { locale } = useSettings()
  return locale.startsWith("de") ? de : en
}
