import { Badge, Card, CardContent } from "@puckhub/ui"
import { ChevronDown, Medal, Trophy } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { SeasonRecordBar } from "./seasonRecordBar"
import { RosterChanges } from "./rosterChanges"
import { TopPerformers } from "./topPerformers"
import "./teamTimeline.css"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  totals: { gamesPlayed: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number }
  bestRank: number | null
  bestRankRoundType: string | null
}

interface ContractInfo {
  id: string
  playerId: string
  position: string
  jerseyNumber: number | null
  startSeason: { id: string }
  endSeason: { id: string } | null
  player: { id?: string; firstName: string; lastName: string; photoUrl: string | null }
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

interface SeasonTimelineProps {
  seasons: SeasonEntry[]
  contracts: ContractInfo[]
  topScorers: ScorerInfo[]
  topGoalies: GoalieInfo[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRankIcon(rank: number | null) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
  if (rank === 2 || rank === 3) return <Medal className="h-4 w-4 text-slate-400" />
  return null
}

function getNodeClass(rank: number | null) {
  if (rank === 1) return "team-timeline-node team-timeline-node--champion"
  if (rank === 2 || rank === 3) return "team-timeline-node team-timeline-node--podium"
  return "team-timeline-node team-timeline-node--regular"
}

function getSeasonYear(seasonStart: Date | string) {
  return new Date(seasonStart).getUTCFullYear().toString()
}

// ---------------------------------------------------------------------------
// Season Card
// ---------------------------------------------------------------------------

function SeasonCard({
  entry,
  contracts,
  topScorers,
  topGoalies,
}: {
  entry: SeasonEntry
  contracts: ContractInfo[]
  topScorers: ScorerInfo[]
  topGoalies: GoalieInfo[]
}) {
  const { t } = useTranslation("common")
  const [expanded, setExpanded] = useState(false)

  const { season, divisions, totals, bestRank } = entry
  const scorers = topScorers.filter((s) => s.seasonId === season.id)
  const goalie = topGoalies.find((g) => g.seasonId === season.id)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Season header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{season.name}</span>
              {divisions.map((d) => (
                <Badge key={d.id} variant="outline" className="text-[10px]">
                  {d.name}
                </Badge>
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

        {/* W-D-L record bar */}
        <SeasonRecordBar wins={totals.wins} draws={totals.draws} losses={totals.losses} />

        {/* Compact stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            {totals.wins}W {totals.draws}D {totals.losses}L
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
            {totals.gamesPlayed} {t("teamsPage.history.gamesShort")}
          </span>
        </div>

        {/* Top performers inline */}
        <TopPerformers scorers={scorers} goalie={goalie} />

        {/* Expandable section */}
        {(divisions.some((d) => d.rounds.length > 1) || contracts.length > 0) && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? t("teamsPage.history.collapse") : t("teamsPage.history.expand")}
            </button>

            {expanded && (
              <div className="space-y-3 pt-1">
                {/* Per-round breakdown */}
                {divisions.map((div) =>
                  div.rounds.length > 0 ? (
                    <div key={div.id}>
                      {divisions.length > 1 && (
                        <p className="text-xs font-medium text-muted-foreground mb-1">{div.name}</p>
                      )}
                      <div className="space-y-1">
                        {div.rounds.map((round) => (
                          <div
                            key={round.id}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/40"
                          >
                            <span className="font-medium">{round.name}</span>
                            {round.standing ? (
                              <span className="tabular-nums text-muted-foreground">
                                #{round.standing.rank} &middot; {round.standing.wins}W {round.standing.draws}D{" "}
                                {round.standing.losses}L &middot; {round.standing.goalsFor}:{round.standing.goalsAgainst}{" "}
                                &middot; {round.standing.totalPoints} {t("teamsPage.history.pts")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}

                {/* Roster changes */}
                <RosterChanges seasonId={season.id} contracts={contracts} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function SeasonTimeline({ seasons, contracts, topScorers, topGoalies }: SeasonTimelineProps) {
  const { t } = useTranslation("common")

  if (seasons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">{t("teamsPage.history.noSeasons")}</p>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t("teamsPage.history.seasonBySeasonTitle")}</h2>
      <ol className="team-timeline">
        {seasons.map((entry, i) => {
          const year = getSeasonYear(entry.season.seasonStart)
          const prevYear = i > 0 ? getSeasonYear(seasons[i - 1]!.season.seasonStart) : null
          const showYear = year !== prevYear

          return (
            <li
              key={entry.season.id}
              className="team-timeline-entry"
              style={{ "--entry-index": i } as React.CSSProperties}
            >
              <div className="team-timeline-year">{showYear ? year : ""}</div>
              <div className="team-timeline-spine">
                <div className={getNodeClass(entry.bestRank)} />
              </div>
              <div className="team-timeline-card">
                <SeasonCard
                  entry={entry}
                  contracts={contracts.filter(
                    (c) => c.startSeason.id === entry.season.id || c.endSeason?.id === entry.season.id,
                  )}
                  topScorers={topScorers}
                  topGoalies={topGoalies}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  )
}

export { SeasonTimeline, TimelineSkeleton }
export type { SeasonEntry, ContractInfo, ScorerInfo, GoalieInfo }
