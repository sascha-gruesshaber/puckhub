import { useMemo } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { CHART_COLORS, EChartsWrapper } from "./echartsWrapper"
import type { TeamRadarData } from "./teamComparisonRadar"

interface TeamComparisonBarProps {
  teams: TeamRadarData[]
  title: string
}

function TeamComparisonBar({ teams, title }: TeamComparisonBarProps) {
  const { t } = useTranslation("common")

  const option = useMemo(() => {
    if (teams.length < 2) return null

    const categories = [
      t("statsPage.teamsTab.radarWins"),
      t("statsPage.teamsTab.radarLosses"),
      t("statsPage.teamsTab.radarGoalsFor"),
      t("statsPage.teamsTab.radarGoalsAgainst"),
      t("statsPage.teamsTab.radarPim"),
    ]

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        bottom: 0,
        data: teams.map((t) => t.shortName),
      },
      grid: { top: 40, right: 20, bottom: 40, left: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { fontSize: 11 },
      },
      yAxis: { type: "value" },
      series: teams.map((team, i) => ({
        name: team.shortName,
        type: "bar",
        data: [team.wins, team.losses, team.goalsFor, team.goalsAgainst, team.pim],
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], borderRadius: [3, 3, 0, 0] },
      })),
    }
  }, [teams, title, t])

  if (!option || teams.length < 2) return null

  const height = Math.max(400, teams.length > 6 ? 500 : 400)

  return <EChartsWrapper option={option} height={height} />
}

export { TeamComparisonBar }
