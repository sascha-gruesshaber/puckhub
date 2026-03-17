import {
  Button,
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
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router"
import { CalendarDays, FileText, Plus, Sparkles } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterBar, FilterBarDivider } from "~/components/filterBar"
import { FilterDropdown } from "~/components/filterDropdown"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { GameStatusBadge, deriveDisplayStatus } from "~/components/gameStatusBadge"
import type { DisplayStatus } from "~/components/gameStatusBadge"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"

import { TeamCombobox } from "~/components/teamCombobox"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

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
  location: string
  scheduledAt: string
}

const emptyGameForm: GameForm = {
  roundId: "",
  homeTeamId: "",
  awayTeamId: "",
  location: "",
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

export const Route = createFileRoute("/_authed/$orgSlug/games/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; team?: string; status?: string; tab?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
    ...(typeof s.status === "string" && s.status ? { status: s.status } : {}),
    ...(typeof s.tab === "string" && s.tab ? { tab: s.tab } : {}),
  }),
  component: GamesPage,
})

function GamesPage() {
  usePermissionGuard("games")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t, i18n } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { season } = useWorkingSeason()
  const utils = trpc.useUtils()

  const { search: searchParam, team, status: statusParam, tab: tabParam } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const activeTab = tabParam ?? "all"
  const teamFilter = useMemo(() => (team ? team.split(",") : []), [team])
  const statusFilter = useMemo(() => (statusParam ? statusParam.split(",") : []), [statusParam])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setTeamFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, team: v.join(",") || undefined }), replace: true }),
    [navigate],
  )
  const setStatusFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, status: v.join(",") || undefined }), replace: true }),
    [navigate],
  )
  const setTab = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, tab: v === "all" ? undefined : v }), replace: true }),
    [navigate],
  )

  const [gameDialogOpen, setGameDialogOpen] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm)
  const [showMidnightConfirm, setShowMidnightConfirm] = useState(false)
  const [confirmGameCloseOpen, setConfirmGameCloseOpen] = useState(false)

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [confirmGenerateCloseOpen, setConfirmGenerateCloseOpen] = useState(false)
  const [generateDivisionId, setGenerateDivisionId] = useState("")
  const [generateRoundId, setGenerateRoundId] = useState("")
  const [generateStartAt, setGenerateStartAt] = useState("")
  const [generateCadenceDays, setGenerateCadenceDays] = useState("7")

  const { data: structure, isLoading: isStructureLoading } = trpc.season.getFullStructure.useQuery(
    { id: season?.id ?? "" },
    { enabled: !!season?.id },
  )
  const { data: locationSuggestions } = trpc.game.locationSuggestions.useQuery()
  const { data: games, isLoading } = trpc.game.listForSeason.useQuery(
    { seasonId: season?.id ?? "" },
    { enabled: !!season?.id },
  )

  const createGame = trpc.game.create.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setGameDialogOpen(false)
      setGameForm(emptyGameForm)
      toast.success(t("gamesPage.toast.gameCreated"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
  })
  const updateGame = trpc.game.update.useMutation({
    onSuccess: () => {
      utils.game.listForSeason.invalidate()
      setGameDialogOpen(false)
      setEditingGameId(null)
      setGameForm(emptyGameForm)
      toast.success(t("gamesPage.toast.gameUpdated"))
    },
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
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
    onError: (e) => toast.error(t("gamesPage.toast.error"), { description: resolveTranslatedError(e, tErrors) }),
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
        homeVenue?: string | null
      }
    >()
    for (const ta of structure?.teamAssignments ?? []) {
      m.set(ta.team.id, {
        id: ta.team.id,
        name: ta.team.name,
        shortName: ta.team.shortName,
        logoUrl: ta.team.logoUrl ?? null,
        homeVenue: ta.team.homeVenue,
      })
    }
    return Array.from(m.values())
  }, [structure])

  const teamOptions: FilterDropdownOption[] = useMemo(
    () =>
      [...teams]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((team) => ({
          value: team.id,
          label: team.shortName,
          icon: team.logoUrl ? (
            <img src={team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
          ) : (
            <div className="h-5 w-5 rounded-sm flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground">
              {team.shortName.slice(0, 2).toUpperCase()}
            </div>
          ),
        })),
    [teams],
  )

  const allDisplayStatuses: DisplayStatus[] = [
    "scheduled",
    "in_progress",
    "completed",
    "postponed",
    "cancelled",
    "incomplete",
    "report_pending",
  ]
  const statusOptions: FilterDropdownOption[] = useMemo(
    () => allDisplayStatuses.map((s) => ({ value: s, label: t(`gamesPage.status.${s}`) })),
    [t],
  )

  // Build round filter options for FilterDropdown
  const roundFilterOptions: FilterDropdownOption[] = useMemo(() => {
    if (divisions.length === 0 || rounds.length === 0) return []
    if (rounds.length <= 1) return []

    const showLabels = divisions.length > 1
    return rounds.map((r) => {
      const div = divisions.find((d) => d.id === r.divisionId)
      return {
        value: `${r.divisionId}::${r.id}`,
        label: showLabels && div ? `${div.name} – ${r.name}` : r.name,
      }
    })
  }, [divisions, rounds])

  const filteredGames = useMemo(() => {
    let result = games ?? []
    // Tab filter by division::roundId
    if (activeTab !== "all") {
      const roundId = activeTab.split("::")[1]
      result = result.filter((g) => g.roundId === roundId)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (g) =>
          g.homeTeam.name.toLowerCase().includes(q) ||
          g.awayTeam.name.toLowerCase().includes(q) ||
          g.round.name.toLowerCase().includes(q),
      )
    }
    if (teamFilter.length > 0) {
      result = result.filter((g) => teamFilter.includes(g.homeTeamId) || teamFilter.includes(g.awayTeamId))
    }
    if (statusFilter.length > 0) {
      result = result.filter((g) => statusFilter.includes(deriveDisplayStatus(g.status, g.scheduledAt, g.location)))
    }
    return result
  }, [games, search, teamFilter, statusFilter, activeTab])

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

  const isGameDirty = gameForm.homeTeamId !== "" || gameForm.awayTeamId !== ""
  const isGenerateDirty = generateDivisionId !== "" || generateRoundId !== ""

  function closeGameDialog() {
    setGameDialogOpen(false)
    if (!editingGameId) setGameForm(emptyGameForm)
  }

  function closeGenerateDialog() {
    setGenerateDialogOpen(false)
  }

  function openCreateGame() {
    setEditingGameId(null)
    setGameForm({ ...emptyGameForm, roundId: rounds[0]?.id ?? "" })
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
      location: gameForm.location || undefined,
      scheduledAt: gameForm.scheduledAt ? new Date(gameForm.scheduledAt).toISOString() : undefined,
    }
    if (!editingGameId) {
      createGame.mutate(base)
      return
    }
    updateGame.mutate({
      id: editingGameId,
      ...base,
      location: gameForm.location || null,
      scheduledAt: gameForm.scheduledAt ? new Date(gameForm.scheduledAt).toISOString() : null,
    })
  }

  function handleHomeTeamChange(teamId: string) {
    setGameForm((prev) => {
      const team = teams.find((entry) => entry.id === teamId)
      return {
        ...prev,
        homeTeamId: teamId,
        location: prev.location || team?.homeVenue || "",
      }
    })
  }

  function formatWhen(game: NonNullable<typeof filteredGames>[number]) {
    return game.scheduledAt
      ? new Date(game.scheduledAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })
      : t("gamesPage.noDate")
  }

  function formatWhere(game: NonNullable<typeof filteredGames>[number]) {
    return game.location || t("gamesPage.placeholders.noVenue")
  }

  return (
    <>
      <DataPageLayout
        title={t("gamesPage.title")}
        description={t("gamesPage.description", { season: season.name })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/$orgSlug/games/public-reports" params={{ orgSlug }}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("publicReports.title")}</span>
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(true)}>
              <Sparkles className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("gamesPage.actions.generate")}</span>
            </Button>
            <Button variant="accent" onClick={openCreateGame}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("gamesPage.actions.newGame")}</span>
            </Button>
          </div>
        }
        filters={
          <>
            {isStructureLoading ? (
              <FilterPillsSkeleton />
            ) : (
              <FilterBar
                label={t("filters")}
                search={{ value: search, onChange: setSearch, placeholder: t("gamesPage.searchPlaceholder") }}
              >
                {roundFilterOptions.length > 0 && (
                  <FilterDropdown
                    label={t("gamesPage.tabs.all")}
                    options={roundFilterOptions}
                    value={activeTab === "all" ? [] : [activeTab]}
                    onChange={(selected) => setTab(selected[0] ?? "all")}
                    singleSelect
                  />
                )}
                <FilterDropdown
                  label={t("gamesPage.filters.allTeams")}
                  options={teamOptions}
                  value={teamFilter}
                  onChange={setTeamFilter}
                  testId="games-team-filter"
                  optionTestIdPrefix="games-team-filter-option"
                />
                <FilterBarDivider />
                <FilterDropdown
                  label={t("gamesPage.filters.allStatus")}
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  testId="games-status-filter"
                  optionTestIdPrefix="games-status-filter-option"
                />
              </FilterBar>
            )}
          </>
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
                  className={`data-section ${groupIndex > 0 ? `mt-10` : ``}`}
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
                  <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden lg:grid lg:grid-cols-[1fr_auto_1fr_auto_auto] lg:gap-x-4">
                    {group.games.map((g, i) => (
                      <div
                        key={g.id}
                        data-testid="game-row"
                        data-game-status={g.status}
                        onClick={() => navigate({ to: '/$orgSlug/games/$gameId/report', params: { orgSlug, gameId: g.id } })}
                        className={`data-row group px-4 py-4 hover:bg-accent/5 transition-colors cursor-pointer lg:col-span-full lg:grid lg:grid-cols-[subgrid] lg:items-center ${i < group.games.length - 1 ? `border-b border-border/40` : ``}`}
                        style={{ "--row-index": rowIndex++ } as React.CSSProperties}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            navigate({ to: '/$orgSlug/games/$gameId/report', params: { orgSlug, gameId: g.id } })
                          }
                        }}
                      >
                        <div className="space-y-3 lg:space-y-0 lg:contents">
                          {(() => {
                            const done = g.status === "completed"
                            const hWins =
                              done && g.homeScore != null && g.awayScore != null && g.homeScore > g.awayScore
                            const aWins =
                              done && g.homeScore != null && g.awayScore != null && g.awayScore > g.homeScore
                            return (
                              <>
                                {/* Matchup row: horizontal flex on mobile, contents on desktop so children become grid cells */}
                                <div className="flex items-center gap-2 lg:contents">
                                  {/* Home team – right-aligned on desktop (scoreboard style) */}
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                                    <span
                                      className={`text-sm leading-tight truncate text-right ${hWins ? `font-bold text-emerald-600 dark:text-emerald-400` : done ? `font-medium text-muted-foreground` : `font-semibold text-foreground`}`}
                                    >
                                      {g.homeTeam.shortName}
                                    </span>
                                    <div className="h-9 w-9 shrink-0 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                                      {g.homeTeam.logoUrl ? (
                                        <img
                                          src={g.homeTeam.logoUrl}
                                          alt=""
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-[11px] font-bold text-muted-foreground/60">
                                          {g.homeTeam.shortName.slice(0, 2)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Score block – centered */}
                                  <div className="shrink-0 text-center min-w-[6.5rem] px-1">
                                    <div className="text-xl font-extrabold tabular-nums whitespace-nowrap">
                                      <span className={hWins ? "text-emerald-600 dark:text-emerald-400" : ""}>
                                        {g.homeScore ?? "-"}
                                      </span>
                                      <span className="text-muted-foreground/40 mx-1.5">:</span>
                                      <span className={aWins ? "text-emerald-600 dark:text-emerald-400" : ""}>
                                        {g.awayScore ?? "-"}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate mb-1">
                                      {g.round.name} • {t(`seasonStructure.roundTypes.${g.round.roundType}`)}
                                    </div>
                                    <GameStatusBadge
                                      status={g.status}
                                      scheduledAt={g.scheduledAt}
                                      location={g.location}
                                      t={t}
                                    />
                                  </div>

                                  {/* Away team – left-aligned */}
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div className="h-9 w-9 shrink-0 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                                      {g.awayTeam.logoUrl ? (
                                        <img
                                          src={g.awayTeam.logoUrl}
                                          alt=""
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-[11px] font-bold text-muted-foreground/60">
                                          {g.awayTeam.shortName.slice(0, 2)}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`text-sm leading-tight truncate ${aWins ? `font-bold text-emerald-600 dark:text-emerald-400` : done ? `font-medium text-muted-foreground` : `font-semibold text-foreground`}`}
                                    >
                                      {g.awayTeam.shortName}
                                    </span>
                                  </div>
                                </div>

                                {/* Mobile-only: date & location */}
                                <div className="text-center text-xs text-muted-foreground lg:hidden">
                                  {formatWhen(g)} · {formatWhere(g)}
                                </div>

                                {/* Desktop: date & location column */}
                                <div className="hidden lg:block min-w-0 pl-2">
                                  <div className="text-sm text-muted-foreground truncate">{formatWhen(g)}</div>
                                  <div className="text-xs text-muted-foreground/70 truncate">{formatWhere(g)}</div>
                                </div>

                                {/* Status indicator for desktop */}
                                <div className="hidden lg:flex items-center justify-end">
                                  <GameStatusBadge
                                    status={g.status}
                                    scheduledAt={g.scheduledAt}
                                    location={g.location}
                                    t={t}
                                  />
                                </div>
                              </>
                            )
                          })()}
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

      <Sheet
        open={gameDialogOpen}
        onOpenChange={(open) => {
          setGameDialogOpen(open)
          if (!open) {
            utils.game.listForSeason.invalidate()
          }
        }}
        dirty={isGameDirty}
        onDirtyClose={() => setConfirmGameCloseOpen(true)}
      >
        <SheetContent size="lg">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>
              {editingGameId ? t("gamesPage.dialogs.gameEditTitle") : t("gamesPage.dialogs.gameNewTitle")}
            </SheetTitle>
            <SheetDescription>{t("gamesPage.dialogs.gameDescription")}</SheetDescription>
          </SheetHeader>
          <form onSubmit={submitGame} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("gamesPage.form.sections.matchup", { defaultValue: "Matchup" })}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormField label={t("gamesPage.form.fields.round", { defaultValue: "Round" })} required>
                    <Select value={gameForm.roundId || undefined} onValueChange={(v) => setGameForm((p) => ({ ...p, roundId: v }))}>
                      <SelectTrigger className="h-10 w-full" data-testid="games-form-round">
                        <SelectValue placeholder={t("gamesPage.placeholders.round")} />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds.map((r) => (
                          <SelectItem key={r.id} value={r.id} data-testid={`games-form-round-option-${r.id}`}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={t("gamesPage.form.fields.location", { defaultValue: "Location" })}>
                    <Input
                      data-testid="games-form-location"
                      list="location-suggestions"
                      value={gameForm.location}
                      onChange={(e) => setGameForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder={t("gamesPage.placeholders.noVenue")}
                    />
                    <datalist id="location-suggestions">
                      {(locationSuggestions ?? []).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <FormField label={t("gamesPage.form.fields.homeTeam", { defaultValue: "Home team" })} required>
                    <TeamCombobox
                      teams={teams}
                      value={gameForm.homeTeamId}
                      onChange={handleHomeTeamChange}
                      placeholder={t("gamesPage.placeholders.homeTeam")}
                      testId="games-form-home-team"
                      optionTestIdPrefix="games-form-home-team-option"
                    />
                  </FormField>
                  <FormField label={t("gamesPage.form.fields.awayTeam", { defaultValue: "Away team" })} required>
                    <TeamCombobox
                      teams={teams}
                      value={gameForm.awayTeamId}
                      onChange={(teamId) => setGameForm((p) => ({ ...p, awayTeamId: teamId }))}
                      placeholder={t("gamesPage.placeholders.awayTeam")}
                      testId="games-form-away-team"
                      optionTestIdPrefix="games-form-away-team-option"
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
                      data-testid="games-form-scheduled-at"
                      type="datetime-local"
                      value={gameForm.scheduledAt}
                      min={toLocalInputValue(season.seasonStart)}
                      max={toLocalInputValue(season.seasonEnd)}
                      onChange={(e) => setGameForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    />
                  </FormField>
                </div>
              </div>
            </SheetBody>
            <SheetFooter>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => { if (isGameDirty) setConfirmGameCloseOpen(true); else closeGameDialog() }}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={createGame.isPending || updateGame.isPending}
                data-testid="games-form-submit"
              >
                {editingGameId ? t("save") : t("create")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={generateDialogOpen} onOpenChange={setGenerateDialogOpen} dirty={isGenerateDirty} onDirtyClose={() => setConfirmGenerateCloseOpen(true)}>
        <SheetContent>
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("gamesPage.dialogs.generateTitle")}</SheetTitle>
            <SheetDescription>{t("gamesPage.dialogs.generateDescription")}</SheetDescription>
          </SheetHeader>
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
            className="flex flex-1 flex-col overflow-hidden"
          >
            <SheetBody className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("gamesPage.generate.sections.target")}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormField label={t("gamesPage.generate.fields.division")} required>
                    <Select value={generateDivisionId || undefined} onValueChange={(v) => { setGenerateDivisionId(v); setGenerateRoundId("") }}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t("gamesPage.placeholders.division")} />
                      </SelectTrigger>
                      <SelectContent>
                        {divisions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={t("gamesPage.form.fields.round")} required>
                    <Select value={generateRoundId || undefined} onValueChange={(v) => setGenerateRoundId(v)}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={t("gamesPage.placeholders.round")} />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds
                          .filter((r) => !generateDivisionId || r.divisionId === generateDivisionId)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
            </SheetBody>
            <SheetFooter>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => { if (isGenerateDirty) setConfirmGenerateCloseOpen(true); else closeGenerateDialog() }}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={generate.isPending || !generateDivisionId || !generateRoundId}
              >
                {t("gamesPage.actions.generate")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialogs */}
      <ConfirmDialog
        open={confirmGameCloseOpen}
        onOpenChange={setConfirmGameCloseOpen}
        title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
        description={t("unsavedChanges.description", { defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?" })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmGameCloseOpen(false)
          closeGameDialog()
          utils.game.listForSeason.invalidate()
        }}
      />

      <ConfirmDialog
        open={confirmGenerateCloseOpen}
        onOpenChange={setConfirmGenerateCloseOpen}
        title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
        description={t("unsavedChanges.description", { defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?" })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmGenerateCloseOpen(false)
          closeGenerateDialog()
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
