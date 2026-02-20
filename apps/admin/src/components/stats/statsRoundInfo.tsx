import { Badge } from "@puckhub/ui"
import { Info } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "~/i18n/use-translation"

interface Round {
  id: string
  name: string
  countsForPlayerStats: boolean
  countsForGoalieStats: boolean
}

interface Division {
  id: string
  name: string
  goalieMinGames: number
  rounds: Round[]
}

interface StatsRoundInfoProps {
  divisions: Division[]
}

function StatsRoundInfo({ divisions }: StatsRoundInfoProps) {
  const { t } = useTranslation("common")

  const { playerRounds, goalieRounds } = useMemo(() => {
    const pr: string[] = []
    const gr: string[] = []
    for (const div of divisions) {
      for (const round of div.rounds) {
        if (round.countsForPlayerStats) pr.push(round.name)
        if (round.countsForGoalieStats) gr.push(round.name)
      }
    }
    return { playerRounds: pr, goalieRounds: gr }
  }, [divisions])

  const allRounds = useMemo(() => divisions.flatMap((d) => d.rounds), [divisions])

  if (allRounds.length === 0) return null

  const allPlayerStats = playerRounds.length === allRounds.length
  const allGoalieStats = goalieRounds.length === allRounds.length

  // Don't show if everything counts
  if (allPlayerStats && allGoalieStats) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
      <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium text-blue-900">{t("statsPage.roundInfo.title")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-blue-700">
          <span>
            {t("statsPage.roundInfo.playerStats")}:{" "}
            {allPlayerStats
              ? t("statsPage.roundInfo.allRounds")
              : playerRounds.map((r) => (
                  <Badge key={r} variant="secondary" className="ml-1 text-xs">
                    {r}
                  </Badge>
                ))}
          </span>
          <span>
            {t("statsPage.roundInfo.goalieStats")}:{" "}
            {allGoalieStats
              ? t("statsPage.roundInfo.allRounds")
              : goalieRounds.map((r) => (
                  <Badge key={r} variant="secondary" className="ml-1 text-xs">
                    {r}
                  </Badge>
                ))}
          </span>
        </div>
      </div>
    </div>
  )
}

export { StatsRoundInfo }
export type { Division, Round }
