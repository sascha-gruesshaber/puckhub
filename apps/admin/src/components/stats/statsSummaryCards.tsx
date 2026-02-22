import { Award, Goal, Shield, Timer } from "lucide-react"
import type { ReactNode } from "react"
import { PlayerHoverCard } from "~/components/playerHoverCard"
import { useTranslation } from "~/i18n/use-translation"

interface SummaryCardProps {
  icon: ReactNode
  label: string
  value: ReactNode
  sublabel: string
  color: string
}

function SummaryCard({ icon, label, value, sublabel, color }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border/50 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <p className="text-sm text-muted-foreground mt-0.5">{sublabel}</p>
    </div>
  )
}

interface StatsSummaryCardsProps {
  playerStats: Array<{
    playerId: string
    player: { id: string; firstName: string; lastName: string } | null
    team: { id: string; name: string; shortName: string; logoUrl?: string | null } | null
    totalPoints: number
    goals: number
    assists: number
  }>
  goalieStats: {
    qualified: Array<{
      playerId: string
      player: { id: string; firstName: string; lastName: string } | null
      team: { id: string; name: string; shortName: string; logoUrl?: string | null } | null
      gaa: { toString(): string } | number | string | null
    }>
  } | null
  penaltyStats: Array<{
    player: { id: string; firstName: string; lastName: string } | null
    team: { id: string; name: string; shortName: string; logoUrl?: string | null } | null
    totalMinutes: number
  }>
  totalGames: number
}

function StatsSummaryCards({ playerStats, goalieStats, penaltyStats, totalGames }: StatsSummaryCardsProps) {
  const { t } = useTranslation("common")

  const topScorer = playerStats[0]
  const bestGoalie = goalieStats?.qualified[0]
  const topPenalty = penaltyStats[0]

  function playerName(
    player: { id: string; firstName: string; lastName: string } | null | undefined,
    team?: { id: string; name: string; shortName: string; logoUrl?: string | null } | null,
  ): ReactNode {
    if (!player) return "–"
    const display = `${player.firstName?.charAt(0)}. ${player.lastName}`
    return (
      <PlayerHoverCard playerId={player.id} name={`${player.firstName} ${player.lastName}`} team={team ?? undefined}>
        <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2">{display}</span>
      </PlayerHoverCard>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={<Award className="h-5 w-5" />}
        label={t("statsPage.overview.topScorer")}
        value={playerName(topScorer?.player, topScorer?.team)}
        sublabel={
          topScorer
            ? `${topScorer.totalPoints} ${t("statsPage.overview.points")} (${topScorer.goals} ${t("statsPage.overview.goalsLong")} + ${topScorer.assists} ${t("statsPage.overview.assistsLong")}) · ${topScorer.team?.shortName ?? ""}`
            : "–"
        }
        color="hsl(217, 71%, 25%)"
      />
      <SummaryCard
        icon={<Shield className="h-5 w-5" />}
        label={t("statsPage.overview.bestGoalie")}
        value={playerName(bestGoalie?.player, bestGoalie?.team)}
        sublabel={
          bestGoalie
            ? `${Number(bestGoalie.gaa).toFixed(2)} ${t("statsPage.overview.gaa")} · ${bestGoalie.team?.shortName ?? ""}`
            : "–"
        }
        color="hsl(142, 71%, 45%)"
      />
      <SummaryCard
        icon={<Timer className="h-5 w-5" />}
        label={t("statsPage.overview.mostPenalties")}
        value={playerName(topPenalty?.player, topPenalty?.team)}
        sublabel={
          topPenalty
            ? `${topPenalty.totalMinutes} ${t("statsPage.overview.pim")} · ${topPenalty.team?.shortName ?? ""}`
            : "–"
        }
        color="hsl(0, 84%, 60%)"
      />
      <SummaryCard
        icon={<Goal className="h-5 w-5" />}
        label={t("statsPage.overview.gamesPlayed")}
        value={String(totalGames)}
        sublabel={t("statsPage.overview.gamesPlayed")}
        color="hsl(44, 87%, 66%)"
      />
    </div>
  )
}

export { StatsSummaryCards }
