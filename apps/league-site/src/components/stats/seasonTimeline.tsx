import { ChevronDown, Medal, Trophy } from "lucide-react"
import { useState } from "react"
import { useT } from "~/lib/i18n"

interface Standing {
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  totalPoints: number
  rank: number | null
}

interface RoundInfo {
  id: string
  name: string
  roundType: string
  standing: Standing | null
}

interface DivisionInfo {
  id: string
  name: string
  rounds: RoundInfo[]
}

interface SeasonEntry {
  season: { id: string; name: string; seasonStart: Date | string; seasonEnd: Date | string }
  divisions: DivisionInfo[]
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
  bestRankRoundType: string | null
}

interface ScorerInfo {
  seasonId: string
  playerId: string
  goals: number
  assists: number
  totalPoints: number
  player: { firstName: string; lastName: string }
}

interface GoalieInfo {
  seasonId: string
  playerId: string
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
  player: { firstName: string; lastName: string }
}

function getRankIcon(rank: number | null) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
  if (rank === 2 || rank === 3) return <Medal className="h-4 w-4 text-slate-400" />
  return null
}

function SeasonRecordBar({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses
  if (total === 0) return null
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-league-text/5">
      <div className="bg-emerald-500 transition-all" style={{ width: `${(wins / total) * 100}%` }} />
      <div className="bg-amber-400 transition-all" style={{ width: `${(draws / total) * 100}%` }} />
      <div className="bg-red-500 transition-all" style={{ width: `${(losses / total) * 100}%` }} />
    </div>
  )
}

function TopPerformers({ scorers, goalie }: { scorers: ScorerInfo[]; goalie: GoalieInfo | undefined }) {
  if (scorers.length === 0 && !goalie) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-league-text/50">
      {scorers.slice(0, 3).map((s, i) => (
        <span key={s.playerId}>
          {i === 0 && <span className="text-league-text/30 mr-1">Top:</span>}
          {s.player.firstName.charAt(0)}. {s.player.lastName} ({s.totalPoints}P)
        </span>
      ))}
      {goalie && (
        <span>
          <span className="text-league-text/30 mr-1">TW:</span>
          {goalie.player.firstName.charAt(0)}. {goalie.player.lastName} (
          {goalie.gaa ? Number(goalie.gaa.toString()).toFixed(2) : "–"})
        </span>
      )}
    </div>
  )
}

function SeasonCard({
  entry,
  topScorers,
  topGoalies,
}: {
  entry: SeasonEntry
  topScorers: ScorerInfo[]
  topGoalies: GoalieInfo[]
}) {
  const [expanded, setExpanded] = useState(false)
  const t = useT()
  const { season, divisions, totals, bestRank } = entry
  const scorers = topScorers.filter((s) => s.seasonId === season.id)
  const goalie = topGoalies.find((g) => g.seasonId === season.id)

  return (
    <div className="bg-league-surface rounded-xl border border-league-text/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{season.name}</span>
            {divisions.map((d) => (
              <span
                key={d.id}
                className="text-[10px] border border-league-text/10 rounded px-1.5 py-0.5 text-league-text/50"
              >
                {d.name}
              </span>
            ))}
          </div>
        </div>
        {bestRank !== null && (
          <div className="flex items-center gap-1 shrink-0">
            {getRankIcon(bestRank)}
            <span className="text-sm font-bold tabular-nums">#{bestRank}</span>
          </div>
        )}
      </div>

      <SeasonRecordBar wins={totals.wins} draws={totals.draws} losses={totals.losses} />

      <div className="flex items-center gap-4 text-xs text-league-text/50">
        <span>
          {totals.wins}
          {t.abbr.w} {totals.draws}
          {t.abbr.d} {totals.losses}
          {t.abbr.l}
        </span>
        <span>&middot;</span>
        <span>
          {totals.goalsFor}:{totals.goalsAgainst}{" "}
          <span className={totals.goalDifference >= 0 ? "text-emerald-600" : "text-red-500"}>
            ({totals.goalDifference > 0 ? "+" : ""}
            {totals.goalDifference})
          </span>
        </span>
        <span>&middot;</span>
        <span>
          {totals.gamesPlayed} {t.abbr.gp}
        </span>
      </div>

      <TopPerformers scorers={scorers} goalie={goalie} />

      {divisions.some((d) => d.rounds.length > 1) && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-league-text/40 hover:text-league-text transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? t.common.less : t.common.details}
          </button>

          {expanded && (
            <div className="space-y-2 pt-1">
              {divisions.map((div) =>
                div.rounds.length > 0 ? (
                  <div key={div.id}>
                    {divisions.length > 1 && <p className="text-xs font-medium text-league-text/40 mb-1">{div.name}</p>}
                    <div className="space-y-1">
                      {div.rounds.map((round) => (
                        <div
                          key={round.id}
                          className="flex items-center justify-between text-xs px-2 py-1 rounded bg-league-text/[0.03]"
                        >
                          <span className="font-medium">{round.name}</span>
                          {round.standing ? (
                            <span className="tabular-nums text-league-text/50">
                              #{round.standing.rank} &middot; {round.standing.wins}
                              {t.abbr.w} {round.standing.draws}
                              {t.abbr.d} {round.standing.losses}
                              {t.abbr.l} &middot; {round.standing.goalsFor}:{round.standing.goalsAgainst} &middot;{" "}
                              {round.standing.totalPoints} {t.abbr.pts}
                            </span>
                          ) : (
                            <span className="text-league-text/30">–</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SeasonTimeline({
  seasons,
  topScorers,
  topGoalies,
}: {
  seasons: SeasonEntry[]
  topScorers: ScorerInfo[]
  topGoalies: GoalieInfo[]
}) {
  const t = useT()

  if (seasons.length === 0) {
    return <p className="text-sm text-league-text/40 text-center py-8">{t.seasonTimeline.noSeasons}</p>
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t.seasonTimeline.title}</h2>
      <div className="space-y-4">
        {seasons.map((entry) => (
          <SeasonCard key={entry.season.id} entry={entry} topScorers={topScorers} topGoalies={topGoalies} />
        ))}
      </div>
    </div>
  )
}

export { SeasonTimeline }
export type { SeasonEntry, ScorerInfo, GoalieInfo }
