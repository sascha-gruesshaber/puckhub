import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router"
import { lazy, useMemo } from "react"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { ChartSuspense, PlayerTable } from "~/components/stats/statsTables"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { useSubRouteVisible } from "~/hooks/useSubRouteVisible"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { useLocalePath } from "~/lib/localizedRoutes"
import { trpc } from "../../../lib/trpc"
import { StatsFilterBar } from "./scorers"

const ScorerChart = lazy(() => import("~/components/charts/scorerChart").then((m) => ({ default: m.ScorerChart })))

export const goalsSearchValidator = (
  s: Record<string, unknown>,
): { season?: string; team?: string; position?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
  ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
  ...(typeof s.position === "string" && s.position ? { position: s.position } : {}),
})

export const Route = createFileRoute("/stats/goals")({
  component: GoalsPage,
  head: () => ({ meta: [{ title: "Torstatistiken" }] }),
  validateSearch: goalsSearchValidator,
})

export function GoalsPage() {
  const t = useT()
  const lp = useLocalePath()
  const visible = useSubRouteVisible("/stats/goals")
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()
  const filterNavigate = useFilterNavigate()
  const {
    season: seasonParam,
    team: teamParam,
    position: positionParam,
  } = useSearch({ strict: false }) as { season?: string; team?: string; position?: string }

  const selectedSeasonId = seasonParam ?? season.current?.id
  const selectedTeamId = teamParam || undefined
  const selectedPosition = positionParam as "forward" | "defense" | undefined

  const setSeasonId = (v: string) =>
    filterNavigate({
      search: (p: any) => ({ ...p, season: v === season.current?.id ? undefined : v, team: undefined }),
    })
  const setTeamId = (v: string | undefined) => filterNavigate({ search: (p: any) => ({ ...p, team: v || undefined }) })
  const setPosition = (v: string | undefined) =>
    filterNavigate({ search: (p: any) => ({ ...p, position: v || undefined }) })

  const shouldFetch = !!selectedSeasonId && visible !== false
  const { data: teams } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId },
    { enabled: shouldFetch, staleTime: 300_000 },
  )
  const { data: playerStats, isLoading } = trpc.publicSite.getPlayerStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId!, teamId: selectedTeamId, position: selectedPosition },
    { enabled: shouldFetch, staleTime: 60_000 },
  )

  const teamOptions = [...(teams ?? [])]
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((t: any) => ({
      value: t.id,
      label: t.name,
      icon: <TeamLogo name={t.name} logoUrl={t.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />,
    }))

  const sorted = useMemo(() => {
    if (!playerStats) return []
    return [...playerStats].sort((a, b) => b.goals - a.goals || b.totalPoints - a.totalPoints)
  }, [playerStats])

  if (visible === false) return <Navigate to={lp("/stats")} replace />

  return (
    <StatsPageShell title={t.statsGoals.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSeasonId}>
      <StatsFilterBar
        teamOptions={teamOptions}
        teamValue={selectedTeamId}
        onTeamChange={setTeamId}
        position={selectedPosition}
        onPositionChange={setPosition}
        showPosition
      />
      {features.advancedStats && !isLoading && sorted.length > 0 && (
        <div className="mb-8">
          <ChartSuspense>
            <ScorerChart stats={sorted} mode="goals" title={t.statsGoals.topScorers} limit={10} />
          </ChartSuspense>
        </div>
      )}
      {isLoading ? <StatsTableSkeleton /> : <PlayerTable stats={sorted} sortBy="goals" />}
    </StatsPageShell>
  )
}
