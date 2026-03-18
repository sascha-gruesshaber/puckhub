import { useMemo } from "react"
import { useT } from "~/lib/i18n"
import { EChartsWrapper, LEAGUE_CHART_COLORS } from "./echartsWrapper"
import type { TeamRadarData } from "./teamComparisonRadar"

interface TeamComparisonBarProps {
  teams: TeamRadarData[]
  title: string
}

function TeamComparisonBar({ teams, title }: TeamComparisonBarProps) {
  const t = useT()
  const option = useMemo(() => {
    if (teams.length < 2) return null

    const categories = [t.charts.wins, t.charts.losses, t.charts.goals, t.charts.goalsAgainst, t.charts.pim]

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { bottom: 0, data: teams.map((t) => t.shortName) },
      grid: { top: 40, right: 20, bottom: 40, left: 20, containLabel: true },
      xAxis: { type: "category", data: categories, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value" },
      series: teams.map((team, i) => ({
        name: team.shortName,
        type: "bar",
        data: [team.wins, team.losses, team.goalsFor, team.goalsAgainst, team.pim],
        itemStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length], borderRadius: [3, 3, 0, 0] },
      })),
    }
  }, [teams, title, t])

  if (!option || teams.length < 2) return null

  const height = Math.max(400, teams.length > 6 ? 500 : 400)

  return <EChartsWrapper option={option} height={height} />
}

export { TeamComparisonBar }
