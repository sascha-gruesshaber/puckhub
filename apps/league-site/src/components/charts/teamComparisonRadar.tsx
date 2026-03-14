import { useMemo } from "react"
import { useT } from "~/lib/i18n"
import { LEAGUE_CHART_COLORS, EChartsWrapper } from "./echartsWrapper"

interface TeamRadarData {
  teamName: string
  shortName: string
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  pim: number
}

interface TeamComparisonRadarProps {
  teams: TeamRadarData[]
  title: string
}

function TeamComparisonRadar({ teams, title }: TeamComparisonRadarProps) {
  const t = useT()
  const option = useMemo(() => {
    if (teams.length < 2) return null

    const maxWins = Math.max(...teams.map((t) => t.wins), 1)
    const maxLosses = Math.max(...teams.map((t) => t.losses), 1)
    const maxGF = Math.max(...teams.map((t) => t.goalsFor), 1)
    const maxGA = Math.max(...teams.map((t) => t.goalsAgainst), 1)
    const maxPim = Math.max(...teams.map((t) => t.pim), 1)

    return {
      title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
      legend: { bottom: 0, data: teams.map((t) => t.shortName) },
      tooltip: { trigger: "item" },
      radar: {
        indicator: [
          { name: t.charts.wins, max: maxWins },
          { name: t.charts.goals, max: maxGF },
          { name: t.charts.pim, max: maxPim },
          { name: t.charts.goalsAgainst, max: maxGA },
          { name: t.charts.losses, max: maxLosses },
        ],
        shape: "polygon",
        splitArea: { areaStyle: { color: ["hsl(0, 0%, 98%)", "hsl(0, 0%, 95%)"] } },
      },
      series: [
        {
          type: "radar",
          data: teams.map((team, i) => ({
            name: team.shortName,
            value: [team.wins, team.goalsFor, team.pim, team.goalsAgainst, team.losses],
            lineStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length], width: 2 },
            itemStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length] },
            areaStyle: { color: LEAGUE_CHART_COLORS[i % LEAGUE_CHART_COLORS.length], opacity: 0.1 },
          })),
        },
      ],
    }
  }, [teams, title, t])

  if (!option || teams.length < 2) return null

  return <EChartsWrapper option={option} height={500} />
}

export { TeamComparisonRadar }
export type { TeamRadarData }
