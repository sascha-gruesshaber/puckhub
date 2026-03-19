import { createFileRoute, Navigate } from "@tanstack/react-router"
import { lazy, useMemo, useState } from "react"
import { EmptyState } from "~/components/shared/emptyState"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { ChartSuspense } from "~/components/stats/statsTables"
import { useSubRouteVisible } from "~/hooks/useSubRouteVisible"
import { useFeatures, useOrg } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { trpc } from "../../../lib/trpc"

const TeamComparisonRadar = lazy(() =>
  import("~/components/charts/teamComparisonRadar").then((m) => ({ default: m.TeamComparisonRadar })),
)
const TeamComparisonBar = lazy(() =>
  import("~/components/charts/teamComparisonBar").then((m) => ({ default: m.TeamComparisonBar })),
)
const TeamComparisonSelector = lazy(() =>
  import("~/components/charts/teamComparisonSelector").then((m) => ({ default: m.TeamComparisonSelector })),
)
const TeamComparisonProgression = lazy(() =>
  import("~/components/charts/teamComparisonProgression").then((m) => ({ default: m.TeamComparisonProgression })),
)

export const Route = createFileRoute("/stats/compare-teams")({
  component: ComparisonPage,
  head: () => ({ meta: [{ title: "Teamvergleich" }] }),
})

export function ComparisonPage() {
  const t = useT()
  const features = useFeatures()
  const visible = useSubRouteVisible("/stats/compare-teams")
  const org = useOrg()

  const [comparisonIds, setComparisonIds] = useState<string[]>([])

  const shouldFetch = visible !== false && features.advancedStats
  const { data } = trpc.publicSite.getAllTeamsHistory.useQuery(
    { organizationId: org.id },
    { enabled: shouldFetch, staleTime: 300_000 },
  )

  // Compute all-time totals per team for radar + bar charts
  const allTimeByTeam = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; goalsFor: number; goalsAgainst: number; pim: number }>()
    if (!data) return map
    for (const ts of data.teamSeasons) {
      let entry = map.get(ts.teamId)
      if (!entry) {
        entry = { wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, pim: 0 }
        map.set(ts.teamId, entry)
      }
      entry.wins += ts.wins
      entry.losses += ts.losses
      entry.goalsFor += ts.goalsFor
      entry.goalsAgainst += ts.goalsAgainst
      entry.pim += ts.pim
    }
    return map
  }, [data])

  // Build comparison data for selected teams
  const comparisonTeams = useMemo(() => {
    if (!data || comparisonIds.length < 2) return []
    return comparisonIds
      .map((id) => {
        const team = data.teams.find((t) => t.id === id)
        const totals = allTimeByTeam.get(id)
        if (!team || !totals) return null
        return {
          teamName: team.name,
          shortName: team.shortName ?? team.name,
          wins: totals.wins,
          losses: totals.losses,
          goalsFor: totals.goalsFor,
          goalsAgainst: totals.goalsAgainst,
          pim: totals.pim,
        }
      })
      .filter(Boolean) as Array<{
      teamName: string
      shortName: string
      wins: number
      losses: number
      goalsFor: number
      goalsAgainst: number
      pim: number
    }>
  }, [data, comparisonIds, allTimeByTeam])

  // Progression data for selected teams
  const progressionTeams = useMemo(() => {
    if (!data || comparisonIds.length < 2) return []
    return comparisonIds
      .map((id) => {
        const team = data.teams.find((t) => t.id === id)
        if (!team) return null
        return { id: team.id, shortName: team.shortName ?? team.name }
      })
      .filter(Boolean) as Array<{ id: string; shortName: string }>
  }, [data, comparisonIds])

  const progressionSeasonData = useMemo(() => {
    if (!data || comparisonIds.length < 2) return []
    return data.teamSeasons.filter((ts) => comparisonIds.includes(ts.teamId))
  }, [data, comparisonIds])

  if (!features.advancedStats || visible === false) return <Navigate to="/teams" replace />

  const toggleComparison = (teamId: string) =>
    setComparisonIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]))

  return (
    <StatsPageShell title={t.compareTeams.title}>
      {data && data.teams.length >= 2 ? (
        <div className="space-y-8">
          <ChartSuspense>
            <TeamComparisonSelector
              teams={[...data.teams]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((tm) => ({
                  id: tm.id,
                  name: tm.name,
                  shortName: tm.shortName ?? tm.name,
                  logoUrl: tm.logoUrl,
                }))}
              selectedIds={comparisonIds}
              onToggle={toggleComparison}
            />
          </ChartSuspense>

          {comparisonTeams.length >= 2 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartSuspense>
                  <TeamComparisonRadar teams={comparisonTeams} title={t.compareTeams.radarTitle} />
                </ChartSuspense>
                <ChartSuspense>
                  <TeamComparisonBar teams={comparisonTeams} title={t.compareTeams.barTitle} />
                </ChartSuspense>
              </div>
              {data.seasons.length > 0 && (
                <ChartSuspense>
                  <TeamComparisonProgression
                    teams={progressionTeams}
                    seasons={data.seasons}
                    teamSeasons={progressionSeasonData}
                    title={t.compareTeams.progressionTitle}
                  />
                </ChartSuspense>
              )}
            </>
          ) : (
            <p className="text-sm text-league-text/50">
              {comparisonIds.length === 1 ? t.compareTeams.hintOneMore : t.compareTeams.hintSelectTwo}
            </p>
          )}
        </div>
      ) : (
        <EmptyState title={t.compareTeams.notEnoughTeams} description={t.compareTeams.notEnoughTeamsDesc} />
      )}
    </StatsPageShell>
  )
}
