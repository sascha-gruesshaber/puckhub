import { Button, toast } from "@puckhub/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, ClipboardList, RotateCcw, Users } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { GameReportHeader } from "~/components/gameReport/gameReportHeader"
import { GameSuspensionList } from "~/components/gameReport/gameSuspensionList"
import { GameTimeline } from "~/components/gameReport/gameTimeline"
import { LineupEditor } from "~/components/gameReport/lineupEditor"
import { SuspensionWarnings } from "~/components/gameReport/suspensionWarnings"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/games/$gameId/report")({
  loader: async ({ context, params }) => {
    await context.trpcQueryUtils?.gameReport.getReport.ensureData({ gameId: params.gameId })
  },
  component: GameReportPage,
})

type Tab = "lineup" | "report"

function GameReportPage() {
  const { t, i18n } = useTranslation("common")
  const { gameId } = Route.useParams()
  const utils = trpc.useUtils()
  const [activeTab, setActiveTab] = useState<Tab>("report")
  const initialTabSet = useRef(false)

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)

  const reportQuery = trpc.gameReport.getReport.useQuery({ gameId })
  const penaltyTypesQuery = trpc.gameReport.getPenaltyTypes.useQuery()

  const game = reportQuery.data
  const gameSeasonId = game?.round?.division?.seasonId

  const completeGame = trpc.game.complete.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      utils.game.listForSeason.invalidate()
      setShowCompleteConfirm(false)
      toast.success(t("gameReport.toast.gameCompleted"))
    },
    onError: (e) => toast.error(t("gameReport.toast.error"), { description: e.message }),
  })

  const reopenGame = trpc.game.reopen.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      utils.game.listForSeason.invalidate()
      setShowReopenConfirm(false)
      toast.success(t("gameReport.toast.gameReopened"))
    },
    onError: (e) => toast.error(t("gameReport.toast.error"), { description: e.message }),
  })

  const rostersQuery = trpc.gameReport.getRosters.useQuery(
    {
      homeTeamId: game?.homeTeamId ?? "",
      awayTeamId: game?.awayTeamId ?? "",
      seasonId: gameSeasonId ?? "",
    },
    { enabled: !!game && !!gameSeasonId },
  )

  const homeRoster = useMemo(
    () =>
      (rostersQuery.data?.home ?? []).map((c: any) => ({
        id: c.id,
        playerId: c.playerId,
        teamId: c.teamId,
        position: c.position,
        jerseyNumber: c.jerseyNumber,
        player: c.player,
      })),
    [rostersQuery.data?.home],
  )

  const awayRoster = useMemo(
    () =>
      (rostersQuery.data?.away ?? []).map((c: any) => ({
        id: c.id,
        playerId: c.playerId,
        teamId: c.teamId,
        position: c.position,
        jerseyNumber: c.jerseyNumber,
        player: c.player,
      })),
    [rostersQuery.data?.away],
  )

  const lineupPlayers = useMemo(
    () =>
      (game?.lineups ?? []).map((l: any) => ({
        playerId: l.playerId,
        teamId: l.teamId,
        position: l.position,
        jerseyNumber: l.jerseyNumber,
        isStartingGoalie: l.isStartingGoalie,
        player: l.player,
      })),
    [game?.lineups],
  )

  const hasHomeLineup = lineupPlayers.some((l) => l.teamId === game?.homeTeamId)
  const hasAwayLineup = lineupPlayers.some((l) => l.teamId === game?.awayTeamId)
  const hasBothLineups = hasHomeLineup && hasAwayLineup

  // Auto-open lineup tab on first load when no lineup is configured
  useEffect(() => {
    if (!initialTabSet.current && game) {
      initialTabSet.current = true
      if (lineupPlayers.length === 0) {
        setActiveTab("lineup")
      }
    }
  }, [game, lineupPlayers.length])

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

  const isCompleted = game.status === "completed"
  const isCancelled = game.status === "cancelled"
  const readOnly = isCompleted || isCancelled
  const canComplete = !isCompleted && !isCancelled

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

      {/* Complete Game section */}
      {canComplete && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  {t("gameReport.completeSection.score")}
                </div>
                <div className="text-3xl font-black tabular-nums">
                  {game.homeScore ?? 0} : {game.awayScore ?? 0}
                </div>
              </div>
              {!hasBothLineups && (
                <p className="text-sm text-amber-600">{t("gameReport.completeSection.lineupsRequired")}</p>
              )}
            </div>
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!hasBothLineups || completeGame.isPending}
              onClick={() => setShowCompleteConfirm(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("gameReport.completeSection.button")}
            </Button>
          </div>
        </div>
      )}

      {/* Reopen section (shown when completed or cancelled) */}
      {(isCompleted || isCancelled) && (
        <div className="rounded-xl border border-border/50 bg-muted/30 px-5 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {isCompleted
                ? t("gameReport.reopenSection.finalized", {
                    date: game.finalizedAt
                      ? new Date(game.finalizedAt).toLocaleDateString(i18n.language, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                  })
                : t("gamesPage.status.cancelled")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReopenConfirm(true)}
              disabled={reopenGame.isPending}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t("gameReport.reopenSection.button")}
            </Button>
          </div>
        </div>
      )}

      {/* Suspension warnings (from other games) */}
      <SuspensionWarnings
        suspensions={game.activeSuspensions}
        homeTeamId={game.homeTeamId}
        awayTeamId={game.awayTeamId}
      />

      {/* Suspensions in this game */}
      <GameSuspensionList
        gameId={gameId}
        suspensions={game.suspensions as any}
        homeTeamId={game.homeTeamId}
        readOnly={readOnly}
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
          readOnly={readOnly}
        />
      ) : (
        <GameTimeline
          gameId={gameId}
          homeTeam={{
            id: game.homeTeamId,
            name: game.homeTeam.name,
            shortName: game.homeTeam.shortName,
            logoUrl: game.homeTeam.logoUrl,
            primaryColor: game.homeTeam.primaryColor,
          }}
          awayTeam={{
            id: game.awayTeamId,
            name: game.awayTeam.name,
            shortName: game.awayTeam.shortName,
            logoUrl: game.awayTeam.logoUrl,
            primaryColor: game.awayTeam.primaryColor,
          }}
          events={game.events}
          lineups={lineupPlayers}
          penaltyTypes={penaltyTypesQuery.data ?? []}
          readOnly={readOnly}
        />
      )}

      {/* Complete confirmation */}
      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title={t("gameReport.completeSection.confirmTitle")}
        description={t("gameReport.completeSection.confirmDescription", {
          homeScore: game.homeScore ?? 0,
          awayScore: game.awayScore ?? 0,
        })}
        confirmLabel={t("gameReport.completeSection.button")}
        isPending={completeGame.isPending}
        onConfirm={() => completeGame.mutate({ id: gameId })}
      />

      {/* Reopen confirmation */}
      <ConfirmDialog
        open={showReopenConfirm}
        onOpenChange={setShowReopenConfirm}
        title={t("gameReport.reopenSection.confirmTitle")}
        description={t("gameReport.reopenSection.confirmDescription")}
        confirmLabel={t("gameReport.reopenSection.button")}
        isPending={reopenGame.isPending}
        onConfirm={() => reopenGame.mutate({ id: gameId })}
      />
    </div>
  )
}
