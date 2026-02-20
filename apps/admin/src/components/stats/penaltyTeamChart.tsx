import { useMemo } from "react"
import { CHART_COLORS, EChartsWrapper } from "./echartsWrapper"

interface TeamPenaltyStat {
  team: { name: string; shortName: string } | null
  totalMinutes: number
  totalCount: number
}

interface PenaltyTeamChartProps {
  stats: TeamPenaltyStat[]
  title: string
}

function PenaltyTeamChart({ stats, title }: PenaltyTeamChartProps) {
  const option = useMemo(() => {
    const sorted = [...stats].sort((a, b) => b.totalMinutes - a.totalMinutes).reverse()

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0]
          const original = sorted.find(
            (s) => (s.team?.shortName ?? "–") === p?.name,
          )
          return `${p?.name}<br/>PIM: <b>${p?.value}</b><br/>Penalties: ${original?.totalCount ?? 0}`
        },
      },
      grid: { top: 40, right: 20, bottom: 10, left: 20, containLabel: true },
      xAxis: { type: "value" },
      yAxis: {
        type: "category",
        data: sorted.map((s) => s.team?.shortName ?? "–"),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: sorted.map((s) => s.totalMinutes),
          itemStyle: { color: CHART_COLORS[2], borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: "right",
            fontSize: 11,
            color: "hsl(215, 16%, 47%)",
          },
        },
      ],
    }
  }, [stats, title])

  if (stats.length === 0) return null

  const height = Math.max(250, stats.length * 36 + 80)

  return <EChartsWrapper option={option} height={height} />
}

export { PenaltyTeamChart }
