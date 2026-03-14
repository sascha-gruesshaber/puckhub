import { useMemo } from "react"
import { useT } from "~/lib/i18n"
import { LEAGUE_CHART_COLORS, EChartsWrapper } from "./echartsWrapper"

interface ChartPlayerStat {
  player: { firstName: string; lastName: string } | null
  team: { shortName: string } | null
  goals: number
  assists: number
  totalPoints: number
}

type ChartMode = "stacked" | "goals" | "assists"

interface ScorerChartProps {
  stats: ChartPlayerStat[]
  mode: ChartMode
  title: string
  limit?: number
}

function ScorerChart({ stats, mode, title, limit = 15 }: ScorerChartProps) {
  const t = useT()
  const option = useMemo(() => {
    const sorted = [...stats]
      .sort((a, b) => {
        if (mode === "goals") return b.goals - a.goals
        if (mode === "assists") return b.assists - a.assists
        return b.totalPoints - a.totalPoints
      })
      .slice(0, limit)
      .reverse()

    const names = sorted.map(
      (s) => `${s.player?.firstName?.charAt(0)}. ${s.player?.lastName} (${s.team?.shortName ?? ""})`,
    )

    if (mode === "stacked") {
      return {
        title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { bottom: 0, data: [t.charts.goals, t.charts.assists] },
        grid: { top: 40, right: 20, bottom: 40, left: 20, containLabel: true },
        xAxis: { type: "value" },
        yAxis: { type: "category", data: names, axisLabel: { fontSize: 11 } },
        series: [
          {
            name: t.charts.goals,
            type: "bar",
            stack: "total",
            data: sorted.map((s) => s.goals),
            itemStyle: { color: LEAGUE_CHART_COLORS[0] },
          },
          {
            name: t.charts.assists,
            type: "bar",
            stack: "total",
            data: sorted.map((s) => s.assists),
            itemStyle: { color: LEAGUE_CHART_COLORS[1], borderRadius: [0, 3, 3, 0] },
          },
        ],
      }
    }

    const values = sorted.map((s) => (mode === "goals" ? s.goals : s.assists))
    const color = mode === "goals" ? LEAGUE_CHART_COLORS[0] : LEAGUE_CHART_COLORS[1]

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 40, right: 20, bottom: 10, left: 20, containLabel: true },
      xAxis: { type: "value" },
      yAxis: { type: "category", data: names, axisLabel: { fontSize: 11 } },
      series: [
        {
          type: "bar",
          data: values,
          itemStyle: { color, borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: "right", fontSize: 11, color: "hsl(215, 16%, 47%)" },
        },
      ],
    }
  }, [stats, mode, title, limit, t])

  if (stats.length === 0) return null

  const height = Math.max(300, Math.min(stats.length, limit) * 32 + 80)

  return <EChartsWrapper option={option} height={height} />
}

export { ScorerChart }
export type { ChartMode }
