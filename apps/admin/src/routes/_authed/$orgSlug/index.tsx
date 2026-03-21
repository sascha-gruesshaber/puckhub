import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronUp,
  Clock,
  FileText,
  MapPin,
  Plus,
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
  component: GameCenterPage,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RANK_COLORS = [
  "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  "bg-slate-400/15 text-slate-400 ring-slate-400/25",
  "bg-orange-400/15 text-orange-400 ring-orange-400/30",
] as const

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_COLORS[rank] ?? "bg-muted text-muted-foreground ring-border"
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ring-1 shrink-0 ${style}`}
    >
      {rank + 1}
    </span>
  )
}

function TeamLogo({ url, size = 16 }: { url: string | null; size?: number }) {
  if (!url) return <div className="rounded-full bg-muted shrink-0" style={{ width: size, height: size }} />
  return <img src={url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
}

function DateLocationCell({ date, location }: { date: Date | string | null; location?: string | null }) {
  const formatted = date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "\u2013"

  return (
    <div className="w-20 shrink-0 mr-1">
      <div className="flex items-center gap-1.5">
        <Calendar size={10} className="text-muted-foreground/50 shrink-0" />
        <span className="text-[11px] text-muted-foreground tabular-nums">{formatted}</span>
      </div>
      {location && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <MapPin size={10} className="text-muted-foreground/40 shrink-0" />
          <span className="text-[10px] text-muted-foreground/60 truncate">{location}</span>
        </div>
      )}
    </div>
  )
}

function GameRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-2 w-6" />
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-3.5 w-16" />
    </div>
  )
}

/** Footer link */
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
    <div className="px-6 pb-4 pt-1">
      <Link
        to={to}
        params={params}
        search={search}
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-2 rounded-lg hover:bg-primary/5"
      >
        {label}
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card — bolder with progress bar and stagger animation
// ---------------------------------------------------------------------------
const STAT_CONFIGS = [
  {
    gradient: "from-blue-500/20 to-blue-500/5",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    barColor: "bg-blue-400",
  },
  {
    gradient: "from-emerald-500/20 to-emerald-500/5",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    barColor: "bg-emerald-400",
  },
  {
    gradient: "from-amber-500/20 to-amber-500/5",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    barColor: "bg-amber-400",
  },
  {
    gradient: "from-primary/30 to-primary/10",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    barColor: "bg-primary",
    accent: true,
  },
] as const

function StatCard({
  label,
  value,
  total,
  description,
  icon,
  isLoading,
  index = 0,
  href,
  linkParams,
  linkSearch,
}: {
  label: string
  value: number
  total?: number
  description?: string
  icon: React.ReactNode
  isLoading: boolean
  index?: number
  href?: string
  linkParams?: Record<string, string>
  linkSearch?: Record<string, string>
}) {
  const config = STAT_CONFIGS[index] ?? STAT_CONFIGS[0]!
  const progress = total ? Math.min(100, Math.round((value / total) * 100)) : null

  const inner = (
    <>
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-60 pointer-events-none`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.iconBg} ${config.iconColor}`}>
            {icon}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-extrabold tabular-nums leading-none ${config.accent ? "text-primary" : ""}`}>
              {value}
            </p>
            {total != null && (
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">/ {total}</span>
            )}
          </div>
        )}
        {description && !isLoading && (
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{description}</p>
        )}
        {progress !== null && !isLoading && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${config.barColor} transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </>
  )

  const className =
    "dash-card group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg shadow-black/10 hover:-translate-y-0.5 transition-all duration-200"

  if (href) {
    return (
      <Link
        to={href}
        params={linkParams}
        search={linkSearch}
        className={className}
        style={{ "--card-index": index } as React.CSSProperties}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className={className} style={{ "--card-index": index } as React.CSSProperties}>
      {inner}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero Alert Banner — missing reports
// ---------------------------------------------------------------------------
function HeroAlertBanner({
  count,
  isLoading,
  orgSlug,
  t,
}: {
  count: number
  isLoading: boolean
  orgSlug: string
  t: (key: string) => string
}) {
  if (isLoading || count === 0) return null

  return (
    <div className="dash-card relative overflow-hidden rounded-xl border-l-4 border-l-amber-500 border border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-card to-card p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold uppercase tracking-wide">
              {t("dashboard.missingReports.count").replace("{count}", String(count))}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t("dashboard.missingReports.title")}</p>
          </div>
        </div>
        <Link
          to="/$orgSlug/games"
          params={{ orgSlug }}
          search={{ status: "report_pending" }}
          className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
        >
          {t("dashboard.showAll")}
          <ArrowRight size={14} />
        </Link>
      </div>
      {/* Decorative watermark */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.04] pointer-events-none select-none">
        <AlertTriangle className="h-32 w-32" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upcoming Games Card — centered matchup layout
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
    <Card className="dash-card" style={{ "--card-index": 0 } as React.CSSProperties}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-400" />
          <CardTitle className="text-sm font-bold">{t("dashboard.upcomingGames.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/10 mb-3">
              <Calendar size={20} className="text-blue-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t("dashboard.upcomingGames.empty")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {games.map((game) => (
              <Link
                key={game.id}
                to="/$orgSlug/games/$gameId/report"
                params={{ orgSlug, gameId: game.id }}
                className="flex items-center rounded-lg px-3 py-3 hover:bg-muted/40 transition-colors group"
              >
                <DateLocationCell date={game.scheduledAt} location={game.location} />
                <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate">{game.homeTeam.shortName}</span>
                    <TeamLogo url={game.homeTeam.logoUrl} size={22} />
                  </div>
                  <div className="bg-secondary/80 rounded-md px-3 py-1 shrink-0">
                    <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest">VS</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamLogo url={game.awayTeam.logoUrl} size={22} />
                    <span className="text-sm font-semibold truncate">{game.awayTeam.shortName}</span>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-muted-foreground/30 shrink-0 ml-2 group-hover:text-primary transition-colors"
                />
              </Link>
            ))}
          </div>
        )}
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
    gameId: string
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
    <Card className="dash-card flex flex-col" style={{ "--card-index": 1 } as React.CSSProperties}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-400" />
            <CardTitle className="text-sm font-bold">{t("dashboard.activeSuspensions.title")}</CardTitle>
          </div>
          {!isLoading && suspensions.length > 0 && (
            <Badge variant="secondary" className="text-red-400 bg-red-500/15 font-bold">
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
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <ShieldAlert size={20} className="text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t("dashboard.activeSuspensions.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((s) => {
              const progress = s.suspendedGames > 0 ? (s.servedGames / s.suspendedGames) * 100 : 0
              return (
                <Link
                  key={s.id}
                  to="/$orgSlug/games/$gameId/report"
                  params={{ orgSlug, gameId: s.gameId }}
                  className="block rounded-lg border border-border/50 px-3 py-2.5 hover:border-border transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo url={s.team.logoUrl} />
                      <span className="font-semibold text-sm truncate">
                        {s.player.firstName} {s.player.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.team.shortName}</span>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0 ml-2 font-bold">
                      {t("dashboard.activeSuspensions.remaining")
                        .replace("{served}", String(s.servedGames))
                        .replace("{total}", String(s.suspendedGames))}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-red-500/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500/60 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </Link>
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
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-2 rounded-lg hover:bg-primary/5 w-full"
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
// Public Reports Stat Card — replaces the full card, shows count in stat row
// ---------------------------------------------------------------------------
function PublicReportsStatCard({
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
  const { data, isLoading } = trpc.publicGameReport.count.useQuery({ seasonId }, { enabled: isSeasonReady })
  const loading = isLoading || !isSeasonReady

  return (
    <StatCard
      label={t("publicReports.title")}
      value={data?.count ?? 0}
      description={t("publicReports.description")}
      icon={<FileText size={18} strokeWidth={2} />}
      isLoading={loading}
      index={3}
      href="/$orgSlug/games/public-reports"
      linkParams={{ orgSlug }}
    />
  )
}

// ---------------------------------------------------------------------------
// Top Scorers Card — with progress bars
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
  const maxPoints = scorers.length > 0 ? scorers[0]!.totalPoints : 1

  return (
    <Card className="dash-card relative overflow-hidden" style={{ "--card-index": 0 } as React.CSSProperties}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <CardTitle className="text-sm font-bold">{t("dashboard.topScorers.title")}</CardTitle>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PTS</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.topScorers.empty")}</p>
        ) : (
          <div className="space-y-1">
            {scorers.map((s, i) => {
              const pct = (s.totalPoints / maxPoints) * 100
              return (
                <div
                  key={s.player.id}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/40 transition-colors"
                >
                  <RankBadge rank={i} />
                  <TeamLogo url={s.team.logoUrl} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <Link
                        to="/$orgSlug/players/$playerId"
                        params={{ orgSlug, playerId: s.player.id }}
                        className="text-sm font-semibold hover:underline truncate block"
                      >
                        {s.player.firstName} {s.player.lastName}
                      </Link>
                      <span className="text-sm font-extrabold tabular-nums shrink-0 ml-2">{s.totalPoints}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-amber-400" : "bg-muted-foreground/30"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-14 text-right">
                        {s.goals}G {s.assists}A
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Top Penalized Card — with bar visualization
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
    <Card className="dash-card" style={{ "--card-index": 1 } as React.CSSProperties}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-red-400" />
            <CardTitle className="text-sm font-bold">{t("dashboard.topPenalized.title")}</CardTitle>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PIM</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.topPenalized.empty")}</p>
        ) : (
          <div className="space-y-1">
            {players.map((s, i) => {
              const pct = (s.penaltyMinutes / maxPim) * 100
              return (
                <div
                  key={s.player.id}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/40 transition-colors"
                >
                  <RankBadge rank={i} />
                  <TeamLogo url={s.team.logoUrl} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <Link
                        to="/$orgSlug/players/$playerId"
                        params={{ orgSlug, playerId: s.player.id }}
                        className="text-sm font-semibold hover:underline truncate block"
                      >
                        {s.player.firstName} {s.player.lastName}
                      </Link>
                      <span className="text-sm font-extrabold tabular-nums shrink-0 ml-2">{s.penaltyMinutes}'</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-red-400" : "bg-red-500/30"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {s.team.shortName}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Recent Results Card — centered matchup with score emphasis
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
    location: string | null
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
    <Card className="dash-card" style={{ "--card-index": 0 } as React.CSSProperties}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <CardTitle className="text-sm font-bold">{t("dashboard.sections.recentActivity")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <Skeleton key={i} className="h-12 w-full" />
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
                  className="flex items-center rounded-lg px-3 py-3 hover:bg-muted/40 transition-colors group"
                >
                  <DateLocationCell date={game.scheduledAt} location={game.location} />
                  <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                      <span
                        className={`text-sm truncate ${homeWin ? "font-extrabold" : "font-medium text-muted-foreground"}`}
                      >
                        {game.homeTeam.shortName}
                      </span>
                      <TeamLogo url={game.homeTeam.logoUrl} size={22} />
                    </div>
                    <div className="bg-secondary/80 rounded-md px-3 py-1 shrink-0">
                      <span className="text-base font-extrabold tabular-nums">
                        {game.homeScore ?? 0}
                        <span className="text-muted-foreground/50 mx-0.5">:</span>
                        {game.awayScore ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamLogo url={game.awayTeam.logoUrl} size={22} />
                      <span
                        className={`text-sm truncate ${awayWin ? "font-extrabold" : "font-medium text-muted-foreground"}`}
                      >
                        {game.awayTeam.shortName}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-muted-foreground/30 shrink-0 ml-2 group-hover:text-primary transition-colors"
                  />
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
// Main Game Center Page
// ---------------------------------------------------------------------------
function GameCenterPage() {
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
  const missingCount = data?.missingReports?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("dashboard.title")}</h1>
          {season && (
            <p className="text-muted-foreground text-sm mt-1 font-medium">
              {t("dashboard.subtitle")} — <span className="text-primary font-semibold">{season.name}</span>
            </p>
          )}
        </div>
        <Link to="/$orgSlug/games" params={{ orgSlug }} search={{ action: "new" }}>
          <Button variant="accent">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("gamesPage.actions.newGame")}</span>
          </Button>
        </Link>
      </div>

      {/* Hero Alert */}
      <HeroAlertBanner count={missingCount} isLoading={loading} orgSlug={orgSlug} t={t} />

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.cards.teams")}
          value={data?.counts.teams ?? 0}
          total={data?.counts.totalTeams}
          icon={<Users size={18} strokeWidth={2} />}
          isLoading={loading}
          index={0}
          href="/$orgSlug/teams"
          linkParams={{ orgSlug }}
        />
        <StatCard
          label={t("dashboard.cards.players")}
          value={data?.counts.players ?? 0}
          total={data?.counts.totalPlayers}
          icon={<Users size={18} strokeWidth={2} />}
          isLoading={loading}
          index={1}
          href="/$orgSlug/players"
          linkParams={{ orgSlug }}
        />
        <StatCard
          label={t("dashboard.cards.completed")}
          value={data?.counts.completed ?? 0}
          description={t("dashboard.cards.completedDesc")}
          icon={<CheckCircle2 size={18} strokeWidth={2} />}
          isLoading={loading}
          index={2}
          href="/$orgSlug/games"
          linkParams={{ orgSlug }}
          linkSearch={{ status: "completed" }}
        />
        <PublicReportsStatCard orgSlug={orgSlug} seasonId={season?.id} isSeasonReady={!!season?.id} t={t} />
      </div>

      {/* Upcoming + Suspensions — full width two columns */}
      <div className="grid gap-4 md:grid-cols-2">
        <UpcomingGamesCard games={data?.upcomingGames ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
        <ActiveSuspensionsCard
          suspensions={data?.activeSuspensions ?? []}
          isLoading={loading}
          t={t}
          orgSlug={orgSlug}
        />
      </div>

      {/* Season Insights: Scorers + Penalties */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopScorersCard scorers={data?.topScorers ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
        <TopPenalizedCard players={data?.topPenalized ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
      </div>

      {/* Recent Results */}
      <RecentResultsCard results={data?.recentResults ?? []} isLoading={loading} t={t} orgSlug={orgSlug} />
    </div>
  )
}
