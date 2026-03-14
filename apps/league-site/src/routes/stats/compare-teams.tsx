import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router"
import { lazy, useMemo, useState } from "react"
import { EmptyState } from "~/components/shared/emptyState"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { ChartSuspense } from "~/components/stats/statsTables"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { useSubRouteVisible } from "~/hooks/useSubRouteVisible"
import { useLocalePath } from "~/lib/localizedRoutes"
import { trpc } from "../../../lib/trpc"

const TeamComparisonRadar = lazy(() => import("~/components/charts/teamComparisonRadar").then((m) => ({ default: m.TeamComparisonRadar })))
const TeamComparisonBar = lazy(() => import("~/components/charts/teamComparisonBar").then((m) => ({ default: m.TeamComparisonBar })))
const TeamComparisonSelector = lazy(() => import("~/components/charts/teamComparisonSelector").then((m) => ({ default: m.TeamComparisonSelector })))

export const compareTeamsSearchValidator = (s: Record<string, unknown>): { season?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
})

export const Route = createFileRoute("/stats/compare-teams")({
  component: ComparisonPage,
  head: () => ({ meta: [{ title: "Teamvergleich" }] }),
  validateSearch: compareTeamsSearchValidator,
})

export function ComparisonPage() {
  const t = useT()
  const features = useFeatures()
  const lp = useLocalePath()
  const visible = useSubRouteVisible("/stats/compare-teams")
  const org = useOrg()
  const season = useSeason()
  const navigate: any = useNavigate()
  const { season: seasonParam } = useSearch({ strict: false }) as { season?: string }

  const selectedSeasonId = seasonParam ?? season.current?.id
  const setSeasonId = (v: string) => navigate({ search: { season: v === season.current?.id ? undefined : v }, replace: true })

  const [comparisonIds, setComparisonIds] = useState<string[]>([])

  const shouldFetch = !!selectedSeasonId && visible !== false && features.advancedStats
  const { data: teams } = trpc.publicSite.listTeams.useQuery({ organizationId: org.id, seasonId: selectedSeasonId }, { enabled: shouldFetch, staleTime: 300_000 })

  const { data: seasonStructure } = trpc.publicSite.getSeasonRoundInfo.useQuery({ organizationId: org.id, seasonId: selectedSeasonId! }, { enabled: shouldFetch, staleTime: 300_000 })
  const { data: teamPenaltyStats } = trpc.publicSite.getTeamPenaltyStats.useQuery({ organizationId: org.id, seasonId: selectedSeasonId! }, { enabled: shouldFetch, staleTime: 60_000 })

  const firstRoundId = useMemo(() => {
    if (!seasonStructure) return null
    for (const div of seasonStructure) {
      for (const round of div.rounds) {
        if (round.roundType === "regular") return round.id
      }
    }
    return seasonStructure[0]?.rounds?.[0]?.id ?? null
  }, [seasonStructure])

  const { data: standings } = trpc.publicSite.getStandings.useQuery({ organizationId: org.id, roundId: firstRoundId! }, { enabled: !!firstRoundId && shouldFetch, staleTime: 60_000 })

  if (!features.advancedStats || visible === false) return <Navigate to="/teams" replace />

  const comparisonTeams = useMemo(() => {
    if (!standings || comparisonIds.length < 2) return []
    return comparisonIds.map((id) => {
      const s = standings.find((st: any) => st.team.id === id)
      if (!s) return null
      const tp = teamPenaltyStats?.find((t: any) => t.team?.id === id)
      return { teamName: s.team.name, shortName: s.team.shortName, wins: s.wins, losses: s.losses, goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, pim: tp?.totalMinutes ?? 0 }
    }).filter(Boolean) as any[]
  }, [standings, comparisonIds, teamPenaltyStats])

  const toggleComparison = (teamId: string) => setComparisonIds((prev) => prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId])

  return (
    <StatsPageShell title={t.compareTeams.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSeasonId}>
      {teams && teams.length >= 2 ? (
        <div className="space-y-8">
          <ChartSuspense>
            <TeamComparisonSelector
              teams={[...teams].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((tm: any) => ({ id: tm.id, name: tm.name, shortName: tm.shortName ?? tm.name, logoUrl: tm.logoUrl }))}
              selectedIds={comparisonIds}
              onToggle={toggleComparison}
            />
          </ChartSuspense>

          {comparisonTeams.length >= 2 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSuspense>
                <TeamComparisonRadar teams={comparisonTeams} title={t.compareTeams.radarTitle} />
              </ChartSuspense>
              <ChartSuspense>
                <TeamComparisonBar teams={comparisonTeams} title={t.compareTeams.barTitle} />
              </ChartSuspense>
            </div>
          ) : (
            <p className="text-sm text-league-text/50">
              {comparisonIds.length === 1
                ? t.compareTeams.hintOneMore
                : t.compareTeams.hintSelectTwo}
            </p>
          )}
        </div>
      ) : (
        <EmptyState title={t.compareTeams.notEnoughTeams} description={t.compareTeams.notEnoughTeamsDesc} />
      )}
    </StatsPageShell>
  )
}
