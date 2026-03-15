import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { lazy } from "react"
import { FilterDropdown } from "~/components/shared/filterDropdown"
import { FilterPill } from "~/components/shared/filterPill"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { StatsSummaryCards } from "~/components/shared/statsSummaryCards"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { ChartSuspense, PlayerTable } from "~/components/stats/statsTables"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useSubRouteVisible } from "~/hooks/useSubRouteVisible"
import { useT } from "~/lib/i18n"
import { useLocalePath } from "~/lib/localizedRoutes"
import { trpc } from "../../../lib/trpc"

const ScorerChart = lazy(() => import("~/components/charts/scorerChart").then((m) => ({ default: m.ScorerChart })))

export const scorersSearchValidator = (
  s: Record<string, unknown>,
): { season?: string; team?: string; position?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
  ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
  ...(typeof s.position === "string" && s.position ? { position: s.position } : {}),
})

export const Route = createFileRoute("/stats/scorers")({
  component: ScorersPage,
  head: () => ({ meta: [{ title: "Scorer-Statistiken" }] }),
  validateSearch: scorersSearchValidator,
})

export function ScorersPage() {
  const t = useT()
  const lp = useLocalePath()
  const visible = useSubRouteVisible("/stats/scorers")
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
  const { data: summaryPlayerStats } = trpc.publicSite.getPlayerStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch && features.advancedStats, staleTime: 60_000 },
  )
  const { data: summaryGoalieData } = trpc.publicSite.getGoalieStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch && features.advancedStats, staleTime: 60_000 },
  )
  const { data: summaryPenaltyStats } = trpc.publicSite.getPenaltyStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: shouldFetch && features.advancedStats, staleTime: 60_000 },
  )

  if (visible === false) return <Navigate to={lp("/stats")} replace />

  const teamOptions = [...(teams ?? [])]
    .sort((a: any, b: any) => a.name.localeCompare(b.name, "de"))
    .map((t: any) => ({
      value: t.id,
      label: t.name,
      icon: <TeamLogo name={t.name} logoUrl={t.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />,
    }))

  return (
    <StatsPageShell title={t.statsScorers.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSeasonId}>
      <StatsFilterBar
        teamOptions={teamOptions}
        teamValue={selectedTeamId}
        onTeamChange={setTeamId}
        position={selectedPosition}
        onPositionChange={setPosition}
        showPosition
      />
      {features.advancedStats && summaryPlayerStats && (
        <StatsSummaryCards
          playerStats={summaryPlayerStats}
          goalieStats={summaryGoalieData ?? null}
          penaltyStats={summaryPenaltyStats ?? []}
        />
      )}
      {features.advancedStats && !isLoading && playerStats && playerStats.length > 0 && (
        <div className="mb-8">
          <ChartSuspense>
            <ScorerChart stats={playerStats} mode="stacked" title={t.statsScorers.topScorers} limit={10} />
          </ChartSuspense>
        </div>
      )}
      {isLoading ? (
        <StatsTableSkeleton />
      ) : (
        <PlayerTable stats={playerStats ?? []} sortBy="scorers" advancedStats={features.advancedStats} />
      )}
    </StatsPageShell>
  )
}

// ---------------------------------------------------------------------------
// Shared filter bar used across all skater + goalie + penalty stats pages
// ---------------------------------------------------------------------------

interface StatsFilterBarProps {
  teamOptions: Array<{ value: string; label: string; icon?: React.ReactNode }>
  teamValue: string | undefined
  onTeamChange: (v: string | undefined) => void
  position?: string | undefined
  onPositionChange?: (v: string | undefined) => void
  showPosition?: boolean
}

function StatsFilterBar({
  teamOptions,
  teamValue,
  onTeamChange,
  position,
  onPositionChange,
  showPosition,
}: StatsFilterBarProps) {
  const t = useT()
  if (teamOptions.length === 0 && !showPosition) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {teamOptions.length > 0 && (
        <FilterDropdown
          label={t.schedule.allTeams}
          options={teamOptions}
          value={teamValue ? [teamValue] : []}
          onChange={(v) => onTeamChange(v[0] || undefined)}
          singleSelect
        />
      )}
      {showPosition && onPositionChange && (
        <>
          {teamOptions.length > 0 && <div className="w-px h-5 bg-league-text/10 mx-1" />}
          <FilterPill
            label={t.statsScorers.allPositions}
            active={position === undefined}
            onClick={() => onPositionChange(undefined)}
          />
          <FilterPill
            label={t.positions.forward}
            active={position === "forward"}
            onClick={() => onPositionChange("forward")}
          />
          <FilterPill
            label={t.positions.defense}
            active={position === "defense"}
            onClick={() => onPositionChange("defense")}
          />
        </>
      )}
    </div>
  )
}

export { StatsFilterBar }
