import { Button, Card, CardContent, toast } from "@puckhub/ui"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldBan,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { TabNavigation } from "~/components/tabNavigation"
import { GameReportHeader } from "~/components/gameReport/gameReportHeader"
import { GameSuspensionList } from "~/components/gameReport/gameSuspensionList"
import { GameTimeline, type GameTimelineHandle } from "~/components/gameReport/gameTimeline"
import { LineupEditor, type LineupEditorHandle } from "~/components/gameReport/lineupEditor"
import { SuspensionWarnings } from "~/components/gameReport/suspensionWarnings"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/games/$gameId/report")({
  loader: async ({ context, params }) => {
    await context.trpcQueryUtils?.gameReport.getReport.ensureData({ gameId: params.gameId })
  },
  component: GameReportPage,
})

type Tab = "lineup" | "report" | "ai"

function GameReportPage() {
  usePermissionGuard("games")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t, i18n } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { gameId } = Route.useParams()
  const utils = trpc.useUtils()
  const [activeTab, setActiveTab] = useState<Tab>("report")
  const initialTabSet = useRef(false)
  const timelineRef = useRef<GameTimelineHandle>(null)
  const lineupRef = useRef<LineupEditorHandle>(null)
  const { canUseFeature } = usePlanLimits()

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)
  const [notes, setNotes] = useState("")
  const notesInitialized = useRef(false)

  const reportQuery = trpc.gameReport.getReport.useQuery({ gameId })
  const penaltyTypesQuery = trpc.gameReport.getPenaltyTypes.useQuery()

  const game = reportQuery.data
  const isRecapGenerating = !!(game as any)?.recapGenerating

  // Poll while recap is generating
  useEffect(() => {
    if (!isRecapGenerating) return
    const interval = setInterval(() => {
      utils.gameReport.getReport.invalidate({ gameId })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRecapGenerating, gameId, utils])
  const gameSeasonId = game?.round?.division?.seasonId

  // Initialize notes from game data
  useEffect(() => {
    if (game && !notesInitialized.current) {
      notesInitialized.current = true
      setNotes(game.notes ?? "")
    }
  }, [game])

  const completeGame = trpc.game.complete.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      utils.game.listForSeason.invalidate()
      setShowCompleteConfirm(false)
      toast.success(t("gameReport.toast.gameCompleted"))
    },
    onError: (e) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
  })

  const reopenGame = trpc.game.reopen.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      utils.game.listForSeason.invalidate()
      setShowReopenConfirm(false)
      toast.success(t("gameReport.toast.gameReopened"))
    },
    onError: (e) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
  })

  const updateNotes = trpc.game.update.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      toast.success(t("gameReport.notes.saved"))
    },
    onError: (e) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
  })

  const regenerateRecap = trpc.aiRecap.regenerate.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      toast.success(t("gameReport.recap.regenerated"))
    },
    onError: (e) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
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

  // Check if this game has a public report (hooks must be before early returns)
  const { data: publicReportCount } = trpc.publicGameReport.count.useQuery()
  const { data: publicReports } = trpc.publicGameReport.list.useQuery(
    { limit: 1 },
    { enabled: !!(game && game.status === "completed") },
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
        <Link to="/$orgSlug/games" params={{ orgSlug }} className="text-primary underline text-sm mt-2 inline-block">
          {t("gameReport.backToGames")}
        </Link>
      </div>
    )
  }

  const isCompleted = game.status === "completed"
  const isCancelled = game.status === "cancelled"
  const readOnly = isCompleted || isCancelled
  const canComplete = !isCompleted && !isCancelled

  const gamePublicReport = isCompleted
    ? publicReports?.find((r: any) => r.gameId === gameId && !r.reverted)
    : undefined

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/$orgSlug/games"
        params={{ orgSlug }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("gameReport.backToGames")}
      </Link>

      {/* Header */}
      <GameReportHeader game={game as any} />

      {/* Public report notice */}
      {gamePublicReport && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-5 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {t("publicReports.publicReportNotice")}
            </div>
            <Link to="/$orgSlug/games/public-reports" params={{ orgSlug }} className="text-sm text-primary underline">
              {t("publicReports.viewPublicReports")}
            </Link>
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
      <TabNavigation
        groups={[{
          key: "report-tabs",
          tabs: [
            { id: "lineup" as const, label: t("gameReport.tabs.lineup"), icon: Users },
            { id: "report" as const, label: t("gameReport.tabs.report"), icon: ClipboardList },
            ...(isCompleted && canUseFeature("featureAiRecaps")
              ? [{ id: "ai" as const, label: t("gameReport.tabs.ai"), icon: Sparkles }]
              : []),
          ],
        }]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Grid: Tab content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* ── Tab content ── */}
        <div>
          {activeTab === "lineup" && (
            <LineupEditor
              ref={lineupRef}
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
              externalActions
            />
          )}

          {activeTab === "report" && (
            <GameTimeline
              ref={timelineRef}
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
              externalActions
            />
          )}

      {/* AI Recap tab */}
      {activeTab === "ai" && isCompleted && canUseFeature("featureAiRecaps") && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {t("gameReport.recap.title")}
            </h3>

            {(game as any).recapGenerating ? (
              <div className="space-y-3">
                <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-5/6 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("gameReport.recap.generating")}
                </p>
              </div>
            ) : (game as any).recapTitle ? (
              <div className="content-enter">
                <h4 className="font-semibold text-base mb-2">{(game as any).recapTitle}</h4>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&>h3]:mt-5 [&>h3]:mb-1.5 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:tracking-wide [&>h3]:uppercase [&>h3]:text-foreground/70 [&>h3:first-child]:mt-0 [&>p:first-child]:mt-0 [&>h3+p+p]:mt-4 [&>p:last-child]:mt-5"
                  dangerouslySetInnerHTML={{ __html: (game as any).recapContent ?? "" }}
                />
                {(game as any).recapGeneratedAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {t("gameReport.recap.generatedAt", {
                      date: new Date((game as any).recapGeneratedAt).toLocaleDateString(i18n.language, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("gameReport.recap.noRecap")}</p>
            )}
          </CardContent>
        </Card>
      )}
        </div>

        {/* ── Sidebar ── */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="p-5 space-y-4">
            {/* Score + Complete/Reopen */}
            {canComplete && (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                    {t("gameReport.completeSection.score")}
                  </div>
                  <div className="text-3xl font-black tabular-nums">
                    {game.homeScore ?? 0} : {game.awayScore ?? 0}
                  </div>
                </div>
                {!hasBothLineups && (
                  <p className="text-xs text-amber-600 text-center">{t("gameReport.completeSection.lineupsRequired")}</p>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!hasBothLineups || completeGame.isPending}
                  onClick={() => setShowCompleteConfirm(true)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t("gameReport.completeSection.button")}
                </Button>
              </div>
            )}

            {(isCompleted || isCancelled) && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
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
                  className="w-full"
                  onClick={() => setShowReopenConfirm(true)}
                  disabled={reopenGame.isPending}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  {t("gameReport.reopenSection.button")}
                </Button>
              </div>
            )}

            {/* Notes */}
            <div className="border-t border-border/40 pt-4">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-muted-foreground">
                <StickyNote className="w-3.5 h-3.5" />
                {t("gameReport.notes.label")}
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("gameReport.notes.placeholder")}
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                rows={2}
              />
              {notes !== (game.notes ?? "") && (
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => updateNotes.mutate({ id: gameId, notes: notes || null })}
                    disabled={updateNotes.isPending}
                  >
                    {updateNotes.isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              )}
            </div>

            {/* Tab-specific actions */}
            {activeTab === "report" && !readOnly && (
              <div className="border-t border-border/40 pt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  onClick={() => timelineRef.current?.openGoalDialog()}
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  {t("gameReport.addGoalBtn")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={() => timelineRef.current?.openPenaltyDialog()}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {t("gameReport.addPenaltyBtn")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => timelineRef.current?.openSuspensionDialog()}
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  {t("gameReport.addSuspensionBtn")}
                </Button>
              </div>
            )}

            {activeTab === "lineup" && !readOnly && (
              <div className="border-t border-border/40 pt-4">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => lineupRef.current?.save()}
                  disabled={lineupRef.current?.isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t("gameReport.saveLineup")}
                </Button>
              </div>
            )}

            {activeTab === "ai" && isCompleted && canUseFeature("featureAiRecaps") && (
              <div className="border-t border-border/40 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => regenerateRecap.mutate({ gameId })}
                  disabled={regenerateRecap.isPending || (game as any).recapGenerating}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${regenerateRecap.isPending ? "animate-spin" : ""}`} />
                  {regenerateRecap.isPending
                    ? t("gameReport.recap.regenerating")
                    : (game as any).recapTitle
                      ? t("gameReport.recap.regenerate")
                      : t("gameReport.recap.generate")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
