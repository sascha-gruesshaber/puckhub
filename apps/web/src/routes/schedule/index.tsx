import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { GameCard } from "~/components/shared/gameCard"
import { GameCardSkeleton } from "~/components/shared/loadingSkeleton"
import { useOrg, useSeason } from "~/lib/context"
import { cn, formatDate } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/schedule/")({
  component: SchedulePage,
  head: () => ({ meta: [{ title: "Spielplan" }] }),
})

function SchedulePage() {
  const org = useOrg()
  const season = useSeason()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(season.current?.id ?? undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [teamFilter, setTeamFilter] = useState<string | undefined>(undefined)

  const { data: teams } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.publicSite.listGames.useInfiniteQuery(
      {
        organizationId: org.id,
        seasonId: selectedSeasonId,
        status: statusFilter as any,
        teamId: teamFilter,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 60_000,
        enabled: !!selectedSeasonId,
      },
    )

  const allGames = data?.pages.flatMap((p) => p.games) ?? []

  // Group games by date
  const grouped = new Map<string, typeof allGames>()
  for (const game of allGames) {
    const dateKey = game.scheduledAt ? formatDate(game.scheduledAt) : "Ohne Datum"
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(game)
  }

  return (
    <div className="animate-fade-in">
      <SectionWrapper title="Spielplan & Ergebnisse">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {season.all.length > 1 && (
            <select
              value={selectedSeasonId ?? ""}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="rounded-md border border-web-text/20 bg-white px-3 py-1.5 text-sm"
            >
              {season.all.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter(e.target.value || undefined)}
            className="rounded-md border border-web-text/20 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Alle Spiele</option>
            <option value="scheduled">Geplant</option>
            <option value="completed">Beendet</option>
            <option value="live">Live</option>
            <option value="cancelled">Abgesagt</option>
          </select>

          {teams && teams.length > 0 && (
            <select
              value={teamFilter ?? ""}
              onChange={(e) => setTeamFilter(e.target.value || undefined)}
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

        {/* Games list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        ) : allGames.length > 0 ? (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateKey, games]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-semibold text-web-text/50 mb-2 uppercase tracking-wider">{dateKey}</h3>
                <div className="space-y-2">
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      id={game.id}
                      homeTeam={game.homeTeam}
                      awayTeam={game.awayTeam}
                      homeScore={game.homeScore}
                      awayScore={game.awayScore}
                      status={game.status}
                      scheduledAt={game.scheduledAt}
                      round={game.round}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasNextPage && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-lg bg-web-primary px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Laden..." : "Mehr laden"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="Keine Spiele gefunden" description="Versuche die Filter anzupassen." />
        )}
      </SectionWrapper>
    </div>
  )
}
