import { TeamLogo } from "~/components/shared/teamLogo"
import { useT } from "~/lib/i18n"

interface SeasonInfo {
  id: string
  name: string
}

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

interface PlayerSeasonStatRow {
  gamesPlayed: number
  goals: number
  assists: number
  totalPoints: number
  penaltyMinutes: number
  season: SeasonInfo
  team: TeamInfo
}

interface GoalieSeasonStatRow {
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
  season: SeasonInfo
  team: TeamInfo
}

function TeamCell({ team }: { team: TeamInfo }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
      <span className="truncate text-sm">{team.shortName}</span>
    </div>
  )
}

function SkaterSeasonStatsTable({ stats }: { stats: PlayerSeasonStatRow[] }) {
  const t = useT()
  const totals = stats.reduce(
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">{t.playerSeasonStats.season}</th>
            <th className="px-4 py-3 text-left">{t.playerSeasonStats.team}</th>
            <th className="px-4 py-3 text-right" title={t.tooltip.gamesPlayed}>{t.abbr.gp}</th>
            <th className="px-4 py-3 text-right" title={t.tooltip.goals}>{t.abbr.g}</th>
            <th className="px-4 py-3 text-right" title={t.tooltip.assists}>{t.abbr.a}</th>
            <th className="px-4 py-3 text-right font-bold" title={t.tooltip.points}>{t.abbr.pts}</th>
            <th className="px-4 py-3 text-right" title={t.tooltip.penaltyMinutes}>{t.abbr.pim}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
              <td className="px-4 py-3 whitespace-nowrap">{s.season.name}</td>
              <td className="px-4 py-3"><TeamCell team={s.team} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{s.gamesPlayed}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.goals}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.assists}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{s.totalPoints}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.penaltyMinutes}</td>
            </tr>
          ))}
        </tbody>
        {stats.length > 1 && (
          <tfoot>
            <tr className="font-bold border-t border-league-text/10">
              <td className="px-4 py-3">{t.playerSeasonStats.career}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tabular-nums">{totals.gamesPlayed}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.goals}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.assists}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.totalPoints}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.penaltyMinutes}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function GoalieSeasonStatsTable({ stats }: { stats: GoalieSeasonStatRow[] }) {
  const t = useT()
  const totals = stats.reduce(
    (acc, s) => ({ gamesPlayed: acc.gamesPlayed + s.gamesPlayed, goalsAgainst: acc.goalsAgainst + s.goalsAgainst }),
    { gamesPlayed: 0, goalsAgainst: 0 },
  )
  const careerGaa = totals.gamesPlayed > 0 ? (totals.goalsAgainst / totals.gamesPlayed).toFixed(2) : "0.00"

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">{t.playerSeasonStats.season}</th>
            <th className="px-4 py-3 text-left">{t.playerSeasonStats.team}</th>
            <th className="px-4 py-3 text-right" title={t.tooltip.gamesPlayed}>{t.abbr.gp}</th>
            <th className="px-4 py-3 text-right" title={t.tooltip.goalsAgainst}>{t.abbr.ga}</th>
            <th className="px-4 py-3 text-right font-bold" title={t.tooltip.goalsAgainstAvg}>{t.abbr.gaa}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
              <td className="px-4 py-3 whitespace-nowrap">{s.season.name}</td>
              <td className="px-4 py-3"><TeamCell team={s.team} /></td>
              <td className="px-4 py-3 text-right tabular-nums">{s.gamesPlayed}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.goalsAgainst}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{s.gaa ? Number(s.gaa.toString()).toFixed(2) : "–"}</td>
            </tr>
          ))}
        </tbody>
        {stats.length > 1 && (
          <tfoot>
            <tr className="font-bold border-t border-league-text/10">
              <td className="px-4 py-3">{t.playerSeasonStats.career}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tabular-nums">{totals.gamesPlayed}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.goalsAgainst}</td>
              <td className="px-4 py-3 text-right tabular-nums">{careerGaa}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function PlayerSeasonStatsTable({
  isGoalie,
  playerStats,
  goalieStats,
}: {
  isGoalie: boolean
  playerStats: PlayerSeasonStatRow[] | undefined
  goalieStats: GoalieSeasonStatRow[] | undefined
}) {
  const t = useT()

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t.playerSeasonStats.title}</h2>
      <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden">
        {isGoalie ? (
          <GoalieSeasonStatsTable stats={goalieStats ?? []} />
        ) : (
          <SkaterSeasonStatsTable stats={playerStats ?? []} />
        )}
      </div>
    </div>
  )
}

export { PlayerSeasonStatsTable }
