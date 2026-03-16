import { createFileRoute, Link, useSearch } from "@tanstack/react-router"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { EmptyState } from "~/components/shared/emptyState"
import { StandingsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { RoundNavigator } from "~/components/shared/roundNavigator"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { Th } from "~/components/stats/statsTables"
import { useOrg, useSeason } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { cn, slugify, useBackPath } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

export const standingsSearchValidator = (
  s: Record<string, unknown>,
): { season?: string; division?: string; round?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
  ...(typeof s.division === "string" && s.division ? { division: s.division } : {}),
  ...(typeof s.round === "string" && s.round ? { round: s.round } : {}),
})

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
  head: () => ({ meta: [{ title: "Tabelle" }] }),
  validateSearch: standingsSearchValidator,
})

export function StandingsPage() {
  const org = useOrg()
  const season = useSeason()
  const t = useT()
  const filterNavigate = useFilterNavigate()
  const {
    season: seasonParam,
    division: divisionParam,
    round: roundParam,
  } = useSearch({ strict: false }) as { season?: string; division?: string; round?: string }

  const selectedSeasonId = seasonParam ?? season.current?.id
  const selectedDivisionIdx = divisionParam ? Number(divisionParam) : 0
  const selectedRoundId = roundParam || undefined

  const setSelectedSeasonId = (v: string) =>
    filterNavigate({ search: { season: v === season.current?.id ? undefined : v } })
  const setSelectedDivisionIdx = (v: number) =>
    filterNavigate({
      search: (prev: any) => ({ ...prev, division: v === 0 ? undefined : String(v), round: undefined }),
    })
  const setSelectedRoundId = (v: string | undefined) =>
    filterNavigate({ search: (prev: any) => ({ ...prev, round: v || undefined }) })

  const { data: structure } = trpc.publicSite.getSeasonStructure.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const firstDivision = structure?.[0]
  const selectedDivision = structure?.[selectedDivisionIdx] ?? firstDivision
  const activeRoundId = selectedRoundId ?? selectedDivision?.rounds[0]?.id

  const { data: standings, isLoading } = trpc.publicSite.getStandings.useQuery(
    { organizationId: org.id, roundId: activeRoundId! },
    { enabled: !!activeRoundId, staleTime: 60_000 },
  )

  const { data: teamForm } = trpc.publicSite.getTeamForm.useQuery(
    { organizationId: org.id, roundId: activeRoundId! },
    { enabled: !!activeRoundId, staleTime: 60_000 },
  )

  const formMap = new Map(teamForm?.map((t) => [t.teamId, t.form]) ?? [])
  const backPath = useBackPath()

  return (
    <StatsPageShell title={t.standings.title} selectedSeasonId={selectedSeasonId} onSeasonChange={setSelectedSeasonId}>
      {structure && (
        <RoundNavigator
          divisions={structure}
          activeRoundId={activeRoundId}
          onRoundChange={setSelectedRoundId}
          onDivisionChange={setSelectedDivisionIdx}
          activeDivisionIndex={selectedDivisionIdx}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <StandingsTableSkeleton />
      ) : standings && standings.length > 0 ? (
        <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <Th className="px-4 py-3 text-center w-12" title={t.tooltip.gamesPlayed}>
                  {t.abbr.gp}
                </Th>
                <Th className="px-4 py-3 text-center w-10" title={t.tooltip.wins}>
                  {t.abbr.w}
                </Th>
                <Th className="px-4 py-3 text-center w-10" title={t.tooltip.draws}>
                  {t.abbr.d}
                </Th>
                <Th className="px-4 py-3 text-center w-10" title={t.tooltip.losses}>
                  {t.abbr.l}
                </Th>
                <Th className="px-4 py-3 text-center w-16" title={t.tooltip.goalsForAgainst}>
                  {t.tooltip.goals}
                </Th>
                <Th className="px-4 py-3 text-center w-12" title={t.tooltip.goalDifference}>
                  {t.abbr.diff}
                </Th>
                <Th className="px-4 py-3 text-center w-12 font-bold" title={t.tooltip.points}>
                  {t.abbr.pts}
                </Th>
                <Th className="px-4 py-3 text-center w-24" title={t.tooltip.last5Games}>
                  Form
                </Th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const form = formMap.get(s.teamId) ?? []
                return (
                  <tr key={s.id} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
                    <td className="px-4 py-3 text-league-text/50 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/teams/$teamId/$slug"
                        params={{ teamId: s.team.id, slug: slugify(s.team.name) }}
                        search={{ from: backPath }}
                        className="flex items-center gap-2 hover:text-league-primary transition-colors"
                      >
                        <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size="sm" />
                        <span className="font-medium">{s.team.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{s.gamesPlayed}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{s.wins}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{s.draws}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{s.losses}</td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {s.goalsFor}:{s.goalsAgainst}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      <span
                        className={cn(s.goalDifference > 0 && "text-green-600", s.goalDifference < 0 && "text-red-600")}
                      >
                        {s.goalDifference > 0 ? "+" : ""}
                        {s.goalDifference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums">{s.totalPoints}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {form.map((f, fi) => (
                          <span
                            key={fi}
                            title={
                              f.result === "W" ? t.tooltip.win : f.result === "D" ? t.tooltip.draw : t.tooltip.loss
                            }
                            className={cn(
                              "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                              f.result === "W" && "bg-green-500",
                              f.result === "D" && "bg-yellow-500",
                              f.result === "L" && "bg-red-500",
                            )}
                          >
                            {f.result === "W" ? t.abbr.w : f.result === "D" ? t.abbr.d : t.abbr.l}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t.standings.noData} description={t.standings.noDataDesc} />
      )}
    </StatsPageShell>
  )
}
