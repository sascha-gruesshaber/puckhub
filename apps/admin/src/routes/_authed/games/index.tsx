import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Label,
  toast,
} from "@puckhub/ui"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Ban, CalendarDays, ClipboardList, Pencil, Plus, RotateCcw, Sparkles, Trash2, Trophy } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { GameStatusBadge } from "~/components/gameStatusBadge"
import { CountSkeleton } from "~/components/skeletons/countSkeleton"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { TeamCombobox } from "~/components/teamCombobox"
import { TeamFilterPills } from "~/components/teamFilterPills"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { FILTER_ALL } from "~/lib/search-params"

const roundTypeOrder: Record<string, number> = {
  regular: 0,
  preround: 1,
  playoffs: 2,
  playdowns: 3,
  relegation: 4,
  placement: 5,
  final: 6,
}

interface GameForm {
  roundId: string
  homeTeamId: string
  awayTeamId: string
  venueId: string
  scheduledAt: string
}

const emptyGameForm: GameForm = {
  roundId: "",
  homeTeamId: "",
  awayTeamId: "",
  venueId: "",
  scheduledAt: "",
}

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

export const Route = createFileRoute("/_authed/games/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; team?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.venue.list.ensureData()
  },
  component: GamesPage,
})

function GamesPage() {
  const { t, i18n } = useTranslation("common")
  const { season } = useWorkingSeason()
  const utils = trpc.useUtils()

  const { search: searchParam, team } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const teamFilter = team ?? FILTER_ALL
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setTeamFilter = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, team: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )

  const [gameDialogOpen, setGameDialogOpen] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null)
  const [cancelGameId, setCancelGameId] = useState<string | null>(null)
  const [reopenGameId, setReopenGameId] = useState<string | null>(null)
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm)
  const [showMidnightConfirm, setShowMidnightConfirm] = useState(false)

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateDivisionId, setGenerateDivisionId] = useState("")
  const [generateRoundId, setGenerateRoundId] = useState("")
  const [generateStartAt, setGenerateStartAt] = useState("")
  const [generateCadenceDays, setGenerateCadenceDays] = useState("7")

  const { data: structure, isLoading: isStructureLoading } = trpc.season.getFullStructure.useQuery(
    { id: season?.id ?? "" },
    { enabled: !!season?.id },
  )
  const { data: venues } = trpc.venue.list.useQuery()
  const { data: games, isLoading } = trpc.game.listForSeason.useQuery(
    {
      seasonId: season?.id ?? "",
      teamId: teamFilter !== FILTER_ALL ? teamFilter : undefined,
    },
    { enabled: !!season?.id },
  )

  const createGame = trpc.game.create.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setGameDialogOpen(false)
      setGameForm(emptyGameForm)
      toast.success(t("gamesPage.toast.gameCreated"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: e.message }),
  })
  const updateGame = trpc.game.update.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setGameDialogOpen(false)
      setEditingGameId(null)
      setGameForm(emptyGameForm)
      toast.success(t("gamesPage.toast.gameUpdated"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: e.message }),
  })
  const deleteGame = trpc.game.delete.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setDeleteGameId(null)
      toast.success(t("gamesPage.toast.gameDeleted"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: e.message }),
  })
  const cancelGame = trpc.game.cancel.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setCancelGameId(null)
      toast.success(t("gamesPage.toast.gameCancelled"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: e.message }),
  })
  const reopenGame = trpc.game.reopen.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setReopenGameId(null)
      toast.success(t("gamesPage.toast.gameReopened"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: e.message }),
  })
  const generate = trpc.game.generateDoubleRoundRobin.useMutation({
    onSuccess: (r) => {
      utils.game.listForSeason.invalidate()
      setGenerateDialogOpen(false)
      toast.success(t("gamesPage.toast.scheduleGenerated"), {
        description: t("gamesPage.toast.scheduleGeneratedDescription", {
          created: r.createdCount,
          skipped: r.skippedExisting,
        }),
      })
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: e.message }),
  })

  const divisions = structure?.divisions ?? []
  const rounds = structure?.rounds ?? []
  const teams = useMemo(() => {
    const m = new Map<
      string,
      {
        id: string
        name: string
        shortName: string
        logoUrl: string | null
        defaultVenueId?: string | null
      }
    >()
    for (const ta of structure?.teamAssignments ?? []) {
      m.set(ta.team.id, {
        id: ta.team.id,
        name: ta.team.name,
        shortName: ta.team.shortName,
        logoUrl: ta.team.logoUrl ?? null,
        defaultVenueId: ta.team.defaultVenueId,
      })
    }
    return Array.from(m.values())
  }, [structure])

  const filteredGames = useMemo(() => {
    if (!games) return []
    if (!search.trim()) return games
    const q = search.toLowerCase()
    return games.filter(
      (g) =>
        g.homeTeam.name.toLowerCase().includes(q) ||
        g.awayTeam.name.toLowerCase().includes(q) ||
        g.round.name.toLowerCase().includes(q),
    )
  }, [games, search])

  const stats = useMemo(() => {
    const all = games ?? []
    return {
      total: all.length,
      completed: all.filter((g) => g.status === "completed").length,
      unscheduled: all.filter((g) => !g.scheduledAt).length,
    }
  }, [games])

  const groupedGames = useMemo(() => {
    const groups = new Map<
      string,
      {
        divisionId: string
        divisionName: string
        divisionSortOrder: number
        roundType: string
        games: typeof filteredGames
      }
    >()

    for (const game of filteredGames) {
      const key = `${game.round.division.id}::${game.round.roundType}`
      if (!groups.has(key)) {
        groups.set(key, {
          divisionId: game.round.division.id,
          divisionName: game.round.division.name,
          divisionSortOrder: game.round.division.sortOrder ?? 0,
          roundType: game.round.roundType,
          games: [],
        })
      }
      groups.get(key)?.games.push(game)
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        games: [...group.games].sort((a, b) => {
          const aDate = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
          const bDate = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
          if (aDate !== bDate) return aDate - bDate
          if (a.round.sortOrder !== b.round.sortOrder) return a.round.sortOrder - b.round.sortOrder
          return a.round.name.localeCompare(b.round.name)
        }),
      }))
      .sort((a, b) => {
        if (a.divisionSortOrder !== b.divisionSortOrder) return a.divisionSortOrder - b.divisionSortOrder
        const divisionCmp = a.divisionName.localeCompare(b.divisionName)
        if (divisionCmp !== 0) return divisionCmp
        return (roundTypeOrder[a.roundType] ?? 999) - (roundTypeOrder[b.roundType] ?? 999)
      })
  }, [filteredGames])

  if (!season) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title={t("gamesPage.noSeason.title")}
        description={t("gamesPage.noSeason.description")}
      />
    )
  }

  function openCreateGame() {
    setEditingGameId(null)
    setGameForm({ ...emptyGameForm, roundId: rounds[0]?.id ?? "" })
    setGameDialogOpen(true)
  }

  function openEditGame(gameId: string) {
    const game = filteredGames.find((g) => g.id === gameId)
    if (!game) return
    setEditingGameId(game.id)
    setGameForm({
      roundId: game.roundId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      venueId: game.venueId ?? "",
      scheduledAt: toLocalInputValue(game.scheduledAt),
    })
    setGameDialogOpen(true)
  }

  function submitGame(e: React.FormEvent) {
    e.preventDefault()
    if (!gameForm.roundId || !gameForm.homeTeamId || !gameForm.awayTeamId) return

    // Check if time is 00:00 (midnight) and ask for confirmation
    if (gameForm.scheduledAt) {
      const scheduledDate = new Date(gameForm.scheduledAt)
      const hours = scheduledDate.getHours()
      const minutes = scheduledDate.getMinutes()

      if (hours === 0 && minutes === 0) {
        setShowMidnightConfirm(true)
        return
      }
    }

    saveGame()
  }

  function saveGame() {
    const base = {
      roundId: gameForm.roundId,
      homeTeamId: gameForm.homeTeamId,
      awayTeamId: gameForm.awayTeamId,
      venueId: gameForm.venueId || undefined,
      scheduledAt: gameForm.scheduledAt ? new Date(gameForm.scheduledAt).toISOString() : undefined,
    }
    if (!editingGameId) {
      createGame.mutate(base)
      return
    }
    updateGame.mutate({
      id: editingGameId,
      ...base,
      venueId: gameForm.venueId || null,
      scheduledAt: gameForm.scheduledAt ? new Date(gameForm.scheduledAt).toISOString() : null,
    })
  }

  function handleHomeTeamChange(teamId: string) {
    setGameForm((prev) => {
      const team = teams.find((entry) => entry.id === teamId)
      return {
        ...prev,
        homeTeamId: teamId,
        venueId: prev.venueId || team?.defaultVenueId || "",
      }
    })
  }

  function formatWhen(game: NonNullable<typeof filteredGames>[number]) {
    return game.scheduledAt
      ? new Date(game.scheduledAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })
      : t("gamesPage.noDate")
  }

  function formatWhere(game: NonNullable<typeof filteredGames>[number]) {
    return [game.venue?.name, game.venue?.city].filter(Boolean).join(", ") || t("gamesPage.placeholders.noVenue")
  }

  return (
    <>
      <DataPageLayout
        title={t("gamesPage.title")}
        description={t("gamesPage.description", { season: season.name })}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setGenerateDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("gamesPage.actions.generate")}
            </Button>
            <Button variant="accent" onClick={openCreateGame}>
              <Plus className="mr-2 h-4 w-4" />
              {t("gamesPage.actions.newGame")}
            </Button>
          </div>
        }
        filters={
          isStructureLoading ? (
            <FilterPillsSkeleton />
          ) : (
            <TeamFilterPills
              teams={teams}
              activeFilter={teamFilter}
              onFilterChange={setTeamFilter}
              showAll
              translationPrefix="gamesPage.filters"
              seasonId={season?.id}
            />
          )
        }
        search={{ value: search, onChange: setSearch, placeholder: t("gamesPage.searchPlaceholder") }}
        count={
          isLoading ? (
            <CountSkeleton />
          ) : (
            <div className="text-sm text-muted-foreground">
              {teamFilter !== FILTER_ALL ? `${filteredGames.length} / ` : ""}
              {t("gamesPage.count", { total: stats.total, completed: stats.completed, unscheduled: stats.unscheduled })}
            </div>
          )
        }
      >
        <div>
          {isLoading ? (
            <DataListSkeleton rows={5} />
          ) : groupedGames.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden px-4 py-6 text-sm text-muted-foreground">
              {search.trim() ? t("noResults.subtitle") : t("gamesPage.noScheduledGames")}
            </div>
          ) : (
            (() => {
              let rowIndex = 0
              return groupedGames.map((group, groupIndex) => (
                <div
                  key={`${group.divisionId}::${group.roundType}`}
                  className={`data-section ${groupIndex > 0 ? "mt-10" : ""}`}
                  style={{ "--section-index": groupIndex } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3 mb-3 pl-3 border-l-3 border-l-primary/40">
                    <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                      {group.divisionName}
                    </h3>
                    <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                      {t(`seasonStructure.roundTypes.${group.roundType}`)}
                    </span>
                    <div className="flex-1" />
                    <span className="text-xs font-semibold rounded-md px-2 py-0.5 bg-secondary text-secondary-foreground">
                      {group.games.length}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
                    {group.games.map((g, i) => (
                      <div
                        key={g.id}
                        className={`data-row group px-4 py-4 hover:bg-accent/5 transition-colors ${i < group.games.length - 1 ? "border-b border-border/40" : ""}`}
                        style={{ "--row-index": rowIndex++ } as React.CSSProperties}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-14">
                          <div className="min-w-0 flex items-center justify-center lg:justify-start gap-4">
                            {(() => {
                              const done = g.status === "completed"
                              const hWins =
                                done && g.homeScore != null && g.awayScore != null && g.homeScore > g.awayScore
                              const aWins =
                                done && g.homeScore != null && g.awayScore != null && g.awayScore > g.homeScore
                              return (
                                <>
                                  <TeamHoverCard
                                    teamId={g.homeTeam.id}
                                    name={g.homeTeam.name}
                                    shortName={g.homeTeam.shortName}
                                    logoUrl={g.homeTeam.logoUrl}
                                    seasonId={season.id}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 cursor-default">
                                      <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
                                        {g.homeTeam.logoUrl ? (
                                          <img
                                            src={g.homeTeam.logoUrl}
                                            alt=""
                                            className="h-full w-full object-contain"
                                          />
                                        ) : null}
                                        {hWins && (
                                          <span className="absolute -top-1 -right-1 inline-flex items-center p-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 ring-2 ring-white dark:ring-gray-900">
                                            <Trophy className="w-2.5 h-2.5" />
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-base font-semibold leading-tight text-foreground truncate">
                                        {g.homeTeam.shortName}
                                      </div>
                                    </div>
                                  </TeamHoverCard>

                                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-semibold text-center">
                                    vs.
                                  </div>

                                  <TeamHoverCard
                                    teamId={g.awayTeam.id}
                                    name={g.awayTeam.name}
                                    shortName={g.awayTeam.shortName}
                                    logoUrl={g.awayTeam.logoUrl}
                                    seasonId={season.id}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 cursor-default">
                                      <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
                                        {g.awayTeam.logoUrl ? (
                                          <img
                                            src={g.awayTeam.logoUrl}
                                            alt=""
                                            className="h-full w-full object-contain"
                                          />
                                        ) : null}
                                        {aWins && (
                                          <span className="absolute -top-1 -right-1 inline-flex items-center p-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 ring-2 ring-white dark:ring-gray-900">
                                            <Trophy className="w-2.5 h-2.5" />
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-base font-semibold leading-tight text-foreground truncate">
                                        {g.awayTeam.shortName}
                                      </div>
                                    </div>
                                  </TeamHoverCard>
                                </>
                              )
                            })()}
                          </div>

                          <div className="min-w-0 text-center">
                            <div className="text-xl font-extrabold tabular-nums text-foreground whitespace-nowrap">
                              {g.homeScore == null || g.awayScore == null ? "- : -" : `${g.homeScore} : ${g.awayScore}`}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate mb-1">
                              {g.round.name} • {t(`seasonStructure.roundTypes.${g.round.roundType}`)}
                            </div>
                            <GameStatusBadge status={g.status} scheduledAt={g.scheduledAt} venueId={g.venueId} t={t} />
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm text-muted-foreground">
                              <div className="truncate">{formatWhen(g)}</div>
                              <div className="truncate">{formatWhere(g)}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap lg:ml-auto">
                            {g.status !== "completed" && g.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditGame(g.id)}
                                className="text-xs h-8 px-2 md:px-3"
                              >
                                <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("gamesPage.actions.edit")}</span>
                              </Button>
                            )}
                            {g.status !== "cancelled" && (
                              <Link to="/games/$gameId/report" params={{ gameId: g.id }}>
                                <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                                  <ClipboardList className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                  <span className="hidden md:inline">{t("gamesPage.actions.report")}</span>
                                </Button>
                              </Link>
                            )}
                            {g.status === "scheduled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-2 md:px-3 text-amber-600 hover:text-amber-700"
                                onClick={() => setCancelGameId(g.id)}
                              >
                                <Ban className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("gamesPage.actions.cancelGame")}</span>
                              </Button>
                            )}
                            {(g.status === "completed" || g.status === "cancelled") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-2 md:px-3"
                                onClick={() => setReopenGameId(g.id)}
                              >
                                <RotateCcw className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("gamesPage.actions.reopenGame")}</span>
                              </Button>
                            )}
                            {g.status !== "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                                onClick={() => setDeleteGameId(g.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("gamesPage.actions.delete")}</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()
          )}
        </div>
      </DataPageLayout>

      <Dialog
        open={gameDialogOpen}
        onOpenChange={(open) => {
          setGameDialogOpen(open)
          if (!open) {
            utils.game.listForSeason.invalidate()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setGameDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingGameId ? t("gamesPage.dialogs.gameEditTitle") : t("gamesPage.dialogs.gameNewTitle")}
            </DialogTitle>
            <DialogDescription>{t("gamesPage.dialogs.gameDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitGame} className="space-y-6 p-6 pt-2">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("gamesPage.form.sections.matchup", { defaultValue: "Matchup" })}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label={t("gamesPage.form.fields.round", { defaultValue: "Round" })} required>
                  <select
                    value={gameForm.roundId}
                    onChange={(e) => setGameForm((p) => ({ ...p, roundId: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("gamesPage.placeholders.round")}</option>
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("gamesPage.form.fields.venue", { defaultValue: "Venue" })}>
                  <select
                    value={gameForm.venueId}
                    onChange={(e) => setGameForm((p) => ({ ...p, venueId: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("gamesPage.placeholders.noVenue")}</option>
                    {(venues ?? []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField label={t("gamesPage.form.fields.homeTeam", { defaultValue: "Home team" })} required>
                  <TeamCombobox
                    teams={teams}
                    value={gameForm.homeTeamId}
                    onChange={handleHomeTeamChange}
                    placeholder={t("gamesPage.placeholders.homeTeam")}
                  />
                </FormField>
                <FormField label={t("gamesPage.form.fields.awayTeam", { defaultValue: "Away team" })} required>
                  <TeamCombobox
                    teams={teams}
                    value={gameForm.awayTeamId}
                    onChange={(teamId) => setGameForm((p) => ({ ...p, awayTeamId: teamId }))}
                    placeholder={t("gamesPage.placeholders.awayTeam")}
                  />
                </FormField>
              </div>
            </div>

            <hr className="border-border/60" />

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("gamesPage.form.sections.schedule", { defaultValue: "Schedule" })}
              </Label>
              <div className="mt-2">
                <FormField label={t("gamesPage.form.fields.scheduledAt", { defaultValue: "Date and time" })}>
                  <Input
                    type="datetime-local"
                    value={gameForm.scheduledAt}
                    min={toLocalInputValue(season.seasonStart)}
                    max={toLocalInputValue(season.seasonEnd)}
                    onChange={(e) => setGameForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                  />
                </FormField>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGameDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={createGame.isPending || updateGame.isPending}>
                {editingGameId ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClick={() => setGenerateDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t("gamesPage.dialogs.generateTitle")}</DialogTitle>
            <DialogDescription>{t("gamesPage.dialogs.generateDescription")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!season?.id || !generateDivisionId || !generateRoundId) return
              generate.mutate({
                seasonId: season.id,
                divisionId: generateDivisionId,
                roundId: generateRoundId,
                schedulingTemplate: generateStartAt
                  ? {
                      startAt: new Date(generateStartAt).toISOString(),
                      cadenceDays: Math.max(1, Number(generateCadenceDays) || 7),
                    }
                  : undefined,
              })
            }}
            className="space-y-6 p-6 pt-2"
          >
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("gamesPage.generate.sections.target")}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label={t("gamesPage.generate.fields.division")} required>
                  <select
                    value={generateDivisionId}
                    onChange={(e) => {
                      setGenerateDivisionId(e.target.value)
                      setGenerateRoundId("")
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("gamesPage.placeholders.division")}</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("gamesPage.form.fields.round")} required>
                  <select
                    value={generateRoundId}
                    onChange={(e) => setGenerateRoundId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("gamesPage.placeholders.round")}</option>
                    {rounds
                      .filter((r) => !generateDivisionId || r.divisionId === generateDivisionId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </FormField>
              </div>
            </div>

            <hr className="border-border/60" />

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("gamesPage.generate.sections.scheduling")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{t("gamesPage.generate.schedulingHint")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t("gamesPage.generate.fields.startDate")}>
                  <Input
                    type="datetime-local"
                    value={generateStartAt}
                    onChange={(e) => setGenerateStartAt(e.target.value)}
                  />
                </FormField>
                <FormField
                  label={t("gamesPage.generate.fields.cadenceDays")}
                  description={t("gamesPage.generate.fields.cadenceDaysHint")}
                >
                  <Input
                    type="number"
                    min={1}
                    value={generateCadenceDays}
                    onChange={(e) => setGenerateCadenceDays(e.target.value)}
                    placeholder="7"
                  />
                </FormField>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={generate.isPending || !generateDivisionId || !generateRoundId}
              >
                {t("gamesPage.actions.generate")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteGameId}
        onOpenChange={(o) => !o && setDeleteGameId(null)}
        title={t("gamesPage.dialogs.deleteGameTitle")}
        description={t("gamesPage.dialogs.deleteGameDescription")}
        confirmLabel={t("gamesPage.actions.delete")}
        variant="destructive"
        isPending={deleteGame.isPending}
        onConfirm={() => {
          if (deleteGameId) deleteGame.mutate({ id: deleteGameId })
        }}
      />

      <ConfirmDialog
        open={!!cancelGameId}
        onOpenChange={(o) => !o && setCancelGameId(null)}
        title={t("gamesPage.dialogs.cancelGameTitle")}
        description={t("gamesPage.dialogs.cancelGameDescription")}
        confirmLabel={t("gamesPage.actions.cancelGame")}
        variant="destructive"
        isPending={cancelGame.isPending}
        onConfirm={() => {
          if (cancelGameId) cancelGame.mutate({ id: cancelGameId })
        }}
      />

      <ConfirmDialog
        open={!!reopenGameId}
        onOpenChange={(o) => !o && setReopenGameId(null)}
        title={t("gamesPage.dialogs.reopenGameTitle")}
        description={t("gamesPage.dialogs.reopenGameDescription")}
        confirmLabel={t("gamesPage.actions.reopenGame")}
        isPending={reopenGame.isPending}
        onConfirm={() => {
          if (reopenGameId) reopenGame.mutate({ id: reopenGameId })
        }}
      />

      <ConfirmDialog
        open={showMidnightConfirm}
        onOpenChange={setShowMidnightConfirm}
        title={t("gamesPage.dialogs.midnightConfirmTitle", { defaultValue: "Spiel um 00:00 Uhr?" })}
        description={t("gamesPage.dialogs.midnightConfirmDescription", {
          defaultValue:
            "Die Startzeit ist auf 00:00 Uhr (Mitternacht) gesetzt. Möchtest du das Spiel wirklich zu dieser Zeit ansetzen?",
        })}
        confirmLabel={t("gamesPage.dialogs.midnightConfirmButton", { defaultValue: "Ja, um 00:00 Uhr" })}
        cancelLabel={t("gamesPage.dialogs.midnightCancelButton", { defaultValue: "Nein, Zeit ändern" })}
        isPending={createGame.isPending || updateGame.isPending}
        onConfirm={() => {
          setShowMidnightConfirm(false)
          saveGame()
        }}
      />
    </>
  )
}
