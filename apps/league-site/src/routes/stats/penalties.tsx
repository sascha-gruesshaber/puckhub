import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router"
import { lazy } from "react"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { ChartSuspense, PenaltyTable } from "~/components/stats/statsTables"
import { StatsFilterBar } from "./scorers"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useSubRouteVisible } from "~/hooks/useSubRouteVisible"
import { useT } from "~/lib/i18n"
import { useLocalePath } from "~/lib/localizedRoutes"
import { trpc } from "../../../lib/trpc"

const PenaltyTeamChart = lazy(() => import("~/components/charts/penaltyTeamChart").then((m) => ({ default: m.PenaltyTeamChart })))
const PenaltyTypeChart = lazy(() => import("~/components/charts/penaltyTypeChart").then((m) => ({ default: m.PenaltyTypeChart })))

export const penaltiesSearchValidator = (s: Record<string, unknown>): { season?: string; team?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
  ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
})

export const Route = createFileRoute("/stats/penalties")({
  component: PenaltiesPage,
  head: () => ({ meta: [{ title: "Strafstatistiken" }] }),
  validateSearch: penaltiesSearchValidator,
})

export function PenaltiesPage() {
  const t = useT()
  const lp = useLocalePath()
  const visible = useSubRouteVisible("/stats/penalties")
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()
  const navigate: any = useNavigate()
  const { season: seasonParam, team: teamParam } = useSearch({ strict: false }) as { season?: string; team?: string }

  const selectedSeasonId = seasonParam ?? season.current?.id
  const selectedTeamId = teamParam || undefined

  const setSeasonId = (v: string) => navigate({ search: (p: any) => ({ ...p, season: v === season.current?.id ? undefined : v, team: undefined }), replace: true })
  const setTeamId = (v: string | undefined) => navigate({ search: (p: any) => ({ ...p, team: v || undefined }), replace: true })

  const shouldFetch = !!selectedSeasonId && visible !== false
  const { data: teams } = trpc.publicSite.listTeams.useQuery({ organizationId: org.id, seasonId: selectedSeasonId }, { enabled: shouldFetch, staleTime: 300_000 })
  const { data: penaltyStats, isLoading } = trpc.publicSite.getPenaltyStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId!, teamId: selectedTeamId },
    { enabled: shouldFetch, staleTime: 60_000 },
  )
  const { data: teamPenaltyStats } = trpc.publicSite.getTeamPenaltyStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch && features.advancedStats, staleTime: 60_000 },
  )

  if (visible === false) return <Navigate to={lp("/stats")} replace />

  const teamOptions = [...(teams ?? [])].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((t: any) => ({
    value: t.id, label: t.name,
    icon: <TeamLogo name={t.name} logoUrl={t.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />,
  }))

  return (
    <StatsPageShell title={t.statsPenalties.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSeasonId}>
      <StatsFilterBar teamOptions={teamOptions} teamValue={selectedTeamId} onTeamChange={setTeamId} />
      {features.advancedStats && !isLoading && teamPenaltyStats && teamPenaltyStats.length > 0 && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSuspense><PenaltyTeamChart stats={teamPenaltyStats} title={t.statsPenalties.byTeam} /></ChartSuspense>
          <ChartSuspense><PenaltyTypeChart stats={teamPenaltyStats} title={t.statsPenalties.types} /></ChartSuspense>
        </div>
      )}
      {isLoading ? <StatsTableSkeleton /> : (
        <PenaltyTable stats={penaltyStats ?? []} advancedStats={features.advancedStats} />
      )}
    </StatsPageShell>
  )
}
