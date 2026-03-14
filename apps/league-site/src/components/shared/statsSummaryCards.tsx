import { Award, Shield, Timer } from "lucide-react"
import type { ReactNode } from "react"
import { useT } from "~/lib/i18n"
import { TeamLogo } from "./teamLogo"

interface SummaryCardProps {
  icon: ReactNode
  label: string
  value: ReactNode
  sublabel: string
  color: string
}

function SummaryCard({ icon, label, value, sublabel, color }: SummaryCardProps) {
  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-league-text/60">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight text-league-text">{value}</div>
      <p className="text-sm text-league-text/50 mt-0.5">{sublabel}</p>
    </div>
  )
}

interface StatsSummaryCardsProps {
  playerStats: Array<{
    player: { firstName: string; lastName: string } | null
    team: { name: string; shortName?: string | null; logoUrl?: string | null } | null
    totalPoints: number
    goals: number
    assists: number
  }>
  goalieStats: {
    qualified: Array<{
      player: { firstName: string; lastName: string } | null
      team: { name: string; shortName?: string | null; logoUrl?: string | null } | null
      gaa: { toString(): string } | number | string | null
    }>
  } | null
  penaltyStats: Array<{
    player: { firstName: string; lastName: string } | null
    team: { name: string; shortName?: string | null; logoUrl?: string | null } | null
    totalMinutes: number
  }>
}

function playerDisplay(
  player: { firstName: string; lastName: string } | null | undefined,
  team?: { name: string; shortName?: string | null; logoUrl?: string | null } | null,
): ReactNode {
  if (!player) return "–"
  return (
    <div className="flex items-center gap-2">
      {team && <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />}
      <span>
        {player.firstName?.charAt(0)}. {player.lastName}
      </span>
    </div>
  )
}

function StatsSummaryCards({ playerStats, goalieStats, penaltyStats }: StatsSummaryCardsProps) {
  const t = useT()
  const topScorer = playerStats[0]
  const bestGoalie = goalieStats?.qualified[0]
  const topPenalty = penaltyStats[0]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard
        icon={<Award className="h-5 w-5" />}
        label={t.statsSummary.topScorer}
        value={playerDisplay(topScorer?.player, topScorer?.team)}
        sublabel={
          topScorer
            ? `${topScorer.totalPoints} ${t.abbr.pts} (${topScorer.goals} ${t.abbr.g} + ${topScorer.assists} ${t.abbr.a}) · ${topScorer.team?.shortName ?? topScorer.team?.name ?? ""}`
            : "–"
        }
        color="hsl(217, 71%, 25%)"
      />
      <SummaryCard
        icon={<Shield className="h-5 w-5" />}
        label={t.statsSummary.bestGoalie}
        value={playerDisplay(bestGoalie?.player, bestGoalie?.team)}
        sublabel={
          bestGoalie
            ? `${Number(bestGoalie.gaa).toFixed(2)} GAA · ${bestGoalie.team?.shortName ?? bestGoalie.team?.name ?? ""}`
            : "–"
        }
        color="hsl(142, 71%, 45%)"
      />
      <SummaryCard
        icon={<Timer className="h-5 w-5" />}
        label={t.statsSummary.mostPenalties}
        value={playerDisplay(topPenalty?.player, topPenalty?.team)}
        sublabel={
          topPenalty
            ? `${topPenalty.totalMinutes} ${t.abbr.pim} · ${topPenalty.team?.shortName ?? topPenalty.team?.name ?? ""}`
            : "–"
        }
        color="hsl(0, 84%, 60%)"
      />
    </div>
  )
}

export { StatsSummaryCards }
