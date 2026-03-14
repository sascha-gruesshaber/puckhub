import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router"
import { lazy } from "react"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { StatsSummaryCards } from "~/components/shared/statsSummaryCards"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { ChartSuspense } from "~/components/stats/statsTables"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { useLocalePath } from "~/lib/localizedRoutes"
import { trpc } from "../../../lib/trpc"

const ScorerChart = lazy(() => import("~/components/charts/scorerChart").then((m) => ({ default: m.ScorerChart })))
const GoalieChart = lazy(() => import("~/components/charts/goalieChart").then((m) => ({ default: m.GoalieChart })))

const searchValidator = (s: Record<string, unknown>): { season?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
})

export const Route = createFileRoute("/stats/")({
  component: StatsIndex,
  head: () => ({ meta: [{ title: "Statistics" }] }),
  validateSearch: searchValidator,
})

export function StatsIndex() {
  const t = useT()
  const features = useFeatures()
  const lp = useLocalePath()
  const org = useOrg()
  const season = useSeason()
  const navigate: any = useNavigate()
  const { season: seasonParam } = useSearch({ strict: false }) as { season?: string }
  const selectedSeasonId = seasonParam ?? season.current?.id

  // When advancedStats is not enabled, redirect to the first sub-page
  if (!features.advancedStats) {
    return <Navigate to={lp("/stats/scorers")} replace />
  }

  const setSelectedSeasonId = (v: string) =>
    navigate({ search: { season: v === season.current?.id ? undefined : v }, replace: true })

  const shouldFetch = !!selectedSeasonId
  const { data: playerStats, isLoading: playerLoading } = trpc.publicSite.getPlayerStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch, staleTime: 60_000 },
  )
  const { data: goalieData, isLoading: goalieLoading } = trpc.publicSite.getGoalieStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch, staleTime: 60_000 },
  )
  const { data: penaltyStats } = trpc.publicSite.getPenaltyStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch, staleTime: 60_000 },
  )

  const isLoading = playerLoading || goalieLoading
  const topScorers = [...(playerStats ?? [])].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10)

  return (
    <StatsPageShell title={t.statsOverview.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSelectedSeasonId}>
      {playerStats && (
        <StatsSummaryCards
          playerStats={playerStats}
          goalieStats={goalieData ?? null}
          penaltyStats={penaltyStats ?? []}
        />
      )}
      {isLoading ? (
        <StatsTableSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSuspense>
            <ScorerChart stats={topScorers} mode="stacked" title={t.statsOverview.top10Scorers} limit={10} />
          </ChartSuspense>
          <ChartSuspense>
            <GoalieChart stats={goalieData?.qualified ?? []} title={t.statsOverview.goaliesQualified} />
          </ChartSuspense>
        </div>
      )}
    </StatsPageShell>
  )
}
