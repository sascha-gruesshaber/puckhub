import { Card, CardContent } from "@puckhub/ui"
import { EChartsWrapper, CHART_COLORS } from "~/components/stats/echartsWrapper"
import { useTranslation } from "~/i18n/use-translation"

interface SeasonEntry {
  season: { name: string }
  totals: { gamesPlayed: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number }
  bestRank: number | null
}

interface TeamProgressionChartsProps {
  seasons: SeasonEntry[]
}

// ---------------------------------------------------------------------------
// Rank + Points Chart
// ---------------------------------------------------------------------------

function RankPointsChart({ seasons }: { seasons: SeasonEntry[] }) {
  const { t } = useTranslation("common")

  // Chronological order for charts
  const ordered = [...seasons].reverse()
  const labels = ordered.map((s) => s.season.name)

  // Sum total points from all rounds
  const points = ordered.map((s) => s.totals.wins * 3 + s.totals.draws) // approximate if no totalPoints
  const ranks = ordered.map((s) => s.bestRank)

  const option = {
    tooltip: { trigger: "axis" as const },
    legend: {
      data: [t("teamsPage.history.chartWins"), t("teamsPage.history.chartRank")],
      bottom: 0,
    },
    grid: { top: 40, right: 60, bottom: 50, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: labels },
    yAxis: [
      { type: "value" as const, name: t("teamsPage.history.chartWins"), minInterval: 1 },
      {
        type: "value" as const,
        name: t("teamsPage.history.chartRank"),
        inverse: true,
        minInterval: 1,
        min: 1,
      },
    ],
    series: [
      {
        name: t("teamsPage.history.chartWins"),
        type: "line" as const,
        data: points,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: CHART_COLORS[0] },
        yAxisIndex: 0,
      },
      {
        name: t("teamsPage.history.chartRank"),
        type: "line" as const,
        data: ranks,
        smooth: true,
        symbol: "diamond",
        symbolSize: 10,
        itemStyle: { color: CHART_COLORS[1] },
        lineStyle: { type: "dashed" as const },
        yAxisIndex: 1,
      },
    ],
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-2">{t("teamsPage.history.chartRankPoints")}</h3>
        <EChartsWrapper option={option} height={300} />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Goals For / Against Chart
// ---------------------------------------------------------------------------

function GoalsChart({ seasons }: { seasons: SeasonEntry[] }) {
  const { t } = useTranslation("common")

  const ordered = [...seasons].reverse()
  const labels = ordered.map((s) => s.season.name)
  const gf = ordered.map((s) => s.totals.goalsFor)
  const ga = ordered.map((s) => s.totals.goalsAgainst)
  const diff = ordered.map((s) => s.totals.goalDifference)

  const option = {
    tooltip: { trigger: "axis" as const },
    legend: {
      data: [
        t("teamsPage.history.chartGoalsFor"),
        t("teamsPage.history.chartGoalsAgainst"),
        t("teamsPage.history.chartGoalDiff"),
      ],
      bottom: 0,
    },
    grid: { top: 40, right: 20, bottom: 50, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: labels },
    yAxis: { type: "value" as const, minInterval: 1 },
    series: [
      {
        name: t("teamsPage.history.chartGoalsFor"),
        type: "bar" as const,
        data: gf,
        itemStyle: { color: CHART_COLORS[3], borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: t("teamsPage.history.chartGoalsAgainst"),
        type: "bar" as const,
        data: ga,
        itemStyle: { color: CHART_COLORS[2], borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: t("teamsPage.history.chartGoalDiff"),
        type: "line" as const,
        data: diff,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: CHART_COLORS[4] },
        lineStyle: { width: 2 },
      },
    ],
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-2">{t("teamsPage.history.chartGoals")}</h3>
        <EChartsWrapper option={option} height={300} />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

function TeamProgressionCharts({ seasons }: TeamProgressionChartsProps) {
  if (seasons.length < 2) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RankPointsChart seasons={seasons} />
      <GoalsChart seasons={seasons} />
    </div>
  )
}

export { TeamProgressionCharts }
