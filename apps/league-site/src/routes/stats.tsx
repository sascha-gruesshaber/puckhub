import { createFileRoute } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { useState, useMemo } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { FilterBar, FilterBarGroup } from "~/components/shared/filterBar"
import { InlineSelect } from "~/components/shared/inlineSelect"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { PillTabs } from "~/components/shared/pillTabs"
import { PlayerHoverCard } from "~/components/shared/playerHoverCard"
import { StatsSummaryCards } from "~/components/shared/statsSummaryCards"
import { TeamChipRow } from "~/components/shared/teamChipRow"
import { TeamHoverCard } from "~/components/shared/teamHoverCard"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { cn } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  head: () => ({ meta: [{ title: "Statistiken" }] }),
})

type Tab = "scorers" | "goals" | "assists" | "penalties" | "goalies"

const tabs: { id: Tab; label: string }[] = [
  { id: "scorers", label: "Scorer" },
  { id: "goals", label: "Tore" },
  { id: "assists", label: "Vorlagen" },
  { id: "penalties", label: "Strafen" },
  { id: "goalies", label: "Torhüter" },
]

/** Tooltip-enhanced table header */
function Th({
  children,
  title,
  className,
}: {
  children: React.ReactNode
  title?: string
  className?: string
}) {
  return (
    <th className={className}>
      {title ? (
        <span className="border-b border-dotted border-league-text/30 cursor-help" title={title}>
          {children}
        </span>
      ) : (
        children
      )}
    </th>
  )
}

function StatsPage() {
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(season.current?.id ?? undefined)
  const [activeTab, setActiveTab] = useState<Tab>("scorers")
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined)

  const isPlayerTab = activeTab === "scorers" || activeTab === "goals" || activeTab === "assists"

  const { data: teams } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const { data: playerStats, isLoading: playerLoading } = trpc.publicSite.getPlayerStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId!, teamId: selectedTeamId },
    { enabled: !!selectedSeasonId && isPlayerTab, staleTime: 60_000 },
  )

  const { data: goalieData, isLoading: goalieLoading } = trpc.publicSite.getGoalieStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId!, teamId: selectedTeamId },
    { enabled: !!selectedSeasonId && activeTab === "goalies", staleTime: 60_000 },
  )

  const { data: penaltyStats, isLoading: penaltyLoading } = trpc.publicSite.getPenaltyStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId!, teamId: selectedTeamId },
    { enabled: !!selectedSeasonId && activeTab === "penalties", staleTime: 60_000 },
  )

  // Summary card data — fetch all three without team filter (React Query deduplicates if no team selected)
  const { data: summaryPlayerStats } = trpc.publicSite.getPlayerStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId && features.advancedStats, staleTime: 60_000 },
  )
  const { data: summaryGoalieData } = trpc.publicSite.getGoalieStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId && features.advancedStats, staleTime: 60_000 },
  )
  const { data: summaryPenaltyStats } = trpc.publicSite.getPenaltyStats.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId && features.advancedStats, staleTime: 60_000 },
  )

  const sortedPlayerStats = useMemo(() => {
    if (!playerStats) return []
    if (activeTab === "goals") return [...playerStats].sort((a, b) => b.goals - a.goals || b.totalPoints - a.totalPoints)
    if (activeTab === "assists") return [...playerStats].sort((a, b) => b.assists - a.assists || b.totalPoints - a.totalPoints)
    return playerStats
  }, [playerStats, activeTab])

  const isLoading = isPlayerTab ? playerLoading : activeTab === "goalies" ? goalieLoading : penaltyLoading

  return (
    <div className="animate-fade-in">
      <SectionWrapper title="Statistiken">
        {/* Filters */}
        <FilterBar>
          {season.all.length > 1 && (
            <FilterBarGroup label="Saison">
              {season.all.length <= 4 ? (
                <PillTabs
                  size="sm"
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={(v) => {
                    setSelectedSeasonId(v)
                    setSelectedTeamId(undefined)
                  }}
                />
              ) : (
                <InlineSelect
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={(v) => {
                    setSelectedSeasonId(v)
                    setSelectedTeamId(undefined)
                  }}
                  icon={<Calendar className="h-3.5 w-3.5 text-league-text/40" />}
                />
              )}
            </FilterBarGroup>
          )}

          {teams && teams.length > 0 && (
            <FilterBarGroup label="Team">
              <TeamChipRow
                teams={teams.map((t) => ({
                  id: t.id,
                  name: t.name,
                  shortName: t.shortName ?? t.name,
                  logoUrl: t.logoUrl ?? null,
                }))}
                value={selectedTeamId}
                onChange={setSelectedTeamId}
              />
            </FilterBarGroup>
          )}
        </FilterBar>

        {/* Summary cards (Pro plan only) */}
        {features.advancedStats && summaryPlayerStats && (
          <StatsSummaryCards
            playerStats={summaryPlayerStats}
            goalieStats={summaryGoalieData ?? null}
            penaltyStats={summaryPenaltyStats ?? []}
          />
        )}

        {/* Stat type tabs */}
        <PillTabs items={tabs} value={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Content */}
        {isLoading ? (
          <StatsTableSkeleton />
        ) : isPlayerTab ? (
          <PlayerTable stats={sortedPlayerStats} activeTab={activeTab} advancedStats={features.advancedStats} />
        ) : activeTab === "goalies" ? (
          <GoalieTable data={goalieData ?? { qualified: [], belowThreshold: [], minGames: 7 }} advancedStats={features.advancedStats} />
        ) : (
          <PenaltyTable stats={penaltyStats ?? []} advancedStats={features.advancedStats} />
        )}
      </SectionWrapper>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Player stats table (Scorers / Goals / Assists)
// ---------------------------------------------------------------------------

function PlayerTable({ stats, activeTab, advancedStats }: { stats: any[]; activeTab: Tab; advancedStats: boolean }) {
  if (stats.length === 0) {
    return <EmptyState title="Keine Statistiken vorhanden" description="Es liegen noch keine Spielerstatistiken für diese Saison vor." />
  }

  return (
    <div className="rounded-lg border border-league-text/10 bg-white overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-10">#</th>
            <th className="px-4 py-3 text-left">Spieler</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
            <Th className="px-4 py-3 text-center w-12" title="Spiele">Sp</Th>
            <Th className={cn("px-4 py-3 text-center w-12", activeTab === "goals" && "font-bold")} title="Tore">T</Th>
            <Th className={cn("px-4 py-3 text-center w-12", activeTab === "assists" && "font-bold")} title="Vorlagen">V</Th>
            <Th className={cn("px-4 py-3 text-center w-12", activeTab === "scorers" && "font-bold")} title="Punkte (Tore + Vorlagen)">Pkt</Th>
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
                    >
                      <span className="font-medium cursor-pointer hover:text-league-primary transition-colors">
                        {s.player.firstName} {s.player.lastName}
                      </span>
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
                  >
                    <div className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                      <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                      <span>{s.team?.shortName ?? s.team?.name}</span>
                    </div>
                  </TeamHoverCard>
                ) : (
                  <div className="flex items-center gap-2">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                    <span>{s.team?.shortName ?? s.team?.name}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center tabular-nums">{s.gamesPlayed}</td>
              <td className={cn("px-4 py-3 text-center tabular-nums", activeTab === "goals" && "font-bold")}>{s.goals}</td>
              <td className={cn("px-4 py-3 text-center tabular-nums", activeTab === "assists" && "font-bold")}>{s.assists}</td>
              <td className={cn("px-4 py-3 text-center tabular-nums", activeTab === "scorers" && "font-bold")}>{s.totalPoints}</td>
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
  return (
    <>
      {title && <h3 className="text-sm font-medium text-league-text/60 mb-2 mt-4">{title}</h3>}
      <div className="rounded-lg border border-league-text/10 bg-white overflow-x-auto mb-4">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Torhüter</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
              <Th className="px-4 py-3 text-center w-12" title="Spiele">Sp</Th>
              <Th className="px-4 py-3 text-center w-12" title="Gegentore">GT</Th>
              <Th className="px-4 py-3 text-center w-16 font-bold" title="Goals Against Average (Gegentorschnitt)">GAA</Th>
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
                      >
                        <span className="font-medium cursor-pointer hover:text-league-primary transition-colors">
                          {s.player.firstName} {s.player.lastName}
                        </span>
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
                    >
                      <div className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                        <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                        <span>{s.team?.shortName ?? s.team?.name}</span>
                      </div>
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

function GoalieTable({ data, advancedStats }: { data: { qualified: any[]; belowThreshold: any[]; minGames: number }; advancedStats: boolean }) {
  if (data.qualified.length === 0 && data.belowThreshold.length === 0) {
    return <EmptyState title="Keine Torhüterstatistiken vorhanden" description="Es liegen noch keine Torhüterstatistiken für diese Saison vor." />
  }

  return (
    <div>
      {data.qualified.length > 0 && <GoalieSection stats={data.qualified} startRank={1} advancedStats={advancedStats} />}
      {data.belowThreshold.length > 0 && (
        <GoalieSection
          title={`Unter Mindestspielanzahl (${data.minGames} Spiele)`}
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

function PenaltyTable({ stats, advancedStats }: { stats: any[]; advancedStats: boolean }) {
  if (stats.length === 0) {
    return <EmptyState title="Keine Strafstatistiken vorhanden" description="Es liegen noch keine Strafstatistiken für diese Saison vor." />
  }

  return (
    <div className="rounded-lg border border-league-text/10 bg-white overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-10">#</th>
            <th className="px-4 py-3 text-left">Spieler</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
            <Th className="px-4 py-3 text-center w-16" title="Anzahl der Strafen">Strafen</Th>
            <Th className="px-4 py-3 text-center w-20 font-bold" title="Strafminuten gesamt">Strafmin.</Th>
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
                    >
                      <span className="font-medium cursor-pointer hover:text-league-primary transition-colors">
                        {s.player.firstName} {s.player.lastName}
                      </span>
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
                  >
                    <div className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                      <TeamLogo name={s.team.name ?? ""} logoUrl={s.team.logoUrl} size="sm" />
                      <span>{s.team.shortName ?? s.team.name}</span>
                    </div>
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
