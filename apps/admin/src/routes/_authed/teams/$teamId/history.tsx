import { Badge, Card, CardContent, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Calendar, MapPin, Shield, Swords } from "lucide-react"
import { useMemo } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { AllTimeStats } from "~/components/teamHistory/allTimeStats"
import { SeasonTimeline, TimelineSkeleton } from "~/components/teamHistory/seasonTimeline"
import { TeamProgressionCharts } from "~/components/teamHistory/teamProgressionCharts"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/teams/$teamId/history")({
  loader: async ({ context, params }) => {
    await context.trpcQueryUtils?.team.history.ensureData({ teamId: params.teamId })
  },
  component: TeamHistoryPage,
})

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function TeamHistoryPage() {
  usePermissionGuard("teams")
  const { t } = useTranslation("common")
  const { teamId } = Route.useParams()

  const { data, isLoading } = trpc.team.history.useQuery({ teamId })

  const team = data?.team
  const seasons = data?.seasons ?? []
  const contracts = data?.contracts ?? []
  const topScorers = data?.topScorers ?? []
  const topGoalies = data?.topGoalies ?? []

  // Career summary badges
  const summary = useMemo(() => {
    if (seasons.length === 0) return null
    const totalGames = seasons.reduce((sum, s) => sum + s.totals.gamesPlayed, 0)
    const totalWins = seasons.reduce((sum, s) => sum + s.totals.wins, 0)
    const totalDraws = seasons.reduce((sum, s) => sum + s.totals.draws, 0)
    const totalLosses = seasons.reduce((sum, s) => sum + s.totals.losses, 0)
    return { totalGames, totalWins, totalDraws, totalLosses }
  }, [seasons])

  // Not found
  if (!isLoading && !team) {
    return (
      <div className="space-y-6">
        <Link
          to="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("teamsPage.history.backToTeams")}
        </Link>
        <EmptyState
          icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("teamsPage.history.notFoundTitle")}
          description={t("teamsPage.history.notFoundDescription")}
        />
      </div>
    )
  }

  const initials = team ? team.shortName.substring(0, 2).toUpperCase() : ""

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("teamsPage.history.backToTeams")}
      </Link>

      {/* Profile header card */}
      {isLoading ? (
        <ProfileSkeleton />
      ) : team ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                style={{
                  background: team.logoUrl ? "transparent" : team.primaryColor ? `${team.primaryColor}18` : "hsl(var(--muted))",
                }}
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain" />
                ) : (
                  <span
                    className="text-2xl font-bold"
                    style={{ color: team.primaryColor ?? "hsl(var(--muted-foreground))" }}
                  >
                    {initials}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold truncate">{team.name}</h1>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {team.shortName}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {team.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {team.city}
                    </span>
                  )}
                  {team.homeVenue && (
                    <>
                      {team.city && <span>&middot;</span>}
                      <span>{team.homeVenue}</span>
                    </>
                  )}
                </div>
                {summary && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("teamsPage.history.seasonCount", { count: seasons.length })}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Swords className="h-3 w-3" />
                      {t("teamsPage.history.gameCount", { count: summary.totalGames })}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      {summary.totalWins}W {summary.totalDraws}D {summary.totalLosses}L
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* All-Time Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : seasons.length > 0 ? (
        <AllTimeStats seasons={seasons} isLoading={false} />
      ) : null}

      {/* Progression Charts */}
      {!isLoading && <TeamProgressionCharts seasons={seasons} />}

      {/* Season Timeline */}
      <div>
        {isLoading ? (
          <TimelineSkeleton />
        ) : seasons.length > 0 ? (
          <SeasonTimeline
            seasons={seasons}
            contracts={contracts}
            topScorers={topScorers}
            topGoalies={topGoalies}
          />
        ) : !isLoading ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.history.noSeasonsTitle")}
            description={t("teamsPage.history.noSeasonsDescription")}
          />
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-40 rounded mb-3" />
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
