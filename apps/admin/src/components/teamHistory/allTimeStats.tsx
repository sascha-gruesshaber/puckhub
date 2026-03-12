import { Card, CardHeader, Skeleton } from "@puckhub/ui"
import { Calendar, Goal, Percent, Swords, Trophy } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

interface AllTimeStatsProps {
  seasons: Array<{
    season: { name: string }
    totals: { gamesPlayed: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number }
    bestRank: number | null
  }>
  isLoading: boolean
}

function StatCard({
  label,
  value,
  icon,
  color,
  isLoading,
  tooltip,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  isLoading: boolean
  tooltip?: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3" title={tooltip}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: `${color}15`, color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-14 mt-0.5" />
            ) : (
              <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

function AllTimeStats({ seasons, isLoading }: AllTimeStatsProps) {
  const { t } = useTranslation("common")

  const totals = seasons.reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.totals.gamesPlayed,
      wins: acc.wins + s.totals.wins,
      draws: acc.draws + s.totals.draws,
      losses: acc.losses + s.totals.losses,
      goalsFor: acc.goalsFor + s.totals.goalsFor,
      goalsAgainst: acc.goalsAgainst + s.totals.goalsAgainst,
    }),
    { gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
  )

  const winRate = totals.gamesPlayed > 0 ? ((totals.wins / totals.gamesPlayed) * 100).toFixed(1) : "0"

  // Find best rank across all seasons
  let bestRank: number | null = null
  let bestSeasonName = ""
  for (const s of seasons) {
    if (s.bestRank !== null && (bestRank === null || s.bestRank < bestRank)) {
      bestRank = s.bestRank
      bestSeasonName = s.season.name
    }
  }

  const goalDiff = totals.goalsFor - totals.goalsAgainst
  const goalDiffStr = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t("teamsPage.history.allTimeStats")}</h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t("teamsPage.history.seasons")}
          value={seasons.length}
          icon={<Calendar size={18} />}
          color="hsl(215, 55%, 23%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("teamsPage.history.games")}
          value={totals.gamesPlayed}
          icon={<Swords size={18} />}
          color="hsl(199, 89%, 48%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("teamsPage.history.winRate")}
          value={`${winRate}%`}
          icon={<Percent size={18} />}
          color="hsl(142, 71%, 45%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("teamsPage.history.bestFinish")}
          value={bestRank !== null ? `#${bestRank}` : "–"}
          icon={<Trophy size={18} />}
          color="hsl(44, 87%, 50%)"
          isLoading={isLoading}
          tooltip={bestSeasonName || undefined}
        />
        <StatCard
          label={t("teamsPage.history.goalDifference")}
          value={goalDiffStr}
          icon={<Goal size={18} />}
          color="hsl(354, 85%, 42%)"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export { AllTimeStats }
