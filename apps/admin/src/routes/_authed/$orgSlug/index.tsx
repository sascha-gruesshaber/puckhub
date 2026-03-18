import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronUp,
  Clock,
  FileText,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/$orgSlug/")({
  component: DashboardPage,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RANK_COLORS = [
  "bg-amber-400/15 text-amber-600 ring-amber-400/30",
  "bg-slate-300/20 text-slate-500 ring-slate-300/40",
  "bg-orange-400/15 text-orange-600 ring-orange-400/30",
] as const

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_COLORS[rank] ?? "bg-muted text-muted-foreground ring-border"
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-1 shrink-0 ${style}`}
    >
      {rank + 1}
    </span>
  )
}

function TeamLogo({ url, size = 16 }: { url: string | null; size?: number }) {
  if (!url) return <div className="rounded-full bg-muted shrink-0" style={{ width: size, height: size }} />
  return <img src={url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
}

// ---------------------------------------------------------------------------
// Shared Game Row — consistent matchup display across all game cards
// ---------------------------------------------------------------------------
const GAME_ROW_HEIGHT = "h-11"

function GameRow({
  homeTeam,
  awayTeam,
  date,
  meta,
}: {
  homeTeam: { shortName: string; logoUrl: string | null }
  awayTeam: { shortName: string; logoUrl: string | null }
  date: Date | string | null
  meta?: React.ReactNode
}) {
  const formatted = date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "\u2013"

  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-2.5 text-sm ${GAME_ROW_HEIGHT}`}>
      <span className="text-[11px] text-muted-foreground w-12 shrink-0 tabular-nums">{formatted}</span>
      <TeamLogo url={homeTeam.logoUrl} />
      <span className="font-medium truncate max-w-[5rem]">{homeTeam.shortName}</span>
      <span className="text-muted-foreground text-[11px]">vs</span>
      <TeamLogo url={awayTeam.logoUrl} />
      <span className="font-medium truncate max-w-[5rem]">{awayTeam.shortName}</span>
      {meta && <span className="ml-auto shrink-0">{meta}</span>}
    </div>
  )
}

function GameRowSkeleton() {
  return (
    <div className={`flex items-center gap-2.5 px-2.5 ${GAME_ROW_HEIGHT}`}>
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-2 w-4" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-3.5 w-16" />
    </div>
  )
}

/** Fixed 3-slot container — always renders exactly 3 rows worth of height for alignment */
function ThreeSlotList<T>({
  items,
  isLoading,
  emptyIcon,
  emptyText,
  renderItem,
}: {
  items: T[]
  isLoading: boolean
  emptyIcon: React.ReactNode
  emptyText: string
  renderItem: (item: T, i: number) => React.ReactNode
}) {
  if (isLoading) {
    return (
      <div>
        <GameRowSkeleton />
        <GameRowSkeleton />
        <GameRowSkeleton />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ height: `calc(3 * 2.75rem)` }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 mb-2">
          {emptyIcon}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{emptyText}</p>
      </div>
    )
  }

  return <div>{items.slice(0, 3).map(renderItem)}</div>
}

/** "Show all" footer link for action item cards */
function ShowAllFooter({
  to,
  params,
  search,
  label,
}: {
  to: string
  params: Record<string, string>
  search?: Record<string, string>
  label: string
}) {
  return (
    <div className="px-6 pb-4 pt-0">
      <Link
        to={to}
        params={params}
        search={search}
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-accent/50"
      >
        {label}
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  total,
  icon,
  color,
  isLoading,
}: {
  label: string
  value: number
  total?: number
  icon: React.ReactNode
  color: string
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: `${color}15`, color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-14 mt-0.5" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
                {total != null && <span className="text-xs text-muted-foreground tabular-nums">/ {total}</span>}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Missing Reports Card
// ---------------------------------------------------------------------------
function MissingReportsCard({
  reports,
  isLoading,
  t,
  orgSlug,
}: {
  reports: Array<{
    id: string
    scheduledAt: Date | null
    homeTeam: { id: string; shortName: string; logoUrl: string | null }
    awayTeam: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
  orgSlug: string
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <CardTitle className="text-sm font-medium">{t("dashboard.missingReports.title")}</CardTitle>
          </div>
          {!isLoading && reports.length > 0 && (
            <Badge variant="secondary" className="text-amber-600 bg-amber-500/10">
              {t("dashboard.missingReports.count").replace("{count}", String(reports.length))}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ThreeSlotList
          items={reports}
          isLoading={isLoading}
          emptyIcon={<CheckCircle2 size={20} className="text-emerald-500" />}
          emptyText={t("dashboard.missingReports.empty")}
          renderItem={(game) => (
            <Link
              key={game.id}
              to="/$orgSlug/games/$gameId/report"
              params={{ orgSlug, gameId: game.id }}
              className="block rounded-lg hover:bg-accent/50 transition-colors"
            >
              <GameRow homeTeam={game.homeTeam} awayTeam={game.awayTeam} date={game.scheduledAt} />
            </Link>
          )}
        />
      </CardContent>
      {!isLoading && reports.length > 0 && (
        <ShowAllFooter
          to="/$orgSlug/games"
          params={{ orgSlug }}
          search={{ status: "report_pending" }}
          label={t("dashboard.showAll")}
        />
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Upcoming Games Card
// ---------------------------------------------------------------------------
function UpcomingGamesCard({
  games,
  isLoading,
  t,
  orgSlug,
}: {
  games: Array<{
    id: string
    scheduledAt: Date | null
    location: string | null
    homeTeam: { id: string; shortName: string; logoUrl: string | null }
    awayTeam: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
  orgSlug: string
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-500" />
          <CardTitle className="text-sm font-medium">{t("dashboard.upcomingGames.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ThreeSlotList
          items={games}
          isLoading={isLoading}
          emptyIcon={<Calendar size={20} className="text-blue-500" />}
          emptyText={t("dashboard.upcomingGames.empty")}
          renderItem={(game) => (
            <GameRow
              key={game.id}
              homeTeam={game.homeTeam}
              awayTeam={game.awayTeam}
              date={game.scheduledAt}
              meta={
                game.location ? (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[6rem]">{game.location}</span>
                ) : undefined
              }
            />
          )}
        />
      </CardContent>
      {!isLoading && games.length > 0 && (
        <ShowAllFooter
          to="/$orgSlug/games"
          params={{ orgSlug }}
          search={{ status: "scheduled" }}
          label={t("dashboard.showAll")}
        />
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Active Suspensions Card
// ---------------------------------------------------------------------------
function ActiveSuspensionsCard({
  suspensions,
  isLoading,
  t,
  orgSlug,
}: {
  suspensions: Array<{
    id: string
    suspendedGames: number
    servedGames: number
    player: { id: string; firstName: string; lastName: string }
    team: { id: string; name: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
  orgSlug: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? suspensions : suspensions.slice(0, 3)
  const hasMore = suspensions.length > 3

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500" />
            <CardTitle className="text-sm font-medium">{t("dashboard.activeSuspensions.title")}</CardTitle>
          </div>
          {!isLoading && suspensions.length > 0 && (
            <Badge variant="secondary" className="text-red-600 bg-red-500/10">
              {t("dashboard.activeSuspensions.count").replace("{count}", String(suspensions.length))}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div>
            <GameRowSkeleton />
            <GameRowSkeleton />
            <GameRowSkeleton />
          </div>
        ) : suspensions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ height: `calc(3 * 2.75rem)` }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 mb-2">
              <ShieldAlert size={20} className="text-emerald-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t("dashboard.activeSuspensions.empty")}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((s) => {
              const progress = s.suspendedGames > 0 ? (s.servedGames / s.suspendedGames) * 100 : 0
              return (
                <div key={s.id} className="rounded-lg border border-border/50 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo url={s.team.logoUrl} />
                      <Link
                        to="/$orgSlug/players/$playerId"
                        params={{ orgSlug, playerId: s.player.id }}
                        className="font-medium text-sm hover:underline truncate"
                      >
                        {s.player.firstName} {s.player.lastName}
                      </Link>
                      <span className="text-xs text-muted-foreground">{s.team.shortName}</span>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0 ml-2">
                      {t("dashboard.activeSuspensions.remaining")
                        .replace("{served}", String(s.servedGames))
                        .replace("{total}", String(s.suspendedGames))}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-red-500/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500/60 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      {!isLoading && hasMore && (
        <div className="px-6 pb-4 pt-0">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-accent/50 w-full"
          >
            {expanded ? t("dashboard.activeSuspensions.collapse") : t("dashboard.showAll")}
            {expanded ? <ChevronUp size={12} /> : <ArrowRight size={12} />}
          </button>
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Public Reports Card
// ---------------------------------------------------------------------------
function PublicReportsCard({
  orgSlug,
  seasonId,
  isSeasonReady,
  t,
}: {
  orgSlug: string
  seasonId: string | undefined
  isSeasonReady: boolean
  t: (key: string) => string
}) {
  const { data, isLoading } = trpc.publicGameReport.list.useQuery(
    { reverted: false, limit: 3, seasonId },
    { enabled: isSeasonReady },
  )
  const reports = data ?? []
  const loading = isLoading || !isSeasonReady

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            <CardTitle className="text-sm font-medium">{t("publicReports.title")}</CardTitle>
          </div>
          {!loading && reports.length > 0 && (
            <Badge variant="secondary" className="text-blue-600 bg-blue-500/10">
              {reports.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ThreeSlotList
          items={reports}
          isLoading={loading}
          emptyIcon={<FileText size={20} className="text-blue-500" />}
          emptyText={t("publicReports.empty")}
          renderItem={(report) => (
            <Link
              key={report.id}
              to="/$orgSlug/games/$gameId/report"
              params={{ orgSlug, gameId: report.game.id }}
              className="block rounded-lg hover:bg-accent/50 transition-colors"
            >
              <GameRow homeTeam={report.game.homeTeam} awayTeam={report.game.awayTeam} date={report.createdAt} />
            </Link>
          )}
        />
      </CardContent>
      {!loading && reports.length > 0 && (
        <ShowAllFooter to="/$orgSlug/games/public-reports" params={{ orgSlug }} label={t("dashboard.showAll")} />
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Top Scorers Card
// ---------------------------------------------------------------------------
function TopScorersCard({
  scorers,
  isLoading,
  t,
  orgSlug,
}: {
  scorers: Array<{
    goals: number
    assists: number
    totalPoints: number
    player: { id: string; firstName: string; lastName: string }
    team: { id: string; name: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
  orgSlug: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <CardTitle className="text-sm font-medium">{t("dashboard.topScorers.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.topScorers.empty")}</p>
        ) : (
          <div className="space-y-1">
            {scorers.map((s, i) => (
              <div
                key={s.player.id}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors"
              >
                <RankBadge rank={i} />
                <TeamLogo url={s.team.logoUrl} size={20} />
                <div className="min-w-0 flex-1 leading-tight">
                  <Link
                    to="/$orgSlug/players/$playerId"
                    params={{ orgSlug, playerId: s.player.id }}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {s.player.firstName} {s.player.lastName}
                  </Link>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">{s.team.shortName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                  <span className="text-muted-foreground" title={t("dashboard.topScorers.goals")}>
                    {s.goals}G
                  </span>
                  <span className="text-muted-foreground" title={t("dashboard.topScorers.assists")}>
                    {s.assists}A
                  </span>
                  <span className="font-bold text-sm" title={t("dashboard.topScorers.points")}>
                    {s.totalPoints}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Top Penalized Card
// ---------------------------------------------------------------------------
function TopPenalizedCard({
  players,
  isLoading,
  t,
  orgSlug,
}: {
  players: Array<{
    penaltyMinutes: number
    player: { id: string; firstName: string; lastName: string }
    team: { id: string; name: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
  orgSlug: string
}) {
  const maxPim = players.length > 0 ? players[0]!.penaltyMinutes : 1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-orange-500" />
          <CardTitle className="text-sm font-medium">{t("dashboard.topPenalized.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.topPenalized.empty")}</p>
        ) : (
          <div className="space-y-1">
            {players.map((s, i) => (
              <div
                key={s.player.id}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors"
              >
                <RankBadge rank={i} />
                <TeamLogo url={s.team.logoUrl} size={20} />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/$orgSlug/players/$playerId"
                    params={{ orgSlug, playerId: s.player.id }}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {s.player.firstName} {s.player.lastName}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{s.team.shortName}</span>
                    <div className="flex-1 h-1 rounded-full bg-orange-500/10 overflow-hidden max-w-[80px]">
                      <div
                        className="h-full rounded-full bg-orange-500/50"
                        style={{ width: `${(s.penaltyMinutes / maxPim) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums shrink-0" title={t("dashboard.topPenalized.pim")}>
                  {s.penaltyMinutes}'
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Recent Results Card
// ---------------------------------------------------------------------------
function RecentResultsCard({
  results,
  isLoading,
  t,
  orgSlug,
}: {
  results: Array<{
    id: string
    scheduledAt: Date | null
    homeScore: number | null
    awayScore: number | null
    homeTeam: { id: string; shortName: string; logoUrl: string | null }
    awayTeam: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
  orgSlug: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.recentResults.empty")}</p>
        ) : (
          <div className="space-y-1">
            {results.map((game) => {
              const homeWin = (game.homeScore ?? 0) > (game.awayScore ?? 0)
              const awayWin = (game.awayScore ?? 0) > (game.homeScore ?? 0)
              return (
                <Link
                  key={game.id}
                  to="/$orgSlug/games/$gameId/report"
                  params={{ orgSlug, gameId: game.id }}
                  className="flex items-center rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group"
                >
                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                    {game.scheduledAt
                      ? new Date(game.scheduledAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "\u2013"}
                  </span>
                  <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                      <span
                        className={`text-sm truncate ${homeWin ? `font-bold` : `font-medium text-muted-foreground`}`}
                      >
                        {game.homeTeam.shortName}
                      </span>
                      <TeamLogo url={game.homeTeam.logoUrl} size={20} />
                    </div>
                    <span className="text-base font-bold tabular-nums px-2 shrink-0">
                      {game.homeScore ?? 0}
                      <span className="text-muted-foreground mx-0.5">:</span>
                      {game.awayScore ?? 0}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamLogo url={game.awayTeam.logoUrl} size={20} />
                      <span
                        className={`text-sm truncate ${awayWin ? `font-bold` : `font-medium text-muted-foreground`}`}
                      >
                        {game.awayTeam.shortName}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("dashboard.recentResults.viewReport")}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------
function DashboardPage() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { season, isLoading: seasonLoading } = useWorkingSeason()

  const { data, isLoading } = trpc.dashboard.getOverview.useQuery(
    { seasonId: season?.id ?? "" },
    { enabled: !!season?.id },
  )

  if (!seasonLoading && !season) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        <EmptyState
          icon={<Calendar size={28} className="text-muted-foreground" />}
          title={t("dashboard.title")}
          description={t("dashboard.noSeason")}
        />
      </div>
    )
  }

  const loading = isLoading || seasonLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        {season && (
          <p className="text-muted-foreground text-sm mt-1">
            {t("dashboard.subtitle")} — {season.name}
          </p>
        )}
      </div>

      {/* Row 1: Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.cards.teams")}
          value={data?.counts.teams ?? 0}
          total={data?.counts.totalTeams}
          icon={<Users size={18} />}
          color="hsl(215, 55%, 23%)"
          isLoading={loading}
        />
        <StatCard
          label={t("dashboard.cards.players")}
          value={data?.counts.players ?? 0}
          total={data?.counts.totalPlayers}
          icon={<Users size={18} />}
          color="hsl(142, 71%, 45%)"
          isLoading={loading}
        />
        <StatCard
          label={t("dashboard.cards.completed")}
          value={data?.counts.completed ?? 0}
          icon={<CheckCircle2 size={18} />}
          color="hsl(44, 87%, 50%)"
          isLoading={loading}
        />
        <StatCard
          label={t("dashboard.cards.remaining")}
          value={data?.counts.remaining ?? 0}
          icon={<Clock size={18} />}
          color="hsl(354, 85%, 42%)"
          isLoading={loading}
        />
      </div>

      {/* Row 2: Action Items — 2x2 grid with equal-height cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.sections.actionItems")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MissingReportsCard reports={data?.missingReports ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
          <UpcomingGamesCard games={data?.upcomingGames ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
          <ActiveSuspensionsCard
            suspensions={data?.activeSuspensions ?? []}
            isLoading={loading}
            t={t}
            orgSlug={orgSlug}
          />
          <PublicReportsCard orgSlug={orgSlug} seasonId={season?.id} isSeasonReady={!!season?.id} t={t} />
        </div>
      </div>

      {/* Row 3: Season Insights */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.sections.seasonInsights")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TopScorersCard scorers={data?.topScorers ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
          <TopPenalizedCard players={data?.topPenalized ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
        </div>
      </div>

      {/* Row 4: Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.sections.recentActivity")}</h2>
        <RecentResultsCard results={data?.recentResults ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
      </div>
    </div>
  )
}
