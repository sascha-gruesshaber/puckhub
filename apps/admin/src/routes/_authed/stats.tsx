import { Button, Skeleton } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BarChart3, RefreshCw } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { PageHeader } from "~/components/pageHeader"
import { GoalieChart } from "~/components/stats/goalieChart"
import { GoalieTable } from "~/components/stats/goalieTable"
import { PenaltyPlayerTable } from "~/components/stats/penaltyPlayerTable"
import { PenaltyTeamChart } from "~/components/stats/penaltyTeamChart"
import { PenaltyTypeChart } from "~/components/stats/penaltyTypeChart"
import { ScorerChart } from "~/components/stats/scorerChart"
import { ScorerTable } from "~/components/stats/scorerTable"
import { StatsSummaryCards } from "~/components/stats/statsSummaryCards"
import { StatsRoundInfo } from "~/components/stats/statsRoundInfo"
import { StatsTabNavigation, type StatsTab } from "~/components/stats/statsTabNavigation"
import { TeamComparisonBar } from "~/components/stats/teamComparisonBar"
import { TeamComparisonRadar, type TeamRadarData } from "~/components/stats/teamComparisonRadar"
import { TeamComparisonSelector } from "~/components/stats/teamComparisonSelector"
import { TeamStandingsTable } from "~/components/stats/teamStandingsTable"
import { TeamFilterPills, FILTER_ALL } from "~/components/teamFilterPills"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/stats")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: string; team?: string; position?: string; round?: string } => ({
    ...(typeof s.tab === "string" && s.tab ? { tab: s.tab } : {}),
    ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
    ...(typeof s.position === "string" && s.position ? { position: s.position } : {}),
    ...(typeof s.round === "string" && s.round ? { round: s.round } : {}),
  }),
  component: StatsPage,
})

function StatsPage() {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()
  const navigate = useNavigate({ from: Route.fullPath })
  const { tab, team, position, round } = Route.useSearch()

  const activeTab = ((tab ?? "overview") as StatsTab)
  const teamFilter = team ?? FILTER_ALL
  const positionFilter = position ?? "all"
  const selectedRoundId = round ?? ""

  const setTab = useCallback(
    (v: StatsTab) => navigate({ search: (prev) => ({ ...prev, tab: v === "overview" ? undefined : v }), replace: true }),
    [navigate],
  )
  const setTeamFilter = useCallback(
    (v: string) =>
      navigate({ search: (prev) => ({ ...prev, team: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )
  const setPositionFilter = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, position: v === "all" ? undefined : v }), replace: true }),
    [navigate],
  )
  const setSelectedRound = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, round: v || undefined }), replace: true }),
    [navigate],
  )

  const seasonId = season?.id ?? ""
  const enabled = !!seasonId

  // Queries
  const { data: roundInfo, isLoading: roundInfoLoading } = trpc.stats.seasonRoundInfo.useQuery(
    { seasonId },
    { enabled },
  )
  const { data: playerStats, isLoading: playerStatsLoading } = trpc.stats.playerStats.useQuery(
    {
      seasonId,
      teamId: teamFilter !== FILTER_ALL ? teamFilter : undefined,
      position: positionFilter !== "all" ? (positionFilter as "forward" | "defense") : undefined,
    },
    { enabled },
  )
  const { data: goalieStats, isLoading: goalieStatsLoading } = trpc.stats.goalieStats.useQuery(
    { seasonId, teamId: teamFilter !== FILTER_ALL ? teamFilter : undefined },
    { enabled },
  )
  const { data: penaltyStats, isLoading: penaltyStatsLoading } = trpc.stats.penaltyStats.useQuery(
    { seasonId, teamId: teamFilter !== FILTER_ALL ? teamFilter : undefined },
    { enabled },
  )
  const { data: teamPenaltyStats } = trpc.stats.teamPenaltyStats.useQuery({ seasonId }, { enabled })

  // Teams — used for filter pills + teams tab
  const { data: teams } = trpc.team.list.useQuery(undefined, { enabled })

  // Standings for the selected round
  const { data: standings } = trpc.standings.getByRound.useQuery(
    { roundId: selectedRoundId },
    { enabled: !!selectedRoundId },
  )

  // Recalculate mutation
  const utils = trpc.useUtils()
  const recalculateMutation = trpc.stats.recalculate.useMutation({
    onSuccess: () => {
      // Invalidate all stats queries to refetch fresh data
      utils.stats.invalidate()
      utils.standings.invalidate()
    },
  })

  // Team comparison state
  const [comparisonTeamIds, setComparisonTeamIds] = useState<string[]>([])
  const [comparisonChartType, setComparisonChartType] = useState<"radar" | "bar">("bar")

  // Use teams from team.list for filter pills (always populated, unlike playerStats which may be empty)
  const teamsForFilter = useMemo(() => {
    if (!teams) return []
    return teams.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, logoUrl: t.logoUrl }))
  }, [teams])

  // Auto-select first round when rounds load
  const allRounds = useMemo(() => {
    if (!roundInfo) return []
    return roundInfo.flatMap((d) => d.rounds.map((r) => ({ ...r, divisionName: d.name })))
  }, [roundInfo])

  // Set initial round if none selected
  useMemo(() => {
    if (allRounds.length > 0 && !selectedRoundId) {
      setSelectedRound(allRounds[0]!.id)
    }
  }, [allRounds, selectedRoundId, setSelectedRound])

  // Compute total games from player stats (approximate from max gamesPlayed across all players)
  const totalGames = useMemo(() => {
    if (!playerStats?.length) return 0
    return Math.max(...playerStats.map((s) => s.gamesPlayed), 0)
  }, [playerStats])

  // Radar data
  const radarData = useMemo((): TeamRadarData[] => {
    if (!comparisonTeamIds.length || !standings || !teamPenaltyStats || !teams) return []
    return comparisonTeamIds
      .map((id) => {
        const team = teams.find((t) => t.id === id)
        const standing = standings.find((s) => s.teamId === id)
        const penalty = teamPenaltyStats.find((p) => p.team?.id === id)
        if (!team) return null
        return {
          teamName: team.name,
          shortName: team.shortName,
          wins: standing?.wins ?? 0,
          losses: standing?.losses ?? 0,
          goalsFor: standing?.goalsFor ?? 0,
          goalsAgainst: standing?.goalsAgainst ?? 0,
          pim: penalty?.totalMinutes ?? 0,
        }
      })
      .filter((d): d is TeamRadarData => d !== null)
  }, [comparisonTeamIds, standings, teamPenaltyStats, teams])

  function toggleComparisonTeam(teamId: string) {
    setComparisonTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    )
  }

  // No season
  if (!season) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("statsPage.title")} />
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("statsPage.title")}
          description={t("statsPage.noSeason")}
        />
      </div>
    )
  }

  const isLoading = playerStatsLoading || goalieStatsLoading || penaltyStatsLoading || roundInfoLoading
  const hasData =
    (playerStats?.length ?? 0) > 0 ||
    (penaltyStats?.length ?? 0) > 0 ||
    ((goalieStats?.qualified.length ?? 0) + (goalieStats?.belowThreshold.length ?? 0)) > 0

  // Show position filters on scorer/goals/assists tabs
  const showPositionFilter = activeTab === "scorers" || activeTab === "goals" || activeTab === "assists"
  // Show team filter on all tabs except teams
  const showTeamFilter = activeTab !== "teams"

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("statsPage.title")}
        description={season.name}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculateMutation.mutate({ seasonId })}
            disabled={recalculateMutation.isPending || !seasonId}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
            {recalculateMutation.isPending ? t("statsPage.recalculating") : t("statsPage.recalculate")}
          </Button>
        }
      />

      {/* Round info banner */}
      {roundInfo && <StatsRoundInfo divisions={roundInfo} />}

      {/* Tab navigation */}
      <StatsTabNavigation activeTab={activeTab} onTabChange={setTab} />

      {/* Filters */}
      {showTeamFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          {isLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-full" />
              ))}
            </div>
          ) : (
            <>
              <TeamFilterPills
                teams={teamsForFilter}
                activeFilter={teamFilter}
                onFilterChange={setTeamFilter}
                showAll
                translationPrefix="statsPage.filters"
              />
              {showPositionFilter && (
                <>
                  <div className="h-5 w-px bg-border mx-1" />
                  <FilterPill
                    label={t("statsPage.filters.allPositions")}
                    active={positionFilter === "all"}
                    onClick={() => setPositionFilter("all")}
                  />
                  <FilterPill
                    label={t("statsPage.filters.forward")}
                    active={positionFilter === "forward"}
                    onClick={() => setPositionFilter("forward")}
                  />
                  <FilterPill
                    label={t("statsPage.filters.defense")}
                    active={positionFilter === "defense"}
                    onClick={() => setPositionFilter("defense")}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasData && (
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("statsPage.noData")}
          description={t("statsPage.noDataDescription")}
        />
      )}

      {/* Tab content */}
      {!isLoading && hasData && (
        <>
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <StatsSummaryCards
                playerStats={playerStats ?? []}
                goalieStats={goalieStats ?? null}
                penaltyStats={penaltyStats ?? []}
                totalGames={totalGames}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                  <ScorerChart
                    stats={playerStats ?? []}
                    mode="stacked"
                    title={t("statsPage.scorers.chartTitle")}
                    limit={10}
                  />
                </div>
                {goalieStats && goalieStats.qualified.length > 0 && (
                  <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                    <GoalieChart
                      stats={goalieStats.qualified.slice(0, 10)}
                      title={t("statsPage.goalies.chartTitle")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scorers */}
          {activeTab === "scorers" && (
            <div className="space-y-6">
              <ScorerTable stats={playerStats ?? []} sortBy="points" />
              <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                <ScorerChart
                  stats={playerStats ?? []}
                  mode="stacked"
                  title={t("statsPage.scorers.chartTitle")}
                />
              </div>
            </div>
          )}

          {/* Goals */}
          {activeTab === "goals" && (
            <div className="space-y-6">
              <ScorerTable stats={playerStats ?? []} sortBy="goals" />
              <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                <ScorerChart
                  stats={playerStats ?? []}
                  mode="goals"
                  title={t("statsPage.goalsTab.chartTitle")}
                />
              </div>
            </div>
          )}

          {/* Assists */}
          {activeTab === "assists" && (
            <div className="space-y-6">
              <ScorerTable stats={playerStats ?? []} sortBy="assists" />
              <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                <ScorerChart
                  stats={playerStats ?? []}
                  mode="assists"
                  title={t("statsPage.assistsTab.chartTitle")}
                />
              </div>
            </div>
          )}

          {/* Penalties */}
          {activeTab === "penalties" && (
            <div className="space-y-6">
              <PenaltyPlayerTable stats={penaltyStats ?? []} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {teamPenaltyStats && (
                  <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                    <PenaltyTeamChart
                      stats={teamPenaltyStats}
                      title={t("statsPage.penalties.teamChartTitle")}
                    />
                  </div>
                )}
                {teamPenaltyStats && (
                  <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                    <PenaltyTypeChart
                      stats={teamPenaltyStats}
                      title={t("statsPage.penalties.typeChartTitle")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goalies */}
          {activeTab === "goalies" && goalieStats && (
            <div className="space-y-6">
              <GoalieTable
                qualified={goalieStats.qualified}
                belowThreshold={goalieStats.belowThreshold}
                minGames={goalieStats.minGames}
              />
              {goalieStats.qualified.length > 0 && (
                <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                  <GoalieChart
                    stats={goalieStats.qualified}
                    title={t("statsPage.goalies.chartTitle")}
                  />
                </div>
              )}
            </div>
          )}

          {/* Teams */}
          {activeTab === "teams" && (
            <div className="space-y-6">
              {/* Round selector grouped by division */}
              <div className="space-y-3">
                {roundInfo?.map((division) => {
                  const divRounds = allRounds.filter((r) => r.divisionName === division.name)
                  if (divRounds.length === 0) return null
                  return (
                    <div key={division.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[100px]">
                        {division.name}:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {divRounds.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRound(r.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                              selectedRoundId === r.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-white border border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Standings */}
              {standings && standings.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide mb-2">
                    {t("statsPage.teamsTab.standings")}
                  </h3>
                  <TeamStandingsTable standings={standings} teams={teams ?? []} />
                </div>
              ) : selectedRoundId ? (
                <p className="text-sm text-muted-foreground">{t("statsPage.teamsTab.noStandings")}</p>
              ) : null}

              {/* Team penalty comparison */}
              {teamPenaltyStats && teamPenaltyStats.length > 0 && (
                <div className="bg-white rounded-xl border border-border/50 shadow-sm p-4">
                  <PenaltyTeamChart
                    stats={teamPenaltyStats}
                    title={t("statsPage.teamsTab.penaltyComparison")}
                  />
                </div>
              )}

              {/* Team comparison */}
              {teams && teams.length > 0 && (
                <div className="bg-white rounded-xl border border-border/50 shadow-sm p-6 space-y-4">
                  <TeamComparisonSelector
                    teams={teams}
                    selectedIds={comparisonTeamIds}
                    onToggle={toggleComparisonTeam}
                  />
                  {comparisonTeamIds.length >= 2 && (
                    <>
                      {/* Chart type tabs */}
                      <div className="flex items-center gap-1 border-b border-border/40 pb-0">
                        {(["radar", "bar"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setComparisonChartType(type)}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
                              comparisonChartType === type
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t(type === "radar" ? "statsPage.teamsTab.chartRadar" : "statsPage.teamsTab.chartBar")}
                          </button>
                        ))}
                      </div>

                      {comparisonChartType === "radar" && (
                        <TeamComparisonRadar
                          teams={radarData}
                          title={t("statsPage.teamsTab.radarTitle")}
                        />
                      )}
                      {comparisonChartType === "bar" && (
                        <TeamComparisonBar
                          teams={radarData}
                          title={t("statsPage.teamsTab.radarTitle")}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
