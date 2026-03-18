import { useMemo } from "react"
import { EChartsWrapper, LEAGUE_CHART_COLORS } from "./echartsWrapper"

interface PenaltyBreakdown {
  penaltyType: { name: string } | null
  count: number
  minutes: number
}

interface TeamPenaltyStat {
  breakdown: PenaltyBreakdown[]
}

interface PenaltyTypeChartProps {
  stats: TeamPenaltyStat[]
  title: string
}

function PenaltyTypeChart({ stats, title }: PenaltyTypeChartProps) {
  const option = useMemo(() => {
    const typeMap = new Map<string, { name: string; count: number; minutes: number }>()
    for (const stat of stats) {
      for (const b of stat.breakdown) {
        const name = b.penaltyType?.name ?? "Unbekannt"
        const existing = typeMap.get(name)
        if (existing) {
          existing.count += b.count
          existing.minutes += b.minutes
        } else {
          typeMap.set(name, { name, count: b.count, minutes: b.minutes })
        }
      }
    }

    const entries = [...typeMap.values()].sort((a, b) => b.minutes - a.minutes)

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: {
        trigger: "item",
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/>Strafminuten: <b>${params.value}</b> (${params.percent.toFixed(1)}%)`,
      },
      legend: { orient: "vertical", right: 10, top: "center", textStyle: { fontSize: 11 } },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["35%", "55%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold" } },
          data: entries.map((e, i) => ({
            name: e.name,
            value: e.minutes,
            itemStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length] },
          })),
        },
      ],
    }
  }, [stats, title])

  if (stats.length === 0) return null

  return <EChartsWrapper option={option} height={350} />
}

export { PenaltyTypeChart }
