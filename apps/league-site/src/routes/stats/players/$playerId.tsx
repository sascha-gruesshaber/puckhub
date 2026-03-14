import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router"
import { ArrowLeft, Users } from "lucide-react"
import { lazy, Suspense, useMemo, useState } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { CareerStatsSummary } from "~/components/stats/careerStatsSummary"
import { PlayerSeasonStatsTable } from "~/components/stats/playerSeasonStatsTable"
import type { Contract, Suspension } from "~/components/stats/playerTimeline"
import { PlayerTimeline } from "~/components/stats/playerTimeline"
import { useFeatures, useOrg } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { trpc } from "../../../../lib/trpc"

const SeasonProgressionCharts = lazy(() =>
  import("~/components/charts/seasonProgressionCharts").then((m) => ({ default: m.SeasonProgressionCharts })),
)

export const playerSearchValidator = (s: Record<string, unknown>): { from?: string } => ({
  ...(typeof s.from === "string" && s.from ? { from: s.from } : {}),
})

export const Route = createFileRoute("/stats/players/$playerId")({
  component: PlayerHistoryPage,
  head: () => ({ meta: [{ title: "Spieler" }] }),
  validateSearch: playerSearchValidator,
})

function BackLink({ from }: { from?: string }) {
  const t = useT()
  if (from) {
    return (
      <a href={from} className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6">
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </a>
    )
  }
  return (
    <Link to="/stats/scorers" className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6">
      <ArrowLeft className="h-4 w-4" />
      {t.playerDetail.backToStats}
    </Link>
  )
}

export function PlayerHistoryPage() {
  const t = useT()
  const { playerId } = useParams({ strict: false }) as { playerId: string }
  const { from } = useSearch({ strict: false }) as { from?: string }
  const org = useOrg()
  const features = useFeatures()
  const [filter, setFilter] = useState("all")

  // Don't render anything if feature is not enabled
  if (!features.advancedStats) {
    return (
      <div className="animate-fade-in">
        <SectionWrapper>
          <BackLink from={from} />
          <EmptyState title={t.playerDetail.notAvailable} description={t.playerDetail.notAvailableDesc} />
        </SectionWrapper>
      </div>
    )
  }

  const { data: player, isLoading: playerLoading } = trpc.publicSite.getPlayerById.useQuery(
    { organizationId: org.id, playerId },
  )
  const { data: rawContracts, isLoading: contractsLoading } = trpc.publicSite.getPlayerContracts.useQuery(
    { organizationId: org.id, playerId },
  )
  const { data: playerCareerStats, isLoading: playerStatsLoading } = trpc.publicSite.getPlayerCareerStats.useQuery(
    { organizationId: org.id, playerId },
  )
  const { data: goalieCareerStats, isLoading: goalieStatsLoading } = trpc.publicSite.getGoalieCareerStats.useQuery(
    { organizationId: org.id, playerId },
  )
  const { data: rawSuspensions } = trpc.publicSite.getPlayerSuspensions.useQuery(
    { organizationId: org.id, playerId },
  )

  const headerLoading = playerLoading || contractsLoading
  const statsLoading = playerStatsLoading || goalieStatsLoading

  const contracts = rawContracts as Contract[] | undefined
  const suspensions = rawSuspensions as Suspension[] | undefined

  const isGoalie = useMemo(() => {
    if (!contracts || contracts.length === 0) return false
    const sorted = [...contracts].sort(
      (a, b) => new Date(b.startSeason.seasonStart).getTime() - new Date(a.startSeason.seasonStart).getTime(),
    )
    return sorted[0]!.position === "goalie"
  }, [contracts])


  if (headerLoading) return <PageSkeleton />

  if (!player) {
    return (
      <div className="animate-fade-in">
        <SectionWrapper>
          <BackLink from={from} />
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={t.playerDetail.notFound}
            description={t.playerDetail.notFoundDesc}
          />
        </SectionWrapper>
      </div>
    )
  }

  const hasPlayerStats = (playerCareerStats?.length ?? 0) > 0
  const hasGoalieStats = (goalieCareerStats?.length ?? 0) > 0
  const hasAnyStats = hasPlayerStats || hasGoalieStats

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        {/* Back link + page title */}
        <BackLink from={from} />
        <h1 className="text-2xl font-bold mb-6">{player.firstName} {player.lastName}</h1>

        <div className="space-y-6">
          {/* Career Stats Summary */}
          {!statsLoading && hasAnyStats && (
            <CareerStatsSummary isGoalie={isGoalie} playerStats={playerCareerStats} goalieStats={goalieCareerStats} />
          )}

          {/* Season Stats Table */}
          {!statsLoading && hasAnyStats && (
            <PlayerSeasonStatsTable isGoalie={isGoalie} playerStats={playerCareerStats} goalieStats={goalieCareerStats} />
          )}

          {/* Progression Charts */}
          {!statsLoading && hasAnyStats && (
            <Suspense fallback={<div className="h-64 rounded-lg bg-league-text/5 animate-pulse" />}>
              <SeasonProgressionCharts isGoalie={isGoalie} playerStats={playerCareerStats} goalieStats={goalieCareerStats} />
            </Suspense>
          )}

          {/* Not found stats */}
          {!statsLoading && !hasAnyStats && !headerLoading && (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={t.playerDetail.noStats}
              description={t.playerDetail.noStatsDesc}
            />
          )}

          {/* Timeline */}
          {contracts && contracts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">{t.playerDetail.career}</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[
                    { value: "all", label: t.common.all },
                    { value: "contract", label: t.playerDetail.contracts },
                    { value: "suspension", label: t.playerDetail.suspensions },
                  ].map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFilter(f.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filter === f.value
                          ? "bg-league-primary text-white"
                          : "bg-league-text/5 text-league-text/60 hover:text-league-text"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <PlayerTimeline contracts={contracts} suspensions={suspensions ?? []} filter={filter} />
              </div>
            </div>
          )}
        </div>
      </SectionWrapper>
    </div>
  )
}
