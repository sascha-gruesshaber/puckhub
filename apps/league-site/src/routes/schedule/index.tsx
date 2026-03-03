import { createFileRoute } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { useState } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { FilterBar, FilterBarGroup } from "~/components/shared/filterBar"
import { GameCard } from "~/components/shared/gameCard"
import { InlineSelect } from "~/components/shared/inlineSelect"
import { GameCardSkeleton } from "~/components/shared/loadingSkeleton"
import { PillTabs } from "~/components/shared/pillTabs"
import { TeamChipRow } from "~/components/shared/teamChipRow"
import { useOrg, useSeason } from "~/lib/context"
import { formatDate } from "~/lib/utils"
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
        <FilterBar>
          {season.all.length > 1 && (
            <FilterBarGroup label="Saison">
              {season.all.length <= 4 ? (
                <PillTabs
                  size="sm"
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={setSelectedSeasonId}
                />
              ) : (
                <InlineSelect
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={setSelectedSeasonId}
                  icon={<Calendar className="h-3.5 w-3.5 text-league-text/40" />}
                />
              )}
            </FilterBarGroup>
          )}

          <FilterBarGroup label="Status">
            <PillTabs
              size="sm"
              items={[
                { id: "", label: "Alle Spiele" },
                { id: "scheduled", label: "Geplant" },
                { id: "completed", label: "Beendet" },
                { id: "live", label: "Live" },
                { id: "cancelled", label: "Abgesagt" },
              ]}
              value={statusFilter ?? ""}
              onChange={(v) => setStatusFilter(v || undefined)}
            />
          </FilterBarGroup>

          {teams && teams.length > 0 && (
            <FilterBarGroup label="Team">
              <TeamChipRow
                teams={teams.map((t) => ({
                  id: t.id,
                  name: t.name,
                  shortName: t.shortName ?? t.name,
                  logoUrl: t.logoUrl ?? null,
                }))}
                value={teamFilter}
                onChange={setTeamFilter}
              />
            </FilterBarGroup>
          )}
        </FilterBar>

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
                <h3 className="text-sm font-semibold text-league-text/50 mb-2 uppercase tracking-wider">{dateKey}</h3>
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
                  className="rounded-lg bg-league-primary px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
