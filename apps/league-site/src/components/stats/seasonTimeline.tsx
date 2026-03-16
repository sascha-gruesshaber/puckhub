import { Link } from "@tanstack/react-router"
import { ChevronDown, Medal, Trophy, User, UserMinus, UserPlus } from "lucide-react"
import { useState } from "react"
import type { Translations } from "~/lib/i18n"
import { useT } from "~/lib/i18n"
import { cn, slugify } from "~/lib/utils"

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

interface RosterPlayer {
  playerId: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  jerseyNumber?: number | null
  position?: string
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
  rosterChanges?: {
    joined: RosterPlayer[]
    departed: RosterPlayer[]
  }
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

// ---------------------------------------------------------------------------
// Timeline dot styling based on best placement
// ---------------------------------------------------------------------------
function getTimelineDotClasses(rank: number | null) {
  if (rank === 1) return "border-yellow-400 bg-yellow-50 shadow-sm shadow-yellow-200/50"
  if (rank === 2) return "border-slate-300 bg-slate-50"
  if (rank === 3) return "border-amber-500 bg-amber-50"
  return "border-league-text/20 bg-league-surface"
}

// ---------------------------------------------------------------------------
// Rank badge (top-right corner of each card)
// ---------------------------------------------------------------------------
function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return null
  const icon =
    rank === 1 ? (
      <Trophy className="h-3.5 w-3.5" />
    ) : rank <= 3 ? (
      <Medal className="h-3.5 w-3.5" />
    ) : null

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums shrink-0",
        rank === 1 && "bg-yellow-50 text-yellow-700 border border-yellow-200",
        rank === 2 && "bg-slate-50 text-slate-600 border border-slate-200",
        rank === 3 && "bg-amber-50 text-amber-700 border border-amber-200",
        rank > 3 && "bg-league-text/5 text-league-text/50 border border-league-text/10",
      )}
    >
      {icon}
      <span>#{rank}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// W / D / L record bar with colored legend
// ---------------------------------------------------------------------------
function RecordBar({ wins, draws, losses, t }: { wins: number; draws: number; losses: number; t: Translations }) {
  const total = wins + draws + losses
  if (total === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-league-text/5">
        {wins > 0 && (
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(wins / total) * 100}%` }} />
        )}
        {draws > 0 && (
          <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(draws / total) * 100}%` }} />
        )}
        {losses > 0 && (
          <div className="bg-red-400 transition-all duration-500" style={{ width: `${(losses / total) * 100}%` }} />
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="font-semibold text-emerald-700">{wins}</span>
          <span className="text-league-text/40">{t.abbr.w}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="font-semibold text-amber-600">{draws}</span>
          <span className="text-league-text/40">{t.abbr.d}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="font-semibold text-red-600">{losses}</span>
          <span className="text-league-text/40">{t.abbr.l}</span>
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Roster changes: mini player cards linking to profiles
// ---------------------------------------------------------------------------
function PlayerCard({ player, accent }: { player: RosterPlayer; accent: "green" | "red" }) {
  return (
    <Link
      to="/players/$playerId/$slug"
      params={{ playerId: player.playerId, slug: slugify(`${player.firstName} ${player.lastName}`) }}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all group",
        accent === "green"
          ? "border-emerald-200/60 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50"
          : "border-red-200/60 bg-red-50/40 hover:border-red-300 hover:bg-red-50",
      )}
    >
      {player.photoUrl ? (
        <img
          src={player.photoUrl}
          alt={`${player.firstName} ${player.lastName}`}
          className="h-6 w-6 rounded-full object-cover object-top shrink-0"
        />
      ) : (
        <div className="h-6 w-6 rounded-full bg-league-text/10 flex items-center justify-center shrink-0">
          <User className="h-3 w-3 text-league-text/30" />
        </div>
      )}
      <span className="text-[11px] font-medium text-league-text/70 group-hover:text-league-text truncate">
        {player.firstName.charAt(0)}. {player.lastName}
      </span>
      {player.jerseyNumber != null && (
        <span className="text-[10px] tabular-nums font-bold text-league-text/25 shrink-0">#{player.jerseyNumber}</span>
      )}
    </Link>
  )
}

function RosterChanges({
  joined,
  departed,
  t,
}: {
  joined: RosterPlayer[]
  departed: RosterPlayer[]
  t: Translations
}) {
  if (joined.length === 0 && departed.length === 0) return null

  return (
    <div className="space-y-2.5 pt-3 border-t border-league-text/[0.06]">
      {joined.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-emerald-600">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="font-medium text-[10px] uppercase tracking-wider">{t.seasonTimeline.joined}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {joined.map((p) => (
              <PlayerCard key={p.playerId} player={p} accent="green" />
            ))}
          </div>
        </div>
      )}
      {departed.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-red-400">
            <UserMinus className="h-3.5 w-3.5" />
            <span className="font-medium text-[10px] uppercase tracking-wider">{t.seasonTimeline.departed}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {departed.map((p) => (
              <PlayerCard key={p.playerId} player={p} accent="red" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top performers shown as small chips
// ---------------------------------------------------------------------------
function TopPerformers({
  scorers,
  goalie,
  t,
}: {
  scorers: ScorerInfo[]
  goalie: GoalieInfo | undefined
  t: Translations
}) {
  if (scorers.length === 0 && !goalie) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {scorers.slice(0, 3).map((s) => (
        <span
          key={s.playerId}
          className="inline-flex items-center gap-1 text-[11px] bg-league-primary/5 text-league-text/65 rounded-md px-2 py-0.5"
        >
          {s.player.firstName.charAt(0)}. {s.player.lastName}
          <span className="font-bold text-league-primary/70">
            {s.totalPoints}
            {t.abbr.pts}
          </span>
        </span>
      ))}
      {goalie && (
        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/5 text-league-text/65 rounded-md px-2 py-0.5">
          {goalie.player.firstName.charAt(0)}. {goalie.player.lastName}
          <span className="font-bold text-amber-600">
            {goalie.gaa ? Number(goalie.gaa.toString()).toFixed(2) : "\u2013"}
          </span>
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expandable round-by-round breakdown
// ---------------------------------------------------------------------------
function RoundDetailsTable({ divisions, t }: { divisions: DivisionInfo[]; t: Translations }) {
  return (
    <div className="space-y-3 animate-slide-down">
      {divisions.map((div) =>
        div.rounds.length > 0 ? (
          <div key={div.id}>
            {divisions.length > 1 && (
              <p className="text-[10px] font-semibold text-league-text/40 uppercase tracking-wider mb-1.5">
                {div.name}
              </p>
            )}
            <div className="rounded-lg border border-league-text/[0.07] overflow-hidden">
              {div.rounds.map((round, i) => (
                <div
                  key={round.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-3 py-2.5 text-xs",
                    i > 0 && "border-t border-league-text/[0.05]",
                    i % 2 === 0 ? "bg-league-text/[0.02]" : "",
                  )}
                >
                  <span className="font-medium text-league-text/70">{round.name}</span>
                  {round.standing ? (
                    <span className="flex items-center gap-3 tabular-nums text-league-text/50">
                      {round.standing.rank !== null && (
                        <span className="font-bold text-league-text/70">#{round.standing.rank}</span>
                      )}
                      <span>
                        {round.standing.wins}
                        {t.abbr.w} {round.standing.draws}
                        {t.abbr.d} {round.standing.losses}
                        {t.abbr.l}
                      </span>
                      <span>
                        {round.standing.goalsFor}:{round.standing.goalsAgainst}
                      </span>
                      <span className="font-semibold text-league-text/60">
                        {round.standing.totalPoints} {t.abbr.pts}
                      </span>
                    </span>
                  ) : (
                    <span className="text-league-text/30">{"\u2013"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single season card within the timeline
// ---------------------------------------------------------------------------
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
  const { season, divisions, totals, bestRank, rosterChanges } = entry
  const scorers = topScorers.filter((s) => s.seasonId === season.id)
  const goalie = topGoalies.find((g) => g.seasonId === season.id)
  const hasMultipleRounds = divisions.some((d) => d.rounds.length > 1)

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-[7px] top-[22px] w-[18px] h-[18px] rounded-full border-[2.5px] z-10",
          getTimelineDotClasses(bestRank),
        )}
      />

      {/* Card */}
      <div className="bg-league-surface rounded-xl border border-league-text/10 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.06)] transition-shadow duration-200">
        <div className="p-5 sm:p-6 space-y-3.5">
          {/* Header: season name + division badges + rank */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-[15px] leading-snug">{season.name}</h3>
              {divisions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {divisions.map((d) => (
                    <span
                      key={d.id}
                      className="text-[10px] font-medium border border-league-text/10 rounded-md px-2 py-0.5 text-league-text/50 bg-league-text/[0.02]"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <RankBadge rank={bestRank} />
          </div>

          {/* W/D/L record bar with legend */}
          <RecordBar wins={totals.wins} draws={totals.draws} losses={totals.losses} t={t} />

          {/* Goals & games played */}
          <div className="flex items-center gap-3 text-sm text-league-text/50">
            <span className="tabular-nums">
              <span className="font-semibold text-league-text/70">
                {totals.goalsFor}:{totals.goalsAgainst}
              </span>{" "}
              <span
                className={cn(
                  "font-semibold",
                  totals.goalDifference > 0 && "text-emerald-600",
                  totals.goalDifference < 0 && "text-red-500",
                )}
              >
                ({totals.goalDifference > 0 ? "+" : ""}
                {totals.goalDifference})
              </span>
            </span>
            <span className="text-league-text/15">&middot;</span>
            <span className="tabular-nums">
              {totals.gamesPlayed} {t.abbr.gp}
            </span>
          </div>

          {/* Top performers chips */}
          <TopPerformers scorers={scorers} goalie={goalie} t={t} />

          {/* Roster changes */}
          {rosterChanges && (rosterChanges.joined.length > 0 || rosterChanges.departed.length > 0) && (
            <RosterChanges joined={rosterChanges.joined} departed={rosterChanges.departed} t={t} />
          )}

          {/* Expandable round details */}
          {hasMultipleRounds && (
            <div className="pt-3 border-t border-league-text/[0.06]">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs font-medium text-league-text/40 hover:text-league-primary transition-colors"
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
                />
                {t.seasonTimeline.roundDetails}
              </button>

              {expanded && (
                <div className="mt-3">
                  <RoundDetailsTable divisions={divisions} t={t} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main timeline component
// ---------------------------------------------------------------------------
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
      <h2 className="text-lg font-semibold mb-4">{t.seasonTimeline.title}</h2>

      <div className="relative">
        {/* Vertical timeline connector */}
        {seasons.length > 1 && (
          <div
            className="absolute left-[15px] w-0.5 bg-gradient-to-b from-league-primary/20 to-transparent"
            style={{ top: 22, bottom: 22 }}
          />
        )}

        <div className="space-y-6">
          {seasons.map((entry) => (
            <SeasonCard key={entry.season.id} entry={entry} topScorers={topScorers} topGoalies={topGoalies} />
          ))}
        </div>
      </div>
    </div>
  )
}

export { SeasonTimeline }
export type { SeasonEntry, ScorerInfo, GoalieInfo }
