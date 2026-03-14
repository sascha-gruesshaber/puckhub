import { Link } from "@tanstack/react-router"
import { Suspense } from "react"
import { EmptyState } from "~/components/shared/emptyState"
import { PlayerHoverCard } from "~/components/shared/playerHoverCard"
import { TeamHoverCard } from "~/components/shared/teamHoverCard"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useT } from "~/lib/i18n"
import { cn, useBackPath } from "~/lib/utils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function Th({ children, title, className }: { children: React.ReactNode; title?: string; className?: string }) {
  return (
    <th className={className}>
      {title ? (
        <span className="border-b border-dotted border-league-text/30 cursor-help" title={title}>{children}</span>
      ) : (
        children
      )}
    </th>
  )
}

export function ChartSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="h-64 rounded-lg bg-league-text/5 animate-pulse" />}>{children}</Suspense>
}

// ---------------------------------------------------------------------------
// Player stats table (Scorers / Goals / Assists)
// ---------------------------------------------------------------------------

type SortColumn = "scorers" | "goals" | "assists"

export function PlayerTable({ stats, sortBy, advancedStats }: { stats: any[]; sortBy: SortColumn; advancedStats: boolean }) {
  const backPath = useBackPath()
  const t = useT()

  if (stats.length === 0) {
    return <EmptyState title={t.statsTables.noStats} description={t.statsTables.noStatsDesc} />
  }

  return (
    <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-10">#</th>
            <th className="px-4 py-3 text-left">{t.statsTables.player}</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
            <Th className="px-4 py-3 text-center w-12" title={t.tooltip.gamesPlayed}>{t.abbr.gp}</Th>
            <Th className={cn("px-4 py-3 text-center w-12", sortBy === "goals" && "font-bold")} title={t.tooltip.goals}>{t.abbr.g}</Th>
            <Th className={cn("px-4 py-3 text-center w-12", sortBy === "assists" && "font-bold")} title={t.tooltip.assists}>{t.abbr.a}</Th>
            <Th className={cn("px-4 py-3 text-center w-12", sortBy === "scorers" && "font-bold")} title={t.tooltip.pointsTotal}>{t.abbr.pts}</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={`${s.playerId}-${s.teamId}`} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
              <td className="px-4 py-3 text-league-text/50 font-medium">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="sm:hidden">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                  </span>
                  {advancedStats ? (
                    <PlayerHoverCard
                      firstName={s.player.firstName}
                      lastName={s.player.lastName}
                      photoUrl={s.player.photoUrl}
                      jerseyNumber={s.player.jerseyNumber}
                      position={s.player.position}
                      team={s.team}
                      nationality={s.player.nationality}
                      dateOfBirth={s.player.dateOfBirth}
                      playerId={s.playerId}
                    >
                      <Link
                        to="/stats/players/$playerId"
                        params={{ playerId: s.playerId }}
                        search={{ from: backPath }}
                        className="font-medium cursor-pointer hover:text-league-primary transition-colors"
                      >
                        {s.player.firstName} {s.player.lastName}
                      </Link>
                    </PlayerHoverCard>
                  ) : (
                    <span className="font-medium">
                      {s.player.firstName} {s.player.lastName}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                {advancedStats ? (
                  <TeamHoverCard
                    name={s.team?.name ?? ""}
                    shortName={s.team?.shortName}
                    logoUrl={s.team?.logoUrl}
                    primaryColor={s.team?.primaryColor}
                    city={s.team?.city}
                    homeVenue={s.team?.homeVenue}
                    website={s.team?.website}
                    teamId={s.team?.id}
                  >
                    <Link to="/teams/$teamId" params={{ teamId: s.team?.id ?? "" }} search={{ from: backPath }} className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                      <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                      <span>{s.team?.shortName ?? s.team?.name}</span>
                    </Link>
                  </TeamHoverCard>
                ) : (
                  <div className="flex items-center gap-2">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                    <span>{s.team?.shortName ?? s.team?.name}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center tabular-nums">{s.gamesPlayed}</td>
              <td className={cn("px-4 py-3 text-center tabular-nums", sortBy === "goals" && "font-bold")}>{s.goals}</td>
              <td className={cn("px-4 py-3 text-center tabular-nums", sortBy === "assists" && "font-bold")}>{s.assists}</td>
              <td className={cn("px-4 py-3 text-center tabular-nums", sortBy === "scorers" && "font-bold")}>{s.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Goalie stats table
// ---------------------------------------------------------------------------

function GoalieSection({ title, stats, startRank, advancedStats }: { title?: string; stats: any[]; startRank: number; advancedStats: boolean }) {
  const backPath = useBackPath()
  const t = useT()

  return (
    <>
      {title && <h3 className="text-sm font-medium text-league-text/60 mb-2 mt-4">{title}</h3>}
      <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-x-auto mb-4">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">{t.statsTables.goalies}</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
              <Th className="px-4 py-3 text-center w-12" title={t.tooltip.gamesPlayed}>{t.abbr.gp}</Th>
              <Th className="px-4 py-3 text-center w-12" title={t.tooltip.goalsAgainst}>{t.abbr.ga}</Th>
              <Th className="px-4 py-3 text-center w-16 font-bold" title={t.tooltip.goalsAgainstAvg}>{t.abbr.gaa}</Th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={`${s.playerId}-${s.teamId}`} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
                <td className="px-4 py-3 text-league-text/50 font-medium">{startRank + i}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="sm:hidden">
                      <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                    </span>
                    {advancedStats ? (
                      <PlayerHoverCard
                        firstName={s.player.firstName}
                        lastName={s.player.lastName}
                        photoUrl={s.player.photoUrl}
                        jerseyNumber={s.player.jerseyNumber}
                        position={s.player.position}
                        team={s.team}
                        nationality={s.player.nationality}
                        dateOfBirth={s.player.dateOfBirth}
                        playerId={s.playerId}
                      >
                        <Link
                          to="/stats/players/$playerId"
                          params={{ playerId: s.playerId }}
                          search={{ from: backPath }}
                          className="font-medium cursor-pointer hover:text-league-primary transition-colors"
                        >
                          {s.player.firstName} {s.player.lastName}
                        </Link>
                      </PlayerHoverCard>
                    ) : (
                      <span className="font-medium">
                        {s.player.firstName} {s.player.lastName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {advancedStats ? (
                    <TeamHoverCard
                      name={s.team?.name ?? ""}
                      shortName={s.team?.shortName}
                      logoUrl={s.team?.logoUrl}
                      primaryColor={s.team?.primaryColor}
                      city={s.team?.city}
                      homeVenue={s.team?.homeVenue}
                      website={s.team?.website}
                      teamId={s.team?.id}
                    >
                      <Link to="/teams/$teamId" params={{ teamId: s.team?.id ?? "" }} search={{ from: backPath }} className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                        <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                        <span>{s.team?.shortName ?? s.team?.name}</span>
                      </Link>
                    </TeamHoverCard>
                  ) : (
                    <div className="flex items-center gap-2">
                      <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                      <span>{s.team?.shortName ?? s.team?.name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">{s.gamesPlayed}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.goalsAgainst}</td>
                <td className="px-4 py-3 text-center tabular-nums font-bold">{Number(s.gaa).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function GoalieTable({ data, advancedStats }: { data: { qualified: any[]; belowThreshold: any[]; minGames: number }; advancedStats: boolean }) {
  const t = useT()

  if (data.qualified.length === 0 && data.belowThreshold.length === 0) {
    return <EmptyState title={t.statsTables.noGoalieStats} description={t.statsTables.noGoalieStatsDesc} />
  }

  return (
    <div>
      {data.qualified.length > 0 && <GoalieSection stats={data.qualified} startRank={1} advancedStats={advancedStats} />}
      {data.belowThreshold.length > 0 && (
        <GoalieSection
          title={`${t.statsTables.belowMinGames} (${data.minGames} ${t.tooltip.gamesPlayed})`}
          stats={data.belowThreshold}
          startRank={data.qualified.length + 1}
          advancedStats={advancedStats}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Penalty stats table
// ---------------------------------------------------------------------------

export function PenaltyTable({ stats, advancedStats }: { stats: any[]; advancedStats: boolean }) {
  const backPath = useBackPath()
  const t = useT()

  if (stats.length === 0) {
    return <EmptyState title={t.statsTables.noPenaltyStats} description={t.statsTables.noPenaltyStatsDesc} />
  }

  return (
    <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-10">#</th>
            <th className="px-4 py-3 text-left">{t.statsTables.player}</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
            <Th className="px-4 py-3 text-center w-16" title={t.tooltip.penalties}>{t.tooltip.penalties}</Th>
            <Th className="px-4 py-3 text-center w-20 font-bold" title={t.tooltip.penaltyMinutesTotal}>{t.abbr.pim}</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={`${s.player?.id}-${s.team?.id}`} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
              <td className="px-4 py-3 text-league-text/50 font-medium">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="sm:hidden">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                  </span>
                  {advancedStats && s.player ? (
                    <PlayerHoverCard
                      firstName={s.player.firstName}
                      lastName={s.player.lastName}
                      photoUrl={s.player.photoUrl}
                      jerseyNumber={s.player.jerseyNumber}
                      position={s.player.position}
                      team={s.team}
                      nationality={s.player.nationality}
                      dateOfBirth={s.player.dateOfBirth}
                      playerId={s.player.id}
                    >
                      <Link
                        to="/stats/players/$playerId"
                        params={{ playerId: s.player.id }}
                        search={{ from: backPath }}
                        className="font-medium cursor-pointer hover:text-league-primary transition-colors"
                      >
                        {s.player.firstName} {s.player.lastName}
                      </Link>
                    </PlayerHoverCard>
                  ) : (
                    <span className="font-medium">
                      {s.player?.firstName} {s.player?.lastName}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                {advancedStats && s.team ? (
                  <TeamHoverCard
                    name={s.team.name}
                    shortName={s.team.shortName}
                    logoUrl={s.team.logoUrl}
                    primaryColor={s.team.primaryColor}
                    city={s.team.city}
                    homeVenue={s.team.homeVenue}
                    website={s.team.website}
                    teamId={s.team.id}
                  >
                    <Link to="/teams/$teamId" params={{ teamId: s.team.id }} search={{ from: backPath }} className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                      <TeamLogo name={s.team.name ?? ""} logoUrl={s.team.logoUrl} size="sm" />
                      <span>{s.team.shortName ?? s.team.name}</span>
                    </Link>
                  </TeamHoverCard>
                ) : (
                  <div className="flex items-center gap-2">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                    <span>{s.team?.shortName ?? s.team?.name}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center tabular-nums">{s.totalCount}</td>
              <td className="px-4 py-3 text-center tabular-nums font-bold">{s.totalMinutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
