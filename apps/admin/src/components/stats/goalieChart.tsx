import { useMemo } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { CHART_COLORS, EChartsWrapper } from "./echartsWrapper"

interface GoalieChartStat {
  player: { firstName: string; lastName: string } | null
  team: { shortName: string } | null
  gaa: { toString(): string } | number | string | null
  gamesPlayed: number
}

interface GoalieChartProps {
  stats: GoalieChartStat[]
  title: string
}

function GoalieChart({ stats, title }: GoalieChartProps) {
  const { t } = useTranslation("common")

  const option = useMemo(() => {
    // Lower GAA is better, so sort ascending (best on top of the horizontal chart)
    const sorted = [...stats].sort((a, b) => Number(a.gaa) - Number(b.gaa)).reverse()

    const names = sorted.map(
      (s) => `${s.player?.firstName?.charAt(0)}. ${s.player?.lastName} (${s.team?.shortName ?? ""})`,
    )
    const values = sorted.map((s) => Number(Number(s.gaa).toFixed(2)))

    // Color gradient: lower GAA = greener, higher = redder
    const maxGaa = Math.max(...values, 1)
    const colors = values.map((v) => {
      const ratio = v / maxGaa
      if (ratio < 0.4) return CHART_COLORS[3] // green
      if (ratio < 0.7) return CHART_COLORS[1] // gold
      return CHART_COLORS[2] // red
    })

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0]
          const original = sorted.find(
            (s) => `${s.player?.firstName?.charAt(0)}. ${s.player?.lastName} (${s.team?.shortName ?? ""})` === p?.name,
          )
          return `${p?.name}<br/>${t("statsPage.overview.gaa")}: <b>${p?.value?.toFixed(2)}</b><br/>${t("statsPage.overview.gamesPlayedLong")}: ${original?.gamesPlayed ?? 0}`
        },
      },
      grid: { top: 40, right: 40, bottom: 10, left: 20, containLabel: true },
      xAxis: { type: "value", name: t("statsPage.overview.gaa"), nameLocation: "end" },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: [0, 3, 3, 0] },
          })),
          label: {
            show: true,
            position: "right",
            fontSize: 11,
            color: "hsl(215, 16%, 47%)",
            formatter: (params: { value: number }) => params.value.toFixed(2),
          },
        },
      ],
    }
  }, [stats, title, t])

  if (stats.length === 0) return null

  const height = Math.max(250, stats.length * 32 + 80)

  return <EChartsWrapper option={option} height={height} />
}

export { GoalieChart }
