import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AlertTriangle, Calendar, CheckCircle2, Clock, ShieldAlert, Trophy, Users } from "lucide-react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/")({
  component: DashboardPage,
})

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  isLoading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <span className="text-muted-foreground">{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{value}</p>}
      </CardContent>
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
}: {
  reports: Array<{
    id: string
    scheduledAt: Date | null
    homeTeam: { id: string; shortName: string; logoUrl: string | null }
    awayTeam: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
}) {
  return (
    <Card>
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
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {t("dashboard.missingReports.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((game) => (
              <Link
                key={game.id}
                to="/games/$gameId/report"
                params={{ gameId: game.id }}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
              >
                <span className="font-medium">
                  {game.homeTeam.shortName} vs {game.awayTeam.shortName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {game.scheduledAt ? new Date(game.scheduledAt).toLocaleDateString() : "–"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
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
}: {
  games: Array<{
    id: string
    scheduledAt: Date | null
    homeTeam: { id: string; shortName: string; logoUrl: string | null }
    awayTeam: { id: string; shortName: string; logoUrl: string | null }
    venue: { id: string; name: string } | null
  }>
  isLoading: boolean
  t: (key: string) => string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-500" />
          <CardTitle className="text-sm font-medium">{t("dashboard.upcomingGames.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.upcomingGames.empty")}</p>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <div key={game.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                <span className="font-medium">
                  {game.homeTeam.shortName} vs {game.awayTeam.shortName}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {game.scheduledAt && (
                    <span>
                      {new Date(game.scheduledAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {game.venue && (
                    <span className="hidden sm:inline">
                      {t("dashboard.upcomingGames.at")} {game.venue.name}
                    </span>
                  )}
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
// Active Suspensions Card
// ---------------------------------------------------------------------------
function ActiveSuspensionsCard({
  suspensions,
  isLoading,
  t,
}: {
  suspensions: Array<{
    id: string
    suspendedGames: number
    servedGames: number
    player: { id: string; firstName: string; lastName: string }
    team: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
}) {
  return (
    <Card>
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
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : suspensions.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {t("dashboard.activeSuspensions.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {suspensions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                <div>
                  <span className="font-medium">
                    {s.player.firstName} {s.player.lastName}
                  </span>
                  <span className="text-muted-foreground ml-1.5 text-xs">{s.team.shortName}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t("dashboard.activeSuspensions.remaining")
                    .replace("{served}", String(s.servedGames))
                    .replace("{total}", String(s.suspendedGames))}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
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
}: {
  scorers: Array<{
    goals: number
    assists: number
    totalPoints: number
    player: { id: string; firstName: string; lastName: string }
    team: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
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
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.topScorers.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">{t("dashboard.topScorers.name")}</th>
                <th className="text-left pb-2 font-medium">{t("dashboard.topScorers.team")}</th>
                <th className="text-right pb-2 font-medium">{t("dashboard.topScorers.goals")}</th>
                <th className="text-right pb-2 font-medium">{t("dashboard.topScorers.assists")}</th>
                <th className="text-right pb-2 font-medium">{t("dashboard.topScorers.points")}</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr key={s.player.id} className="border-b last:border-0">
                  <td className="py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 font-medium">
                    {s.player.firstName.charAt(0)}. {s.player.lastName}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{s.team.shortName}</td>
                  <td className="py-1.5 text-right">{s.goals}</td>
                  <td className="py-1.5 text-right">{s.assists}</td>
                  <td className="py-1.5 text-right font-semibold">{s.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
}: {
  players: Array<{
    penaltyMinutes: number
    player: { id: string; firstName: string; lastName: string }
    team: { id: string; shortName: string; logoUrl: string | null }
  }>
  isLoading: boolean
  t: (key: string) => string
}) {
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
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.topPenalized.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">{t("dashboard.topPenalized.name")}</th>
                <th className="text-left pb-2 font-medium">{t("dashboard.topPenalized.team")}</th>
                <th className="text-right pb-2 font-medium">{t("dashboard.topPenalized.pim")}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((s, i) => (
                <tr key={s.player.id} className="border-b last:border-0">
                  <td className="py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 font-medium">
                    {s.player.firstName.charAt(0)}. {s.player.lastName}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{s.team.shortName}</td>
                  <td className="py-1.5 text-right font-semibold">{s.penaltyMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("dashboard.recentResults.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.recentResults.empty")}</p>
        ) : (
          <div className="space-y-1">
            {results.map((game) => (
              <Link
                key={game.id}
                to="/games/$gameId/report"
                params={{ gameId: game.id }}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {game.scheduledAt
                      ? new Date(game.scheduledAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "–"}
                  </span>
                  <span className="font-medium text-sm truncate">{game.homeTeam.shortName}</span>
                  <span className="text-lg font-bold tabular-nums">
                    {game.homeScore ?? 0} : {game.awayScore ?? 0}
                  </span>
                  <span className="font-medium text-sm truncate">{game.awayTeam.shortName}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {t("dashboard.recentResults.viewReport")}
                </span>
              </Link>
            ))}
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
          icon={<Users size={18} />}
          isLoading={loading}
        />
        <StatCard
          label={t("dashboard.cards.players")}
          value={data?.counts.players ?? 0}
          icon={<Users size={18} />}
          isLoading={loading}
        />
        <StatCard
          label={t("dashboard.cards.completed")}
          value={data?.counts.completed ?? 0}
          icon={<CheckCircle2 size={18} />}
          isLoading={loading}
        />
        <StatCard
          label={t("dashboard.cards.remaining")}
          value={data?.counts.remaining ?? 0}
          icon={<Clock size={18} />}
          isLoading={loading}
        />
      </div>

      {/* Row 2: Action Items */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.sections.actionItems")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MissingReportsCard reports={data?.missingReports ?? []} isLoading={loading} t={t} />
          <UpcomingGamesCard games={data?.upcomingGames ?? []} isLoading={loading} t={t} />
          <ActiveSuspensionsCard suspensions={data?.activeSuspensions ?? []} isLoading={loading} t={t} />
        </div>
      </div>

      {/* Row 3: Season Insights */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.sections.seasonInsights")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TopScorersCard scorers={data?.topScorers ?? []} isLoading={loading} t={t} />
          <TopPenalizedCard players={data?.topPenalized ?? []} isLoading={loading} t={t} />
        </div>
      </div>

      {/* Row 4: Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dashboard.sections.recentActivity")}</h2>
        <RecentResultsCard results={data?.recentResults ?? []} isLoading={loading} t={t} />
      </div>
    </div>
  )
}
