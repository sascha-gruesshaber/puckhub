import { relations } from "drizzle-orm"
import { user } from "./auth"
import { bonusPoints } from "./bonusPoints"
import { contracts } from "./contracts"
import { divisions } from "./divisions"
import { gameEvents } from "./gameEvents"
import { gameLineups } from "./gameLineups"
import { gameSuspensions } from "./gameSuspensions"
import { games } from "./games"
import { goalieGameStats } from "./goalieGameStats"
import { goalieSeasonStats } from "./goalieSeasonStats"
import { news } from "./news"
import { pageAliases } from "./pageAliases"
import { pages } from "./pages"
import { passkey } from "./passkey"
import { penaltyTypes } from "./penaltyTypes"
import { playerSeasonStats } from "./playerSeasonStats"
import { players } from "./players"
import { rounds } from "./rounds"
import { seasons } from "./seasons"
import { sponsors } from "./sponsors"
import { standings } from "./standings"
import { teamDivisions } from "./teamDivisions"
import { teams } from "./teams"
import { teamTrikots } from "./teamTrikots"
import { trikots } from "./trikots"
import { trikotTemplates } from "./trikotTemplates"
import { twoFactor } from "./twoFactor"
import { userRoles } from "./userRoles"
import { venues } from "./venues"

// --- Seasons ---
export const seasonsRelations = relations(seasons, ({ many }) => ({
  divisions: many(divisions),
  contractsStarted: many(contracts, { relationName: "contractStartSeason" }),
  contractsEnded: many(contracts, { relationName: "contractEndSeason" }),
  playerSeasonStats: many(playerSeasonStats),
  goalieSeasonStats: many(goalieSeasonStats),
}))

// --- Divisions ---
export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  season: one(seasons, { fields: [divisions.seasonId], references: [seasons.id] }),
  rounds: many(rounds),
  teamDivisions: many(teamDivisions),
}))

// --- Rounds ---
export const roundsRelations = relations(rounds, ({ one, many }) => ({
  division: one(divisions, { fields: [rounds.divisionId], references: [divisions.id] }),
  games: many(games),
  standings: many(standings),
  bonusPoints: many(bonusPoints),
}))

// --- Teams ---
export const teamsRelations = relations(teams, ({ one, many }) => ({
  contracts: many(contracts),
  teamDivisions: many(teamDivisions),
  homeGames: many(games, { relationName: "homeTeam" }),
  awayGames: many(games, { relationName: "awayTeam" }),
  gameEvents: many(gameEvents),
  standings: many(standings),
  bonusPoints: many(bonusPoints),
  playerSeasonStats: many(playerSeasonStats),
  goalieSeasonStats: many(goalieSeasonStats),
  goalieGameStats: many(goalieGameStats),
  userRoles: many(userRoles),
  teamTrikots: many(teamTrikots),
  sponsors: many(sponsors),
  defaultVenue: one(venues, { fields: [teams.defaultVenueId], references: [venues.id] }),
}))

// --- Team Divisions (junction) ---
export const teamDivisionsRelations = relations(teamDivisions, ({ one }) => ({
  team: one(teams, { fields: [teamDivisions.teamId], references: [teams.id] }),
  division: one(divisions, { fields: [teamDivisions.divisionId], references: [divisions.id] }),
}))

// --- Players ---
export const playersRelations = relations(players, ({ many }) => ({
  contracts: many(contracts),
  scorerEvents: many(gameEvents, { relationName: "eventScorer" }),
  assist1Events: many(gameEvents, { relationName: "eventAssist1" }),
  assist2Events: many(gameEvents, { relationName: "eventAssist2" }),
  goalieEvents: many(gameEvents, { relationName: "eventGoalie" }),
  penaltyEvents: many(gameEvents, { relationName: "eventPenaltyPlayer" }),
  gameLineups: many(gameLineups),
  gameSuspensions: many(gameSuspensions),
  playerSeasonStats: many(playerSeasonStats),
  goalieSeasonStats: many(goalieSeasonStats),
  goalieGameStats: many(goalieGameStats),
}))

// --- Contracts ---
export const contractsRelations = relations(contracts, ({ one }) => ({
  player: one(players, { fields: [contracts.playerId], references: [players.id] }),
  team: one(teams, { fields: [contracts.teamId], references: [teams.id] }),
  startSeason: one(seasons, {
    fields: [contracts.startSeasonId],
    references: [seasons.id],
    relationName: "contractStartSeason",
  }),
  endSeason: one(seasons, {
    fields: [contracts.endSeasonId],
    references: [seasons.id],
    relationName: "contractEndSeason",
  }),
}))

// --- Games ---
export const gamesRelations = relations(games, ({ one, many }) => ({
  round: one(rounds, { fields: [games.roundId], references: [rounds.id] }),
  homeTeam: one(teams, {
    fields: [games.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [games.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
  venue: one(venues, { fields: [games.venueId], references: [venues.id] }),
  events: many(gameEvents),
  lineups: many(gameLineups),
  suspensions: many(gameSuspensions),
  goalieGameStats: many(goalieGameStats),
}))

// --- Game Events ---
export const gameEventsRelations = relations(gameEvents, ({ one }) => ({
  game: one(games, { fields: [gameEvents.gameId], references: [games.id] }),
  team: one(teams, { fields: [gameEvents.teamId], references: [teams.id] }),
  scorer: one(players, {
    fields: [gameEvents.scorerId],
    references: [players.id],
    relationName: "eventScorer",
  }),
  assist1: one(players, {
    fields: [gameEvents.assist1Id],
    references: [players.id],
    relationName: "eventAssist1",
  }),
  assist2: one(players, {
    fields: [gameEvents.assist2Id],
    references: [players.id],
    relationName: "eventAssist2",
  }),
  goalie: one(players, {
    fields: [gameEvents.goalieId],
    references: [players.id],
    relationName: "eventGoalie",
  }),
  penaltyPlayer: one(players, {
    fields: [gameEvents.penaltyPlayerId],
    references: [players.id],
    relationName: "eventPenaltyPlayer",
  }),
  penaltyType: one(penaltyTypes, {
    fields: [gameEvents.penaltyTypeId],
    references: [penaltyTypes.id],
  }),
  suspension: one(gameSuspensions),
}))

// --- Game Lineups ---
export const gameLineupsRelations = relations(gameLineups, ({ one }) => ({
  game: one(games, { fields: [gameLineups.gameId], references: [games.id] }),
  player: one(players, { fields: [gameLineups.playerId], references: [players.id] }),
  team: one(teams, { fields: [gameLineups.teamId], references: [teams.id] }),
}))

// --- Game Suspensions ---
export const gameSuspensionsRelations = relations(gameSuspensions, ({ one }) => ({
  game: one(games, { fields: [gameSuspensions.gameId], references: [games.id] }),
  gameEvent: one(gameEvents, { fields: [gameSuspensions.gameEventId], references: [gameEvents.id] }),
  player: one(players, { fields: [gameSuspensions.playerId], references: [players.id] }),
  team: one(teams, { fields: [gameSuspensions.teamId], references: [teams.id] }),
}))

// --- Venues ---
export const venuesRelations = relations(venues, ({ many }) => ({
  games: many(games),
  defaultForTeams: many(teams),
}))

// --- Penalty Types ---
export const penaltyTypesRelations = relations(penaltyTypes, ({ many }) => ({
  gameEvents: many(gameEvents),
}))

// --- Standings ---
export const standingsRelations = relations(standings, ({ one }) => ({
  team: one(teams, { fields: [standings.teamId], references: [teams.id] }),
  round: one(rounds, { fields: [standings.roundId], references: [rounds.id] }),
}))

// --- Bonus Points ---
export const bonusPointsRelations = relations(bonusPoints, ({ one }) => ({
  team: one(teams, { fields: [bonusPoints.teamId], references: [teams.id] }),
  round: one(rounds, { fields: [bonusPoints.roundId], references: [rounds.id] }),
}))

// --- Player Season Stats ---
export const playerSeasonStatsRelations = relations(playerSeasonStats, ({ one }) => ({
  player: one(players, { fields: [playerSeasonStats.playerId], references: [players.id] }),
  season: one(seasons, { fields: [playerSeasonStats.seasonId], references: [seasons.id] }),
  team: one(teams, { fields: [playerSeasonStats.teamId], references: [teams.id] }),
}))

// --- Goalie Season Stats ---
export const goalieSeasonStatsRelations = relations(goalieSeasonStats, ({ one }) => ({
  player: one(players, { fields: [goalieSeasonStats.playerId], references: [players.id] }),
  season: one(seasons, { fields: [goalieSeasonStats.seasonId], references: [seasons.id] }),
  team: one(teams, { fields: [goalieSeasonStats.teamId], references: [teams.id] }),
}))

// --- Goalie Game Stats ---
export const goalieGameStatsRelations = relations(goalieGameStats, ({ one }) => ({
  game: one(games, { fields: [goalieGameStats.gameId], references: [games.id] }),
  player: one(players, { fields: [goalieGameStats.playerId], references: [players.id] }),
  team: one(teams, { fields: [goalieGameStats.teamId], references: [teams.id] }),
}))

// --- User ---
export const userRelations = relations(user, ({ many }) => ({
  twoFactors: many(twoFactor),
  passkeys: many(passkey),
}))

// --- User Roles ---
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  team: one(teams, { fields: [userRoles.teamId], references: [teams.id] }),
}))

// --- Trikot Templates ---
export const trikotTemplatesRelations = relations(trikotTemplates, ({ many }) => ({
  trikots: many(trikots),
}))

// --- Trikots ---
export const trikotsRelations = relations(trikots, ({ one, many }) => ({
  template: one(trikotTemplates, {
    fields: [trikots.templateId],
    references: [trikotTemplates.id],
  }),
  teamTrikots: many(teamTrikots),
}))

// --- Team Trikots (junction) ---
export const teamTrikotsRelations = relations(teamTrikots, ({ one }) => ({
  team: one(teams, { fields: [teamTrikots.teamId], references: [teams.id] }),
  trikot: one(trikots, { fields: [teamTrikots.trikotId], references: [trikots.id] }),
}))

// --- Sponsors ---
export const sponsorsRelations = relations(sponsors, ({ one }) => ({
  team: one(teams, { fields: [sponsors.teamId], references: [teams.id] }),
}))

// --- News ---
export const newsRelations = relations(news, ({ one }) => ({
  author: one(user, { fields: [news.authorId], references: [user.id] }),
}))

// --- Pages ---
export const pagesRelations = relations(pages, ({ one, many }) => ({
  parent: one(pages, { fields: [pages.parentId], references: [pages.id], relationName: "pageChildren" }),
  children: many(pages, { relationName: "pageChildren" }),
  aliases: many(pageAliases),
}))

// --- Page Aliases ---
export const pageAliasesRelations = relations(pageAliases, ({ one }) => ({
  targetPage: one(pages, { fields: [pageAliases.targetPageId], references: [pages.id] }),
}))

// --- Two Factor ---
export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, { fields: [twoFactor.userId], references: [user.id] }),
}))

// --- Passkey ---
export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, { fields: [passkey.userId], references: [user.id] }),
}))
