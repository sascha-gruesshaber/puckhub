import { Calendar, Goal, Percent, Swords, Trophy } from "lucide-react"
import { useT } from "~/lib/i18n"

interface AllTimeStatsProps {
  seasons: Array<{
    season: { name: string }
    totals: {
      gamesPlayed: number
      wins: number
      draws: number
      losses: number
      goalsFor: number
      goalsAgainst: number
      goalDifference: number
    }
    bestRank: number | null
  }>
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

function AllTimeStats({ seasons }: AllTimeStatsProps) {
  const t = useT()
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
      <h2 className="text-lg font-semibold mb-3">{t.allTimeStats.title}</h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t.allTimeStats.seasons}
          value={seasons.length}
          icon={<Calendar size={18} />}
          color="hsl(215, 55%, 23%)"
        />
        <StatCard
          label={t.allTimeStats.games}
          value={totals.gamesPlayed}
          icon={<Swords size={18} />}
          color="hsl(199, 89%, 48%)"
        />
        <StatCard
          label={t.allTimeStats.winRate}
          value={`${winRate}%`}
          icon={<Percent size={18} />}
          color="hsl(142, 71%, 45%)"
        />
        <StatCard
          label={t.allTimeStats.bestPlace}
          value={bestRank !== null ? `#${bestRank}` : "–"}
          icon={<Trophy size={18} />}
          color="hsl(44, 87%, 50%)"
          tooltip={bestSeasonName || undefined}
        />
        <StatCard
          label={t.allTimeStats.goalDiff}
          value={goalDiffStr}
          icon={<Goal size={18} />}
          color="hsl(354, 85%, 42%)"
        />
      </div>
    </div>
  )
}

export { AllTimeStats }
