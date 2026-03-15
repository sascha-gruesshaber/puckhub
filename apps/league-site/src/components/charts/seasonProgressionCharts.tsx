import { useT } from "~/lib/i18n"
import { LEAGUE_CHART_COLORS, EChartsWrapper } from "./echartsWrapper"

interface SeasonInfo {
  id: string
  name: string
}

interface PlayerSeasonStatRow {
  gamesPlayed: number
  goals: number
  assists: number
  totalPoints: number
  penaltyMinutes: number
  season: SeasonInfo
}

interface GoalieSeasonStatRow {
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
  season: SeasonInfo
}

function SkaterProgressionChart({ stats }: { stats: PlayerSeasonStatRow[] }) {
  const t = useT()
  const seasons = stats.map((s) => s.season.name)
  const goals = stats.map((s) => s.goals)
  const assists = stats.map((s) => s.assists)
  const points = stats.map((s) => s.totalPoints)

  const option = {
    tooltip: { trigger: "axis" as const },
    legend: { data: [t.charts.goals, t.charts.assists, t.charts.points], bottom: 0 },
    grid: { top: 40, right: 20, bottom: 50, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: seasons },
    yAxis: { type: "value" as const, minInterval: 1 },
    series: [
      {
        name: t.charts.goals,
        type: "line" as const,
        data: goals,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: LEAGUE_CHART_COLORS[0] },
      },
      {
        name: t.charts.assists,
        type: "line" as const,
        data: assists,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: LEAGUE_CHART_COLORS[1] },
      },
      {
        name: t.charts.points,
        type: "line" as const,
        data: points,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: LEAGUE_CHART_COLORS[3] },
      },
    ],
  }

  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4">
      <h3 className="text-sm font-semibold mb-2">{t.charts.seasonProgression}</h3>
      <EChartsWrapper option={option} height={300} />
    </div>
  )
}

function GoalieProgressionChart({ stats }: { stats: GoalieSeasonStatRow[] }) {
  const t = useT()
  const seasons = stats.map((s) => s.season.name)
  const gaaValues = stats.map((s) => (s.gaa ? Number(s.gaa.toString()) : 0))

  const option = {
    tooltip: { trigger: "axis" as const },
    grid: { top: 40, right: 20, bottom: 30, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: seasons },
    yAxis: { type: "value" as const, inverse: true, name: "GAA", nameLocation: "middle" as const, nameGap: 40 },
    series: [
      {
        name: "GAA",
        type: "line" as const,
        data: gaaValues,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: LEAGUE_CHART_COLORS[4] },
        areaStyle: { color: `${LEAGUE_CHART_COLORS[4]}20` },
      },
    ],
  }

  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4">
      <h3 className="text-sm font-semibold mb-2">{t.charts.gaaProgression}</h3>
      <EChartsWrapper option={option} height={300} />
    </div>
  )
}

function PimChart({ stats }: { stats: PlayerSeasonStatRow[] }) {
  const t = useT()
  const seasons = stats.map((s) => s.season.name)
  const pim = stats.map((s) => s.penaltyMinutes)

  const option = {
    tooltip: { trigger: "axis" as const },
    grid: { top: 40, right: 20, bottom: 30, left: 20, containLabel: true },
    xAxis: { type: "category" as const, data: seasons },
    yAxis: { type: "value" as const, minInterval: 1 },
    series: [
      {
        name: t.charts.penaltyMinutes,
        type: "bar" as const,
        data: pim,
        itemStyle: { color: LEAGUE_CHART_COLORS[2], borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      },
    ],
  }

  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4">
      <h3 className="text-sm font-semibold mb-2">{t.charts.pimPerSeason}</h3>
      <EChartsWrapper option={option} height={250} />
    </div>
  )
}

function SeasonProgressionCharts({
  isGoalie,
  playerStats,
  goalieStats,
}: {
  isGoalie: boolean
  playerStats: PlayerSeasonStatRow[] | undefined
  goalieStats: GoalieSeasonStatRow[] | undefined
}) {
  const data = isGoalie ? goalieStats : playerStats
  if (!data || data.length < 2) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {isGoalie ? (
        <GoalieProgressionChart stats={goalieStats!} />
      ) : (
        <>
          <SkaterProgressionChart stats={playerStats!} />
          <PimChart stats={playerStats!} />
        </>
      )}
    </div>
  )
}

export { SeasonProgressionCharts }
