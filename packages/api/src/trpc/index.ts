import { router } from "./init"
import { bonusPointsRouter } from "./routers/bonusPoints"
import { contractRouter } from "./routers/contract"
import { dashboardRouter } from "./routers/dashboard"
import { divisionRouter } from "./routers/division"
import { gameRouter } from "./routers/game"
import { gameReportRouter } from "./routers/gameReport"
import { newsRouter } from "./routers/news"
import { organizationRouter } from "./routers/organization"
import { pageRouter } from "./routers/page"
import { playerRouter } from "./routers/player"
import { roundRouter } from "./routers/round"
import { schedulerRouter } from "./routers/scheduler"
import { seasonRouter } from "./routers/season"
import { settingsRouter } from "./routers/settings"
import { sponsorRouter } from "./routers/sponsor"
import { standingsRouter } from "./routers/standings"
import { statsRouter } from "./routers/stats"
import { teamRouter } from "./routers/team"
import { teamDivisionRouter } from "./routers/teamDivision"
import { teamTrikotRouter } from "./routers/teamTrikot"
import { trikotRouter } from "./routers/trikot"
import { trikotTemplateRouter } from "./routers/trikotTemplate"
import { userPreferencesRouter } from "./routers/userPreferences"
import { usersRouter } from "./routers/users"
import { venueRouter } from "./routers/venue"

export const appRouter = router({
  bonusPoints: bonusPointsRouter,
  dashboard: dashboardRouter,
  season: seasonRouter,
  division: divisionRouter,
  round: roundRouter,
  team: teamRouter,
  teamDivision: teamDivisionRouter,
  player: playerRouter,
  contract: contractRouter,
  game: gameRouter,
  gameReport: gameReportRouter,
  standings: standingsRouter,
  stats: statsRouter,
  trikotTemplate: trikotTemplateRouter,
  trikot: trikotRouter,
  teamTrikot: teamTrikotRouter,
  users: usersRouter,
  settings: settingsRouter,
  sponsor: sponsorRouter,
  news: newsRouter,
  organization: organizationRouter,
  page: pageRouter,
  venue: venueRouter,
  userPreferences: userPreferencesRouter,
  scheduler: schedulerRouter,
})

export type AppRouter = typeof appRouter
