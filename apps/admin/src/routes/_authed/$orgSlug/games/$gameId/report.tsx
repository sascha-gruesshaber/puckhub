import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
} from "@puckhub/ui"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldBan,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { GameReportHeader } from "~/components/gameReport/gameReportHeader"
import { GameSuspensionList } from "~/components/gameReport/gameSuspensionList"
import { GameTimeline, type GameTimelineHandle } from "~/components/gameReport/gameTimeline"
import { LineupEditor } from "~/components/gameReport/lineupEditor"
import { SuspensionWarnings } from "~/components/gameReport/suspensionWarnings"
import { TabNavigation } from "~/components/tabNavigation"
import { TeamCombobox } from "~/components/teamCombobox"
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

function toLocalInputValue(value: Date | string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

interface EditForm {
  roundId: string
  homeTeamId: string
  awayTeamId: string
  location: string
  scheduledAt: string
}

const emptyEditForm: EditForm = { roundId: "", homeTeamId: "", awayTeamId: "", location: "", scheduledAt: "" }

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
  const { canUseFeature } = usePlanLimits()

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)

  // Edit sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm)
  const [confirmEditClose, setConfirmEditClose] = useState(false)

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

  const updateGameDetails = trpc.game.update.useMutation({
    onSuccess: () => {
      utils.gameReport.getReport.invalidate({ gameId })
      utils.game.listForSeason.invalidate()
      setEditSheetOpen(false)
      toast.success(t("gamesPage.toast.gameUpdated"))
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

  // Structure & teams for edit sheet
  const structureQuery = trpc.season.getFullStructure.useQuery({ id: gameSeasonId ?? "" }, { enabled: !!gameSeasonId })
  const { data: locationSuggestions } = trpc.game.locationSuggestions.useQuery()

  const rounds = structureQuery.data?.rounds ?? []
  const editTeams = useMemo(() => {
    const m = new Map<
      string,
      { id: string; name: string; shortName: string; logoUrl: string | null; homeVenue?: string | null }
    >()
    for (const ta of structureQuery.data?.teamAssignments ?? []) {
      m.set(ta.team.id, {
        id: ta.team.id,
        name: ta.team.name,
        shortName: ta.team.shortName,
        logoUrl: ta.team.logoUrl ?? null,
        homeVenue: ta.team.homeVenue,
      })
    }
    return Array.from(m.values())
  }, [structureQuery.data])

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

  const gamePublicReport = isCompleted ? publicReports?.find((r: any) => r.gameId === gameId && !r.reverted) : undefined

  const isEditDirty =
    editSheetOpen &&
    (editForm.roundId !== ((game as any)?.roundId ?? "") ||
      editForm.homeTeamId !== (game?.homeTeamId ?? "") ||
      editForm.awayTeamId !== (game?.awayTeamId ?? "") ||
      editForm.location !== (game?.location ?? "") ||
      editForm.scheduledAt !== toLocalInputValue(game?.scheduledAt))

  // ── Helpers ──

  function openEditSheet() {
    if (!game) return
    setEditForm({
      roundId: (game as any).roundId ?? "",
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      location: game.location ?? "",
      scheduledAt: toLocalInputValue(game.scheduledAt),
    })
    setEditSheetOpen(true)
  }

  function submitEditForm(e: React.FormEvent) {
    e.preventDefault()
    updateGameDetails.mutate({
      id: gameId,
      roundId: editForm.roundId || undefined,
      homeTeamId: editForm.homeTeamId || undefined,
      awayTeamId: editForm.awayTeamId || undefined,
      location: editForm.location || null,
      scheduledAt: editForm.scheduledAt ? new Date(editForm.scheduledAt).toISOString() : null,
    })
  }

  function handleEditHomeTeamChange(teamId: string) {
    setEditForm((prev) => {
      const team = editTeams.find((t) => t.id === teamId)
      return { ...prev, homeTeamId: teamId, location: prev.location || team?.homeVenue || "" }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link + page-level actions (like DetailPageLayout) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          to="/$orgSlug/games"
          params={{ orgSlug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("gameReport.backToGames")}
        </Link>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={openEditSheet}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              {t("gameReport.editGame")}
            </Button>
          )}
          {canComplete && (
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!hasBothLineups || completeGame.isPending}
              onClick={() => setShowCompleteConfirm(true)}
              title={!hasBothLineups ? t("gameReport.completeSection.lineupsRequired") : undefined}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t("gameReport.completeSection.button")}
            </Button>
          )}
          {(isCompleted || isCancelled) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReopenConfirm(true)}
              disabled={reopenGame.isPending}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t("gameReport.reopenSection.button")}
            </Button>
          )}
        </div>
      </div>

      {/* Header */}
      <GameReportHeader game={game as any} />

      {/* Finalized / Cancelled status note */}
      {isCompleted && (
        <p className="text-xs text-muted-foreground">
          {t("gameReport.reopenSection.finalized", {
            date: game.finalizedAt
              ? new Date(game.finalizedAt).toLocaleDateString(i18n.language, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
          })}
        </p>
      )}

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

      {/* Tab bar + inline tab actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TabNavigation
          groups={[
            {
              key: "report-tabs",
              tabs: [
                { id: "lineup" as const, label: t("gameReport.tabs.lineup"), icon: Users },
                { id: "report" as const, label: t("gameReport.tabs.report"), icon: ClipboardList },
                ...(isCompleted && canUseFeature("featureAiRecaps")
                  ? [{ id: "ai" as const, label: t("gameReport.tabs.ai"), icon: Sparkles }]
                  : []),
              ],
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab-specific actions — inline next to tabs */}
        {activeTab === "report" && !readOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={() => timelineRef.current?.openGoalSheet()}
            >
              <CircleDot className="w-3.5 h-3.5" />
              {t("gameReport.addGoalBtn")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
              onClick={() => timelineRef.current?.openPenaltySheet()}
            >
              <Clock className="w-3.5 h-3.5" />
              {t("gameReport.addPenaltyBtn")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
              onClick={() => timelineRef.current?.openNoteSheet()}
            >
              <StickyNote className="w-3.5 h-3.5" />
              {t("gameReport.addNoteBtn")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => timelineRef.current?.openSuspensionSheet()}
            >
              <ShieldBan className="w-3.5 h-3.5" />
              {t("gameReport.addSuspensionBtn")}
            </Button>
          </div>
        )}

        {activeTab === "ai" && isCompleted && canUseFeature("featureAiRecaps") && (
          <Button
            variant="outline"
            size="sm"
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
        )}
      </div>

      {/* ── Full-width tab content ── */}
      {activeTab === "lineup" && (
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
          autoSave={!readOnly}
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

      {/* Edit game details sheet */}
      <Sheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          if (!open && isEditDirty) {
            setConfirmEditClose(true)
          } else {
            setEditSheetOpen(open)
          }
        }}
        dirty={isEditDirty}
        onDirtyClose={() => setConfirmEditClose(true)}
      >
        <SheetContent size="lg">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("gameReport.editGame")}</SheetTitle>
            <SheetDescription>{t("gameReport.editGameDescription")}</SheetDescription>
          </SheetHeader>
          <form onSubmit={submitEditForm} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("gamesPage.form.sections.matchup")}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormField label={t("gamesPage.form.fields.round")} required>
                    <Select
                      value={editForm.roundId || undefined}
                      onValueChange={(v) => setEditForm((p) => ({ ...p, roundId: v }))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t("gamesPage.placeholders.round")} />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={t("gamesPage.form.fields.location")}>
                    <Input
                      list="edit-location-suggestions"
                      value={editForm.location}
                      onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder={t("gamesPage.placeholders.noVenue")}
                    />
                    <datalist id="edit-location-suggestions">
                      {(locationSuggestions ?? []).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <FormField label={t("gamesPage.form.fields.homeTeam")} required>
                    <TeamCombobox
                      teams={editTeams}
                      value={editForm.homeTeamId}
                      onChange={handleEditHomeTeamChange}
                      placeholder={t("gamesPage.placeholders.homeTeam")}
                    />
                  </FormField>
                  <FormField label={t("gamesPage.form.fields.awayTeam")} required>
                    <TeamCombobox
                      teams={editTeams}
                      value={editForm.awayTeamId}
                      onChange={(teamId) => setEditForm((p) => ({ ...p, awayTeamId: teamId }))}
                      placeholder={t("gamesPage.placeholders.awayTeam")}
                    />
                  </FormField>
                </div>
              </div>

              <hr className="border-border/60" />

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("gamesPage.form.sections.schedule")}
                </Label>
                <div className="mt-2">
                  <FormField label={t("gamesPage.form.fields.scheduledAt")}>
                    <Input
                      type="datetime-local"
                      value={editForm.scheduledAt}
                      onChange={(e) => setEditForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    />
                  </FormField>
                </div>
              </div>
            </SheetBody>
            <SheetFooter>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isEditDirty) setConfirmEditClose(true)
                  else setEditSheetOpen(false)
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={updateGameDetails.isPending}>
                {updateGameDetails.isPending ? t("saving") : t("save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Unsaved edit changes confirmation */}
      <ConfirmDialog
        open={confirmEditClose}
        onOpenChange={setConfirmEditClose}
        title={t("unsavedChanges.title", { defaultValue: "Unsaved changes" })}
        description={t("unsavedChanges.description", {
          defaultValue: "You have unsaved changes. Do you really want to close?",
        })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Discard" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmEditClose(false)
          setEditSheetOpen(false)
        }}
      />
    </div>
  )
}
