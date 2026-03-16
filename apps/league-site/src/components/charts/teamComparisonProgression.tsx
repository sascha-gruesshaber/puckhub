import { useMemo, useState } from "react"
import { useT } from "~/lib/i18n"
import { PillTabs } from "~/components/shared/pillTabs"
import { LEAGUE_CHART_COLORS, EChartsWrapper } from "./echartsWrapper"

type Metric = "wins" | "goalsFor" | "goalsAgainst" | "goalDifference" | "pim"

interface TeamSeasonEntry {
  teamId: string
  seasonId: string
  wins: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  pim: number
}

interface TeamInfo {
  id: string
  shortName: string
}

interface TeamComparisonProgressionProps {
  teams: TeamInfo[]
  seasons: Array<{ id: string; name: string }>
  teamSeasons: TeamSeasonEntry[]
  title: string
}

function TeamComparisonProgression({ teams, seasons, teamSeasons, title }: TeamComparisonProgressionProps) {
  const t = useT()
  const [metric, setMetric] = useState<Metric>("wins")

  const metricTabs = useMemo(
    () => [
      { id: "wins" as const, label: t.charts.wins },
      { id: "goalsFor" as const, label: t.charts.goals },
      { id: "goalsAgainst" as const, label: t.charts.goalsAgainst },
      { id: "goalDifference" as const, label: t.charts.goalDifference },
      { id: "pim" as const, label: t.charts.pim },
    ],
    [t],
  )

  // Build lookup: teamId:seasonId -> entry
  const lookup = useMemo(() => {
    const map = new Map<string, TeamSeasonEntry>()
    for (const ts of teamSeasons) {
      map.set(`${ts.teamId}:${ts.seasonId}`, ts)
    }
    return map
  }, [teamSeasons])

  const option = useMemo(() => {
    if (teams.length < 2 || seasons.length === 0) return null

    const seasonNames = seasons.map((s) => s.name)

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: { bottom: 0, data: teams.map((t) => t.shortName) },
      grid: { top: 40, right: 20, bottom: 40, left: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: seasonNames,
        axisLabel: { fontSize: 11 },
        boundaryGap: false,
      },
      yAxis: { type: "value" },
      series: teams.map((team, i) => ({
        name: team.shortName,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        connectNulls: false,
        lineStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length], width: 2.5 },
        itemStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length] },
        areaStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length], opacity: 0.05 },
        data: seasons.map((s) => {
          const entry = lookup.get(`${team.id}:${s.id}`)
          return entry ? entry[metric] : null
        }),
      })),
    }
  }, [teams, seasons, lookup, metric, title])

  if (!option || teams.length < 2) return null

  return (
    <div>
      <div className="flex justify-center mb-4">
        <PillTabs size="sm" items={metricTabs} value={metric} onChange={setMetric} />
      </div>
      <EChartsWrapper option={option} height={400} />
    </div>
  )
}

export { TeamComparisonProgression }
