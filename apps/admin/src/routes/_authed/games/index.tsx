import deLocale from "@fullcalendar/core/locales/de"
import enGbLocale from "@fullcalendar/core/locales/en-gb"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, { type DropArg, type EventDropArg } from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
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
import { createFileRoute, Link } from "@tanstack/react-router"
import { CalendarDays, ClipboardList, Download, List, Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { CalendarExportDialog } from "~/components/calendarExportDialog"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { TeamCombobox } from "~/components/teamCombobox"
import { FILTER_ALL, TeamFilterPills } from "~/components/teamFilterPills"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { UnscheduledGamesSidebar } from "~/components/unscheduledGamesSidebar"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

type ViewMode = "list" | "calendar"
type GameStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled"

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
  status: GameStatus
  homeScore: string
  awayScore: string
}

const emptyGameForm: GameForm = {
  roundId: "",
  homeTeamId: "",
  awayTeamId: "",
  venueId: "",
  scheduledAt: "",
  status: "scheduled",
  homeScore: "",
  awayScore: "",
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

function toDateOnlyInputValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T00:00`
}

export const Route = createFileRoute("/_authed/games/")({
  component: GamesPage,
})

function GamesPage() {
  const { t, i18n } = useTranslation("common")
  const { season } = useWorkingSeason()
  const utils = trpc.useUtils()

  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState(FILTER_ALL)

  const [gameDialogOpen, setGameDialogOpen] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null)
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm)
  const [showMidnightConfirm, setShowMidnightConfirm] = useState(false)

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateDivisionId, setGenerateDivisionId] = useState("")
  const [generateRoundId, setGenerateRoundId] = useState("")
  const [generateStartAt, setGenerateStartAt] = useState("")
  const [generateCadenceDays, setGenerateCadenceDays] = useState("7")

  const [calendarExportOpen, setCalendarExportOpen] = useState(false)

  const { data: structure } = trpc.season.getFullStructure.useQuery({ id: season?.id ?? "" }, { enabled: !!season?.id })
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
        city?: string | null
        contactName?: string | null
        website?: string | null
        primaryColor: string | null
        defaultVenueId?: string | null
      }
    >()
    for (const ta of structure?.teamAssignments ?? []) {
      m.set(ta.team.id, {
        id: ta.team.id,
        name: ta.team.name,
        shortName: ta.team.shortName,
        logoUrl: ta.team.logoUrl ?? null,
        city: ta.team.city ?? null,
        contactName: ta.team.contactName ?? null,
        website: ta.team.website ?? null,
        primaryColor: ta.team.primaryColor ?? null,
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

  const unscheduledGames = useMemo(() => {
    return filteredGames.filter((g) => !g.scheduledAt)
  }, [filteredGames])

  const gamesById = useMemo(() => {
    const map = new Map()
    for (const game of filteredGames) {
      map.set(game.id, game)
    }
    return map
  }, [filteredGames])

  const stats = useMemo(() => {
    const all = games ?? []
    return {
      total: all.length,
      completed: all.filter((g) => g.status === "completed").length,
      unscheduled: all.filter((g) => !g.scheduledAt).length,
    }
  }, [games])

  const hasUpcomingGames = useMemo(() => {
    return filteredGames.some((g) => g.status === "scheduled" || g.status === "in_progress")
  }, [filteredGames])

  const upcomingGamesCount = useMemo(() => {
    return filteredGames.filter((g) => g.status === "scheduled" || g.status === "in_progress").length
  }, [filteredGames])

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

  const calendarLocale = useMemo(() => (i18n.language.startsWith("de") ? deLocale : enGbLocale), [i18n.language])
  const calendarValidRange = useMemo(() => {
    if (!season) return undefined
    const endExclusive = new Date(new Date(season.seasonEnd).getTime() + 24 * 60 * 60 * 1000)
    return {
      start: new Date(season.seasonStart).toISOString(),
      end: endExclusive.toISOString(),
    }
  }, [season])
  const calendarEvents = useMemo(() => {
    const statusStyles: Record<GameStatus, { backgroundColor: string; borderColor: string; textColor: string }> = {
      scheduled: { backgroundColor: "#eef2ff", borderColor: "#6366f1", textColor: "#1e1b4b" },
      in_progress: { backgroundColor: "#ffedd5", borderColor: "#f97316", textColor: "#7c2d12" },
      completed: { backgroundColor: "#dcfce7", borderColor: "#22c55e", textColor: "#14532d" },
      postponed: { backgroundColor: "#fef3c7", borderColor: "#f59e0b", textColor: "#78350f" },
      cancelled: { backgroundColor: "#fee2e2", borderColor: "#ef4444", textColor: "#7f1d1d" },
    }

    return filteredGames
      .filter((g) => !!g.scheduledAt)
      .map((g) => {
        const style = statusStyles[g.status]
        return {
          id: g.id,
          title: `${g.homeTeam.shortName} vs ${g.awayTeam.shortName}`,
          start: g.scheduledAt!,
          allDay: false,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          textColor: style.textColor,
          extendedProps: {
            status: g.status,
            roundName: g.round.name,
            venueName: g.venue?.name ?? "",
            score: g.homeScore == null || g.awayScore == null ? null : `${g.homeScore}:${g.awayScore}`,
          },
        }
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
      status: game.status,
      homeScore: game.homeScore == null ? "" : String(game.homeScore),
      awayScore: game.awayScore == null ? "" : String(game.awayScore),
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
      status: gameForm.status,
      homeScore: gameForm.homeScore === "" ? null : Number(gameForm.homeScore),
      awayScore: gameForm.awayScore === "" ? null : Number(gameForm.awayScore),
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

  function statusClass(status: GameStatus) {
    if (status === "completed") return "bg-emerald-50 text-emerald-700 border border-emerald-200"
    if (status === "cancelled") return "bg-rose-50 text-rose-700 border border-rose-200"
    if (status === "postponed") return "bg-amber-50 text-amber-700 border border-amber-200"
    if (status === "in_progress") return "bg-orange-50 text-orange-700 border border-orange-200"
    return "bg-slate-50 text-slate-700 border border-slate-200"
  }

  function handleExternalDrop(info: DropArg) {
    const gameId = info.draggedEl.dataset.gameId
    if (!gameId) return

    const game = filteredGames.find((g) => g.id === gameId)
    if (!game) return

    setEditingGameId(game.id)
    setGameForm({
      roundId: game.roundId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      venueId: game.venueId ?? "",
      scheduledAt: toDateOnlyInputValue(info.date),
      status: game.status,
      homeScore: game.homeScore == null ? "" : String(game.homeScore),
      awayScore: game.awayScore == null ? "" : String(game.awayScore),
    })
    setGameDialogOpen(true)
  }

  function handleEventDrop(info: EventDropArg) {
    const gameId = info.event.id
    const game = filteredGames.find((g) => g.id === gameId)
    if (!game) {
      info.revert()
      return
    }

    setEditingGameId(game.id)
    setGameForm({
      roundId: game.roundId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      venueId: game.venueId ?? "",
      scheduledAt: toLocalInputValue(info.event.start!),
      status: game.status,
      homeScore: game.homeScore == null ? "" : String(game.homeScore),
      awayScore: game.awayScore == null ? "" : String(game.awayScore),
    })
    setGameDialogOpen(true)

    // Revert visual change until user confirms in dialog
    info.revert()
  }

  return (
    <>
      <DataPageLayout
        title={t("gamesPage.title")}
        description={t("gamesPage.description", { season: season.name })}
        action={
          <div className="flex items-center gap-2">
            {hasUpcomingGames && (
              <Button variant="outline" onClick={() => setCalendarExportOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                {t("gamesPage.actions.calendarExport")}
              </Button>
            )}
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
          <TeamFilterPills
            teams={teams}
            activeFilter={teamFilter}
            onFilterChange={setTeamFilter}
            showAll
            translationPrefix="gamesPage.filters"
            seasonId={season?.id}
          />
        }
        search={{ value: search, onChange: setSearch, placeholder: t("gamesPage.searchPlaceholder") }}
        count={
          <div className="text-sm text-muted-foreground">
            {teamFilter !== FILTER_ALL ? `${filteredGames.length} / ` : ""}
            {t("gamesPage.count", { total: stats.total, completed: stats.completed, unscheduled: stats.unscheduled })}
          </div>
        }
        rightControls={
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "list" ? "accent" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="mr-1.5 h-4 w-4" />
              {t("gamesPage.views.list")}
            </Button>
            <Button
              variant={viewMode === "calendar" ? "accent" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              {t("gamesPage.views.calendar")}
            </Button>
          </div>
        }
      >
        {viewMode === "list" && (
          <div>
            {isLoading ? (
              <div
                className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden px-4 py-6 text-sm text-muted-foreground"
                suppressHydrationWarning
              >
                {t("loading")}
              </div>
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
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(auto,600px)_minmax(auto,220px)_minmax(auto,280px)_auto] lg:items-center">
                            <div className="min-w-0 flex items-center justify-center gap-4">
                              <TeamHoverCard team={g.homeTeam} seasonId={season.id}>
                                <div className="flex items-center gap-2 min-w-0 cursor-default">
                                  <div className="h-10 w-10 shrink-0 flex items-center justify-center overflow-hidden">
                                    {g.homeTeam.logoUrl ? (
                                      <img src={g.homeTeam.logoUrl} alt="" className="h-full w-full object-contain" />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-base font-semibold leading-tight text-foreground truncate">
                                      {g.homeTeam.shortName}
                                    </div>
                                  </div>
                                </div>
                              </TeamHoverCard>

                              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-semibold text-center">
                                vs.
                              </div>

                              <TeamHoverCard team={g.awayTeam} seasonId={season.id}>
                                <div className="flex items-center gap-2 min-w-0 cursor-default">
                                  <div className="h-10 w-10 shrink-0 flex items-center justify-center overflow-hidden">
                                    {g.awayTeam.logoUrl ? (
                                      <img src={g.awayTeam.logoUrl} alt="" className="h-full w-full object-contain" />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-base font-semibold leading-tight text-foreground truncate">
                                      {g.awayTeam.shortName}
                                    </div>
                                  </div>
                                </div>
                              </TeamHoverCard>
                            </div>

                            <div className="shrink-0 text-center lg:min-w-[180px]">
                              <div className="text-xl font-extrabold tabular-nums text-foreground">
                                {g.homeScore == null || g.awayScore == null
                                  ? "- : -"
                                  : `${g.homeScore} : ${g.awayScore}`}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 truncate mb-1">
                                {g.round.name} • {t(`seasonStructure.roundTypes.${g.round.roundType}`)}
                              </div>
                              <span
                                className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${statusClass(g.status)}`}
                              >
                                {t(`gamesPage.status.${g.status}`)}
                              </span>
                            </div>

                            <div className="lg:min-w-[260px]">
                              <div className="text-sm text-muted-foreground">
                                <div className="truncate max-w-full">{formatWhen(g)}</div>
                                <div className="truncate max-w-full">{formatWhere(g)}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 lg:justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditGame(g.id)}
                                className="text-xs h-8 px-2 md:px-3"
                              >
                                <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("gamesPage.actions.edit")}</span>
                              </Button>
                              <Link to="/games/$gameId/report" params={{ gameId: g.id }}>
                                <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                                  <ClipboardList className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                  <span className="hidden md:inline">{t("gamesPage.actions.report")}</span>
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                                onClick={() => setDeleteGameId(g.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("gamesPage.actions.delete")}</span>
                              </Button>
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
        )}

        {viewMode === "calendar" && (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden relative">
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground" suppressHydrationWarning>
                {t("loading")}
              </div>
            ) : calendarEvents.length === 0 && unscheduledGames.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("gamesPage.noScheduledGames")}</div>
            ) : (
              <div
                className={`[&_td]:border-border/30 [&_.fc]:p-3 [&_.fc-button]:capitalize [&_.fc-button]:text-xs [&_.fc-button]:font-semibold [&_.fc-button-primary]:border-0 [&_.fc-button-primary]:bg-primary [&_.fc-button-primary]:text-primary-foreground [&_.fc-button-primary:not(:disabled):hover]:bg-primary/90 [&_.fc-col-header-cell-cushion]:py-2 [&_.fc-event]:cursor-pointer ${unscheduledGames.length > 0 ? "pr-80" : ""}`}
              >
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  locale={calendarLocale}
                  initialView="dayGridMonth"
                  firstDay={1}
                  height="auto"
                  nowIndicator
                  editable={true}
                  droppable={true}
                  eventDrop={handleEventDrop}
                  drop={handleExternalDrop}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                  }}
                  buttonText={{
                    today: t("gamesPage.calendar.today", { defaultValue: "Today" }),
                    month: t("gamesPage.calendar.month", { defaultValue: "Month" }),
                    week: t("gamesPage.calendar.week", { defaultValue: "Week" }),
                    day: t("gamesPage.calendar.day", { defaultValue: "Day" }),
                    list: t("gamesPage.calendar.list", { defaultValue: "List" }),
                  }}
                  events={calendarEvents}
                  validRange={calendarValidRange}
                  eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                  eventClick={(info) => openEditGame(info.event.id)}
                  noEventsContent={t("gamesPage.noScheduledGames")}
                  eventContent={(info) => {
                    const game = gamesById.get(info.event.id)
                    if (!game) {
                      return (
                        <div className="px-1 py-0.5 leading-tight">
                          <div className="font-semibold text-xs">
                            {info.timeText} {info.event.title}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="px-1 py-0.5 leading-tight">
                        {/* Team logos + names row */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="flex items-center gap-1">
                            {game.homeTeam.logoUrl && (
                              <img src={game.homeTeam.logoUrl} alt="" className="h-4 w-4 object-contain" />
                            )}
                            <span className="font-semibold text-xs">{game.homeTeam.shortName}</span>
                          </div>
                          <span className="text-[10px] opacity-70">vs.</span>
                          <div className="flex items-center gap-1">
                            {game.awayTeam.logoUrl && (
                              <img src={game.awayTeam.logoUrl} alt="" className="h-4 w-4 object-contain" />
                            )}
                            <span className="font-semibold text-xs">{game.awayTeam.shortName}</span>
                          </div>
                        </div>
                        {/* Time + score + venue */}
                        <div className="opacity-80 text-[11px]">
                          <div>{info.timeText}</div>
                          {info.event.extendedProps.score && (
                            <div className="font-bold">{String(info.event.extendedProps.score)}</div>
                          )}
                          {info.event.extendedProps.venueName && (
                            <div className="truncate">{String(info.event.extendedProps.venueName)}</div>
                          )}
                        </div>
                      </div>
                    )
                  }}
                />
              </div>
            )}
            <UnscheduledGamesSidebar games={unscheduledGames} />
          </div>
        )}
      </DataPageLayout>

      <Dialog
        open={gameDialogOpen}
        onOpenChange={(open) => {
          setGameDialogOpen(open)
          if (!open) {
            // Refresh calendar when dialog closes (for cancel scenarios)
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label={t("gamesPage.form.fields.scheduledAt", { defaultValue: "Date and time" })}>
                  <Input
                    type="datetime-local"
                    value={gameForm.scheduledAt}
                    min={toLocalInputValue(season.seasonStart)}
                    max={toLocalInputValue(season.seasonEnd)}
                    onChange={(e) => setGameForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                  />
                </FormField>
                <FormField label={t("gamesPage.form.fields.status", { defaultValue: "Status" })}>
                  <select
                    value={gameForm.status}
                    onChange={(e) => setGameForm((p) => ({ ...p, status: e.target.value as GameStatus }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="scheduled">{t("gamesPage.status.scheduled")}</option>
                    <option value="in_progress">{t("gamesPage.status.in_progress")}</option>
                    <option value="completed">{t("gamesPage.status.completed")}</option>
                    <option value="postponed">{t("gamesPage.status.postponed")}</option>
                    <option value="cancelled">{t("gamesPage.status.cancelled")}</option>
                  </select>
                </FormField>
              </div>
            </div>

            <hr className="border-border/60" />

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("gamesPage.form.sections.result", { defaultValue: "Result" })}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label={t("gamesPage.form.fields.homeGoals", { defaultValue: "Home goals" })}>
                  <Input
                    type="number"
                    min={0}
                    value={gameForm.homeScore}
                    onChange={(e) => setGameForm((p) => ({ ...p, homeScore: e.target.value }))}
                    placeholder={t("gamesPage.placeholders.homeGoals")}
                  />
                </FormField>
                <FormField label={t("gamesPage.form.fields.awayGoals", { defaultValue: "Away goals" })}>
                  <Input
                    type="number"
                    min={0}
                    value={gameForm.awayScore}
                    onChange={(e) => setGameForm((p) => ({ ...p, awayScore: e.target.value }))}
                    placeholder={t("gamesPage.placeholders.awayGoals")}
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
            className="space-y-4 p-6 pt-2"
          >
            <select
              value={generateDivisionId}
              onChange={(e) => setGenerateDivisionId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("gamesPage.placeholders.division")}</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="datetime-local"
                value={generateStartAt}
                onChange={(e) => setGenerateStartAt(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                value={generateCadenceDays}
                onChange={(e) => setGenerateCadenceDays(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={generate.isPending}>
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

      <CalendarExportDialog
        open={calendarExportOpen}
        onOpenChange={setCalendarExportOpen}
        seasonId={season?.id ?? ""}
        teamId={teamFilter !== FILTER_ALL ? teamFilter : undefined}
        gameCount={upcomingGamesCount}
      />
    </>
  )
}
