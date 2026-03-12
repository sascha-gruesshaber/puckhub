import { useTranslation } from "~/i18n/use-translation"

interface ScorerInfo {
  playerId: string
  goals: number
  assists: number
  totalPoints: number
  player: { firstName: string; lastName: string }
}

interface GoalieInfo {
  playerId: string
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
  player: { firstName: string; lastName: string }
}

interface TopPerformersProps {
  scorers: ScorerInfo[]
  goalie?: GoalieInfo | null
}

function TopPerformers({ scorers, goalie }: TopPerformersProps) {
  const { t } = useTranslation("common")

  if (scorers.length === 0 && !goalie) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {scorers.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{t("teamsPage.history.topScorers")}:</span>
          {scorers.map((s, i) => (
            <span key={s.playerId}>
              {s.player.lastName} ({s.goals}+{s.assists}={s.totalPoints})
              {i < scorers.length - 1 && ","}
            </span>
          ))}
        </div>
      )}
      {goalie && (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{t("teamsPage.history.bestGoalie")}:</span>
          <span>
            {goalie.player.lastName} ({goalie.gaa ? Number(goalie.gaa.toString()).toFixed(2) : "–"} GAA)
          </span>
        </div>
      )}
    </div>
  )
}

export { TopPerformers }
