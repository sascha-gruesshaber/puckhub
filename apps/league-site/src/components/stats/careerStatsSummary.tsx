import { Goal, Shield, Swords, Target, Timer } from "lucide-react"
import { useT } from "~/lib/i18n"

interface PlayerCareerStat {
  gamesPlayed: number
  goals: number
  assists: number
  totalPoints: number
  penaltyMinutes: number
}

interface GoalieCareerStat {
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
}

interface CareerStatsSummaryProps {
  isGoalie: boolean
  playerStats: PlayerCareerStat[] | undefined
  goalieStats: GoalieCareerStat[] | undefined
}

function StatCard({
  label,
  value,
  icon,
  color,
  tooltip,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  tooltip?: string
}) {
  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4" title={tooltip}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-league-text/50 truncate">{label}</p>
          <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

function CareerStatsSummary({ isGoalie, playerStats, goalieStats }: CareerStatsSummaryProps) {
  const t = useT()

  if (isGoalie) {
    const totals = (goalieStats ?? []).reduce(
      (acc, s) => ({ gamesPlayed: acc.gamesPlayed + s.gamesPlayed, goalsAgainst: acc.goalsAgainst + s.goalsAgainst }),
      { gamesPlayed: 0, goalsAgainst: 0 },
    )
    const careerGaa = totals.gamesPlayed > 0 ? (totals.goalsAgainst / totals.gamesPlayed).toFixed(2) : "0.00"

    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">{t.careerStats.title}</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label={t.abbr.gp}
            tooltip={t.tooltip.gamesPlayed}
            value={totals.gamesPlayed}
            icon={<Swords size={18} />}
            color="hsl(215, 55%, 23%)"
          />
          <StatCard
            label={t.abbr.ga}
            tooltip={t.tooltip.goalsAgainst}
            value={totals.goalsAgainst}
            icon={<Target size={18} />}
            color="hsl(354, 85%, 42%)"
          />
          <StatCard
            label={t.abbr.gaa}
            tooltip={t.tooltip.goalsAgainstAvg}
            value={careerGaa}
            icon={<Shield size={18} />}
            color="hsl(199, 89%, 48%)"
          />
        </div>
      </div>
    )
  }

  const totals = (playerStats ?? []).reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      totalPoints: acc.totalPoints + s.totalPoints,
      penaltyMinutes: acc.penaltyMinutes + s.penaltyMinutes,
    }),
    { gamesPlayed: 0, goals: 0, assists: 0, totalPoints: 0, penaltyMinutes: 0 },
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t.careerStats.title}</h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t.abbr.gp}
          tooltip={t.tooltip.gamesPlayed}
          value={totals.gamesPlayed}
          icon={<Swords size={18} />}
          color="hsl(215, 55%, 23%)"
        />
        <StatCard
          label={t.abbr.g}
          tooltip={t.tooltip.goals}
          value={totals.goals}
          icon={<Goal size={18} />}
          color="hsl(142, 71%, 45%)"
        />
        <StatCard
          label={t.abbr.a}
          tooltip={t.tooltip.assists}
          value={totals.assists}
          icon={<Target size={18} />}
          color="hsl(44, 87%, 50%)"
        />
        <StatCard
          label={t.abbr.pts}
          tooltip={t.tooltip.points}
          value={totals.totalPoints}
          icon={<Swords size={18} />}
          color="hsl(199, 89%, 48%)"
        />
        <StatCard
          label={t.abbr.pim}
          tooltip={t.tooltip.penaltyMinutes}
          value={totals.penaltyMinutes}
          icon={<Timer size={18} />}
          color="hsl(354, 85%, 42%)"
        />
      </div>
    </div>
  )
}

export { CareerStatsSummary }
