import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { lazy } from "react"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { ChartSuspense, GoalieTable } from "~/components/stats/statsTables"
import { StatsFilterBar } from "./scorers"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useSubRouteVisible } from "~/hooks/useSubRouteVisible"
import { useT } from "~/lib/i18n"
import { useLocalePath } from "~/lib/localizedRoutes"
import { trpc } from "../../../lib/trpc"

const GoalieChart = lazy(() => import("~/components/charts/goalieChart").then((m) => ({ default: m.GoalieChart })))

export const goaliesSearchValidator = (s: Record<string, unknown>): { season?: string; team?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
  ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
})

export const Route = createFileRoute("/stats/goalies")({
  component: GoaliesPage,
  head: () => ({ meta: [{ title: "Torhüter-Statistiken" }] }),
  validateSearch: goaliesSearchValidator,
})

export function GoaliesPage() {
  const t = useT()
  const lp = useLocalePath()
  const visible = useSubRouteVisible("/stats/goalies")
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()
  const filterNavigate = useFilterNavigate()
  const { season: seasonParam, team: teamParam } = useSearch({ strict: false }) as { season?: string; team?: string }

  const selectedSeasonId = seasonParam ?? season.current?.id
  const selectedTeamId = teamParam || undefined

  const setSeasonId = (v: string) =>
    filterNavigate({
      search: (p: any) => ({ ...p, season: v === season.current?.id ? undefined : v, team: undefined }),
    })
  const setTeamId = (v: string | undefined) => filterNavigate({ search: (p: any) => ({ ...p, team: v || undefined }) })

  const shouldFetch = !!selectedSeasonId && visible !== false
  const { data: teams } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId },
    { enabled: shouldFetch, staleTime: 300_000 },
  )
  const { data: goalieData, isLoading } = trpc.publicSite.getGoalieStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId!, teamId: selectedTeamId },
    { enabled: shouldFetch, staleTime: 60_000 },
  )

  if (visible === false) return <Navigate to={lp("/stats")} replace />

  const teamOptions = [...(teams ?? [])]
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((t: any) => ({
      value: t.id,
      label: t.name,
      icon: <TeamLogo name={t.name} logoUrl={t.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />,
    }))

  return (
    <StatsPageShell title={t.statsGoalies.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSeasonId}>
      <StatsFilterBar teamOptions={teamOptions} teamValue={selectedTeamId} onTeamChange={setTeamId} />
      {features.advancedStats && !isLoading && goalieData && goalieData.qualified.length > 0 && (
        <div className="mb-8">
          <ChartSuspense>
            <GoalieChart stats={goalieData.qualified} title={t.statsGoalies.comparison} />
          </ChartSuspense>
        </div>
      )}
      {isLoading ? (
        <StatsTableSkeleton />
      ) : (
        <GoalieTable
          data={goalieData ?? { qualified: [], belowThreshold: [], minGames: 7 }}
          advancedStats={features.advancedStats}
        />
      )}
    </StatsPageShell>
  )
}
