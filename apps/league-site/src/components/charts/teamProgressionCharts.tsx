import { useT } from "~/lib/i18n"
import { EChartsWrapper, LEAGUE_CHART_COLORS } from "./echartsWrapper"

interface SeasonEntry {
  season: { name: string }
  totals: {
    gamesPlayed: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
  }
  bestRank: number | null
}

function RankPointsChart({ seasons }: { seasons: SeasonEntry[] }) {
  const t = useT()
  const ordered = [...seasons].reverse()
  const labels = ordered.map((s) => s.season.name)
  const points = ordered.map((s) => s.totals.wins * 3 + s.totals.draws)
  const ranks = ordered.map((s) => s.bestRank)

  const option = {
    tooltip: { trigger: "axis" as const },
    legend: { data: [t.charts.winsPoints, t.charts.placement], bottom: 0 },
    grid: { top: 40, right: 60, bottom: 50, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: labels },
    yAxis: [
      { type: "value" as const, name: t.charts.winsPoints, minInterval: 1 },
      { type: "value" as const, name: t.charts.placement, inverse: true, minInterval: 1, min: 1 },
    ],
    series: [
      {
        name: t.charts.winsPoints,
        type: "line" as const,
        data: points,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: LEAGUE_CHART_COLORS[0] },
        yAxisIndex: 0,
      },
      {
        name: t.charts.placement,
        type: "line" as const,
        data: ranks,
        smooth: true,
        symbol: "diamond",
        symbolSize: 10,
        itemStyle: { color: LEAGUE_CHART_COLORS[1] },
        lineStyle: { type: "dashed" as const },
        yAxisIndex: 1,
      },
    ],
  }

  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4">
      <h3 className="text-sm font-semibold mb-2">{t.charts.placementAndPoints}</h3>
      <EChartsWrapper option={option} height={300} />
    </div>
  )
}

function GoalsChart({ seasons }: { seasons: SeasonEntry[] }) {
  const t = useT()
  const ordered = [...seasons].reverse()
  const labels = ordered.map((s) => s.season.name)
  const gf = ordered.map((s) => s.totals.goalsFor)
  const ga = ordered.map((s) => s.totals.goalsAgainst)
  const diff = ordered.map((s) => s.totals.goalDifference)

  const option = {
    tooltip: { trigger: "axis" as const },
    legend: { data: [t.charts.goals, t.charts.goalsAgainst, t.charts.difference], bottom: 0 },
    grid: { top: 40, right: 20, bottom: 50, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: labels },
    yAxis: { type: "value" as const, minInterval: 1 },
    series: [
      {
        name: t.charts.goals,
        type: "bar" as const,
        data: gf,
        itemStyle: { color: LEAGUE_CHART_COLORS[3], borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: t.charts.goalsAgainst,
        type: "bar" as const,
        data: ga,
        itemStyle: { color: LEAGUE_CHART_COLORS[2], borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: t.charts.difference,
        type: "line" as const,
        data: diff,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: LEAGUE_CHART_COLORS[4] },
        lineStyle: { width: 2 },
      },
    ],
  }

  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4">
      <h3 className="text-sm font-semibold mb-2">{t.charts.goalRatio}</h3>
      <EChartsWrapper option={option} height={300} />
    </div>
  )
}

function TeamProgressionCharts({ seasons }: { seasons: SeasonEntry[] }) {
  if (seasons.length < 2) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RankPointsChart seasons={seasons} />
      <GoalsChart seasons={seasons} />
    </div>
  )
}

export { TeamProgressionCharts }
