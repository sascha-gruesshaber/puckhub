import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { StatsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useOrg, useSeason } from "~/lib/context"
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

function StatsPage() {
  const org = useOrg()
  const season = useSeason()
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
        {/* Season selector + Team filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          {season.all.length > 1 && (
            <select
              value={selectedSeasonId ?? ""}
              onChange={(e) => {
                setSelectedSeasonId(e.target.value)
                setSelectedTeamId(undefined)
              }}
              className="rounded-md border border-web-text/20 bg-white px-3 py-1.5 text-sm"
            >
              {season.all.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {teams && teams.length > 0 && (
            <select
              value={selectedTeamId ?? ""}
              onChange={(e) => setSelectedTeamId(e.target.value || undefined)}
              className="rounded-md border border-web-text/20 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">Alle Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-web-primary text-white"
                  : "bg-web-text/5 text-web-text/70 hover:bg-web-text/10",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <StatsTableSkeleton />
        ) : isPlayerTab ? (
          <PlayerTable stats={sortedPlayerStats} activeTab={activeTab} />
        ) : activeTab === "goalies" ? (
          <GoalieTable data={goalieData ?? { qualified: [], belowThreshold: [], minGames: 7 }} />
        ) : (
          <PenaltyTable stats={penaltyStats ?? []} />
        )}
      </SectionWrapper>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Player stats table (Scorers / Goals / Assists)
// ---------------------------------------------------------------------------

function PlayerTable({ stats, activeTab }: { stats: any[]; activeTab: Tab }) {
  if (stats.length === 0) {
    return <EmptyState title="Keine Statistiken vorhanden" description="Es liegen noch keine Spielerstatistiken für diese Saison vor." />
  }

  return (
    <div className="rounded-lg border border-web-text/10 bg-white overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-web-text/[0.03] text-web-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-10">#</th>
            <th className="px-4 py-3 text-left">Spieler</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
            <th className="px-4 py-3 text-center w-12">Sp</th>
            <th className={cn("px-4 py-3 text-center w-12", activeTab === "goals" && "font-bold")}>T</th>
            <th className={cn("px-4 py-3 text-center w-12", activeTab === "assists" && "font-bold")}>V</th>
            <th className={cn("px-4 py-3 text-center w-12", activeTab === "scorers" && "font-bold")}>Pkt</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={`${s.playerId}-${s.teamId}`} className="border-t border-web-text/5 hover:bg-web-text/[0.02]">
              <td className="px-4 py-3 text-web-text/50 font-medium">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="sm:hidden">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                  </span>
                  <span className="font-medium">
                    {s.player.firstName} {s.player.lastName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <div className="flex items-center gap-2">
                  <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                  <span>{s.team?.shortName ?? s.team?.name}</span>
                </div>
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

function GoalieSection({ title, stats, startRank }: { title?: string; stats: any[]; startRank: number }) {
  return (
    <>
      {title && <h3 className="text-sm font-medium text-web-text/60 mb-2 mt-4">{title}</h3>}
      <div className="rounded-lg border border-web-text/10 bg-white overflow-x-auto mb-4">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-web-text/[0.03] text-web-text/60 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Torhüter</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
              <th className="px-4 py-3 text-center w-12">Sp</th>
              <th className="px-4 py-3 text-center w-12">GT</th>
              <th className="px-4 py-3 text-center w-16 font-bold">GAA</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={`${s.playerId}-${s.teamId}`} className="border-t border-web-text/5 hover:bg-web-text/[0.02]">
                <td className="px-4 py-3 text-web-text/50 font-medium">{startRank + i}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="sm:hidden">
                      <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                    </span>
                    <span className="font-medium">
                      {s.player.firstName} {s.player.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                    <span>{s.team?.shortName ?? s.team?.name}</span>
                  </div>
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

function GoalieTable({ data }: { data: { qualified: any[]; belowThreshold: any[]; minGames: number } }) {
  if (data.qualified.length === 0 && data.belowThreshold.length === 0) {
    return <EmptyState title="Keine Torhüterstatistiken vorhanden" description="Es liegen noch keine Torhüterstatistiken für diese Saison vor." />
  }

  return (
    <div>
      {data.qualified.length > 0 && <GoalieSection stats={data.qualified} startRank={1} />}
      {data.belowThreshold.length > 0 && (
        <GoalieSection
          title={`Unter Mindestspielanzahl (${data.minGames} Spiele)`}
          stats={data.belowThreshold}
          startRank={data.qualified.length + 1}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Penalty stats table
// ---------------------------------------------------------------------------

function PenaltyTable({ stats }: { stats: any[] }) {
  if (stats.length === 0) {
    return <EmptyState title="Keine Strafstatistiken vorhanden" description="Es liegen noch keine Strafstatistiken für diese Saison vor." />
  }

  return (
    <div className="rounded-lg border border-web-text/10 bg-white overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="bg-web-text/[0.03] text-web-text/60 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-10">#</th>
            <th className="px-4 py-3 text-left">Spieler</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Team</th>
            <th className="px-4 py-3 text-center w-16">Strafen</th>
            <th className="px-4 py-3 text-center w-20 font-bold">Strafmin.</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={`${s.player?.id}-${s.team?.id}`} className="border-t border-web-text/5 hover:bg-web-text/[0.02]">
              <td className="px-4 py-3 text-web-text/50 font-medium">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="sm:hidden">
                    <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                  </span>
                  <span className="font-medium">
                    {s.player?.firstName} {s.player?.lastName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <div className="flex items-center gap-2">
                  <TeamLogo name={s.team?.name ?? ""} logoUrl={s.team?.logoUrl} size="sm" />
                  <span>{s.team?.shortName ?? s.team?.name}</span>
                </div>
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
