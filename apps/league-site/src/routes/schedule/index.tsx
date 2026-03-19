import { createFileRoute, Link, useSearch } from "@tanstack/react-router"
import { Calendar, MapPin } from "lucide-react"
import { EmptyState } from "~/components/shared/emptyState"
import { FilterDropdown } from "~/components/shared/filterDropdown"
import { FilterPill } from "~/components/shared/filterPill"
import { Skeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { useOrg, useSeason } from "~/lib/context"
import { type Translations, useT } from "~/lib/i18n"
import { cn, formatTime } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

export const scheduleSearchValidator = (
  s: Record<string, unknown>,
): { season?: string; status?: string; team?: string; round?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
  ...(typeof s.status === "string" && s.status ? { status: s.status } : {}),
  ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
  ...(typeof s.round === "string" && s.round ? { round: s.round } : {}),
})

export const Route = createFileRoute("/schedule/")({
  component: SchedulePage,
  head: () => ({ meta: [{ title: "Spielplan" }] }),
  validateSearch: scheduleSearchValidator,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface GameData {
  id: string
  homeTeam: { id: string; name: string; shortName: string; logoUrl: string | null }
  awayTeam: { id: string; name: string; shortName: string; logoUrl: string | null }
  homeScore: number | null
  awayScore: number | null
  status: string
  scheduledAt: Date | string | null
  location?: string | null
  round: { name: string; roundType?: string; division: { name: string } | null } | null
}

type Winner = "home" | "away" | "draw" | null

function getWinner(game: GameData): Winner {
  if (game.status !== "completed" || game.homeScore === null || game.awayScore === null) return null
  if (game.homeScore > game.awayScore) return "home"
  if (game.awayScore > game.homeScore) return "away"
  return "draw"
}

function getMonthKey(date: Date | string | null): string {
  if (!date) return "nodate"
  const d = typeof date === "string" ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
}

function getMonthLabel(key: string, months: readonly string[]): string {
  if (key === "nodate") return "—"
  const parts = key.split("-")
  return `${months[parseInt(parts[1] ?? "0", 10)]} ${parts[0]}`
}

function formatCardDate(date: Date | string | null, isDE: boolean): string {
  if (!date) return "–"
  const d = typeof date === "string" ? new Date(date) : date
  const weekdays = isDE ? WEEKDAYS_DE : WEEKDAYS_EN
  const day = weekdays[d.getDay()]
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${day}, ${dd}.${mm}.`
}

/** Top accent color per game status */
const STATUS_ACCENT: Record<string, string> = {
  completed: "bg-emerald-500",
  scheduled: "bg-blue-400",
  live: "bg-red-500",
  cancelled: "bg-league-text/20",
  postponed: "bg-amber-400",
}

// ---------------------------------------------------------------------------
// Game Card
// ---------------------------------------------------------------------------

function GameCard({ game, isDE }: { game: GameData; isDE: boolean }) {
  const winner = getWinner(game)
  const isCancelled = game.status === "cancelled"
  const isLive = game.status === "live"
  const isCompleted = game.status === "completed"
  const isPostponed = game.status === "postponed"
  const hasScore = isCompleted || isLive
  const t = useT()

  const roundInfo = game.round
    ? game.round.division?.name
      ? `${game.round.division.name} · ${game.round.name}`
      : game.round.name
    : null

  return (
    <Link
      to="/schedule/$gameId"
      params={{ gameId: game.id }}
      className={cn(
        "group relative flex flex-col bg-league-surface rounded-xl overflow-hidden transition-all duration-200",
        "border border-league-text/8 hover:border-league-primary/30",
        "hover:shadow-md hover:-translate-y-0.5",
        isCancelled && "opacity-50",
        isLive && "ring-1 ring-red-500/30",
      )}
    >
      {/* Status accent bar */}
      <div className={cn("h-1", STATUS_ACCENT[game.status] ?? "bg-league-text/10")} />

      {/* Teams & Score — horizontal: home | score | away */}
      <div className="flex-1 flex items-center px-4 pt-4 pb-3 gap-2">
        {/* Home team */}
        <div className={cn("flex-1 flex flex-col items-center gap-1.5 min-w-0", isCancelled && "opacity-60")}>
          <TeamLogo name={game.homeTeam.name} logoUrl={game.homeTeam.logoUrl} size="md" />
          <span
            className={cn(
              "text-sm text-center truncate max-w-full",
              isCancelled && "line-through",
              winner === "home" && "font-bold text-league-text",
              winner === "away" && "text-league-text/45",
              winner === "draw" && "font-semibold",
              !isCompleted && !isCancelled && "font-medium",
            )}
          >
            {game.homeTeam.shortName}
          </span>
        </div>

        {/* Center: score or vs */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          {hasScore ? (
            <span className={cn("text-lg tabular-nums font-bold", isLive && "text-red-600")}>
              {game.homeScore} : {game.awayScore}
            </span>
          ) : isCancelled ? (
            <span className="text-xs text-league-text/30 font-medium">–</span>
          ) : (
            <span className="text-sm text-league-text/30 font-medium">vs</span>
          )}

          {/* Live indicator */}
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 uppercase tracking-wide">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              Live
            </span>
          )}

          {/* Postponed / Cancelled label */}
          {(isPostponed || isCancelled) && (
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isPostponed ? "text-amber-600" : "text-league-text/35",
              )}
            >
              {isPostponed ? t.status.postponed : t.status.cancelled}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className={cn("flex-1 flex flex-col items-center gap-1.5 min-w-0", isCancelled && "opacity-60")}>
          <TeamLogo name={game.awayTeam.name} logoUrl={game.awayTeam.logoUrl} size="md" />
          <span
            className={cn(
              "text-sm text-center truncate max-w-full",
              isCancelled && "line-through",
              winner === "away" && "font-bold text-league-text",
              winner === "home" && "text-league-text/45",
              winner === "draw" && "font-semibold",
              !isCompleted && !isCancelled && "font-medium",
            )}
          >
            {game.awayTeam.shortName}
          </span>
        </div>
      </div>

      {/* Footer: date, time, location, round */}
      <div className="px-4 pb-3 pt-0 border-t border-league-text/5">
        <div className="flex items-center gap-3 pt-2.5 text-[12px] text-league-text/45 leading-tight">
          {/* Date & time */}
          <span className="inline-flex items-center gap-1 shrink-0">
            <Calendar className="h-3 w-3" />
            <span className="tabular-nums">
              {formatCardDate(game.scheduledAt, isDE)}
              {game.scheduledAt && ` ${formatTime(game.scheduledAt)}`}
            </span>
          </span>

          {/* Location */}
          {game.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{game.location}</span>
            </span>
          )}
        </div>

        {/* Round info */}
        {roundInfo && <div className="mt-1 text-[11px] text-league-text/30 truncate">{roundInfo}</div>}
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Month Group
// ---------------------------------------------------------------------------

function MonthGroup({ label, games, isDE }: { label: string; games: GameData[]; isDE: boolean }) {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-league-bg/95 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <h3 className="text-lg font-bold text-league-text/80 tracking-tight">{label}</h3>
        <div className="mt-1 h-px bg-gradient-to-r from-league-primary/40 via-league-primary/10 to-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} isDE={isDE} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="flex flex-col bg-league-surface rounded-xl border border-league-text/8 overflow-hidden">
      <div className="h-1 bg-league-text/10" />
      <div className="flex items-center px-4 pt-4 pb-3 gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-5 w-10 shrink-0" />
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="px-4 pb-3 pt-0 border-t border-league-text/5">
        <div className="flex items-center gap-3 pt-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, g) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items
        <div key={g}>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SchedulePage() {
  const org = useOrg()
  const season = useSeason()
  const t = useT()
  const filterNavigate = useFilterNavigate()
  const {
    season: seasonParam,
    status: statusParam,
    team: teamParam,
    round: roundParam,
  } = useSearch({ strict: false }) as { season?: string; status?: string; team?: string; round?: string }

  const isDE = (t as Translations).common.back === "Zurück"

  const selectedSeasonId = seasonParam ?? season.current?.id
  const statusFilter = statusParam || undefined
  const teamFilter = teamParam || undefined
  const roundFilter = roundParam || undefined

  const setStatusFilter = (v: string | undefined) =>
    filterNavigate({ search: (prev: any) => ({ ...prev, status: v || undefined }) })
  const setTeamFilter = (v: string | undefined) =>
    filterNavigate({ search: (prev: any) => ({ ...prev, team: v || undefined }) })
  const setRoundFilter = (v: string | undefined) =>
    filterNavigate({ search: (prev: any) => ({ ...prev, round: v || undefined }) })

  // Fetch season structure to build round dropdown options
  const { data: structure } = trpc.publicSite.getSeasonStructure.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const divisions = structure?.divisions

  const { data: teams } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.publicSite.listGames.useInfiniteQuery(
      {
        organizationId: org.id,
        seasonId: !roundFilter ? selectedSeasonId : undefined,
        roundId: roundFilter,
        status: statusFilter as any,
        teamId: teamFilter,
        limit: 100,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 60_000,
        enabled: !!selectedSeasonId,
      },
    )

  const allGames = data?.pages.flatMap((p) => p.games) ?? []

  // Group games by month
  const grouped = new Map<string, typeof allGames>()
  for (const game of allGames) {
    const key = getMonthKey(game.scheduledAt)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(game)
  }

  const teamOptions = [...(teams ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((team) => ({
      value: team.id,
      label: team.name,
      icon: <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />,
    }))

  // Build round dropdown options, grouped by division when there are multiple
  const hasManyDivisions = (divisions?.length ?? 0) > 1
  const roundOptions = (divisions ?? []).flatMap((div) =>
    div.rounds.map((r) => ({
      value: r.id,
      label: r.name,
      ...(hasManyDivisions ? { group: div.name } : {}),
    })),
  )

  return (
    <StatsPageShell title={t.schedule.titleFull}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {roundOptions.length > 0 && (
          <FilterDropdown
            label={t.structure.rounds}
            options={roundOptions}
            value={roundFilter ? [roundFilter] : []}
            onChange={(v) => setRoundFilter(v[0] || undefined)}
            singleSelect
          />
        )}
        {teamOptions.length > 0 && (
          <FilterDropdown
            label={t.schedule.allTeams}
            options={teamOptions}
            value={teamFilter ? [teamFilter] : []}
            onChange={(v) => setTeamFilter(v[0] || undefined)}
            singleSelect
          />
        )}
        {(roundOptions.length > 0 || teamOptions.length > 0) && <div className="w-px h-5 bg-league-text/10 mx-1" />}
        <FilterPill
          label={t.common.all}
          active={statusFilter === undefined}
          onClick={() => setStatusFilter(undefined)}
        />
        <FilterPill
          label={t.schedule.scheduled}
          active={statusFilter === "scheduled"}
          onClick={() => setStatusFilter("scheduled")}
        />
        <FilterPill
          label={t.schedule.completed}
          active={statusFilter === "completed"}
          onClick={() => setStatusFilter("completed")}
        />
        <FilterPill label={t.schedule.live} active={statusFilter === "live"} onClick={() => setStatusFilter("live")} />
        <FilterPill
          label={t.schedule.cancelled}
          active={statusFilter === "cancelled"}
          onClick={() => setStatusFilter("cancelled")}
        />
      </div>

      {/* Game cards */}
      {isLoading ? (
        <GridSkeleton />
      ) : allGames.length > 0 ? (
        <>
          <div className="space-y-10">
            {Array.from(grouped.entries()).map(([monthKey, games]) => (
              <MonthGroup key={monthKey} label={getMonthLabel(monthKey, t.months)} games={games} isDE={isDE} />
            ))}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="text-center pt-8">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg bg-league-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isFetchingNextPage ? t.common.loading : t.common.loadMore}
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState title={t.schedule.noGames} description={t.schedule.noGamesDesc} />
      )}
    </StatsPageShell>
  )
}
