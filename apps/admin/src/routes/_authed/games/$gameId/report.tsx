import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, ClipboardList, Users } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { GameReportHeader } from "~/components/gameReport/gameReportHeader"
import { GameTimeline } from "~/components/gameReport/gameTimeline"
import { LineupEditor } from "~/components/gameReport/lineupEditor"
import { SuspensionWarnings } from "~/components/gameReport/suspensionWarnings"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/games/$gameId/report")({
  component: GameReportPage,
})

type Tab = "lineup" | "report"

function GameReportPage() {
  const { t } = useTranslation("common")
  const { gameId } = Route.useParams()
  const [activeTab, setActiveTab] = useState<Tab>("report")

  const reportQuery = trpc.gameReport.getReport.useQuery({ gameId })
  const penaltyTypesQuery = trpc.gameReport.getPenaltyTypes.useQuery()

  const game = reportQuery.data
  const gameSeasonId = game?.round?.division?.seasonId

  const rostersQuery = trpc.gameReport.getRosters.useQuery(
    {
      homeTeamId: game?.homeTeamId ?? "",
      awayTeamId: game?.awayTeamId ?? "",
      seasonId: gameSeasonId ?? "",
    },
    { enabled: !!game && !!gameSeasonId },
  )

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("gameReport.notFound")}</p>
        <Link to="/games" className="text-primary underline text-sm mt-2 inline-block">
          {t("gameReport.backToGames")}
        </Link>
      </div>
    )
  }

  const homeRoster = (rostersQuery.data?.home ?? []).map((c: any) => ({
    id: c.id,
    playerId: c.playerId,
    teamId: c.teamId,
    position: c.position,
    jerseyNumber: c.jerseyNumber,
    player: c.player,
  }))

  const awayRoster = (rostersQuery.data?.away ?? []).map((c: any) => ({
    id: c.id,
    playerId: c.playerId,
    teamId: c.teamId,
    position: c.position,
    jerseyNumber: c.jerseyNumber,
    player: c.player,
  }))

  const lineupPlayers = (game.lineups ?? []).map((l: any) => ({
    playerId: l.playerId,
    teamId: l.teamId,
    position: l.position,
    jerseyNumber: l.jerseyNumber,
    isStartingGoalie: l.isStartingGoalie,
    player: l.player,
  }))

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/games"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("gameReport.backToGames")}
      </Link>

      {/* Header */}
      <GameReportHeader game={game as any} />

      {/* Suspension warnings */}
      <SuspensionWarnings
        suspensions={game.activeSuspensions}
        homeTeamId={game.homeTeamId}
        awayTeamId={game.awayTeamId}
        homeTeamName={game.homeTeam.name}
        awayTeamName={game.awayTeam.name}
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("lineup")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "lineup"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          {t("gameReport.tabs.lineup")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "report"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          {t("gameReport.tabs.report")}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "lineup" ? (
        <LineupEditor
          gameId={gameId}
          homeTeamId={game.homeTeamId}
          awayTeamId={game.awayTeamId}
          homeTeamName={game.homeTeam.name}
          awayTeamName={game.awayTeam.name}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          existingLineup={lineupPlayers}
          activeSuspensions={game.activeSuspensions}
        />
      ) : (
        <GameTimeline
          gameId={gameId}
          homeTeamId={game.homeTeamId}
          awayTeamId={game.awayTeamId}
          homeTeamName={game.homeTeam.name}
          awayTeamName={game.awayTeam.name}
          events={game.events}
          lineups={lineupPlayers}
          penaltyTypes={penaltyTypesQuery.data ?? []}
        />
      )}
    </div>
  )
}
