import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { StandingsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useOrg, useSeason } from "~/lib/context"
import { cn } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
  head: () => ({ meta: [{ title: "Tabelle" }] }),
})

function StandingsPage() {
  const org = useOrg()
  const season = useSeason()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(season.current?.id ?? undefined)

  const { data: structure } = trpc.publicSite.getSeasonStructure.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const firstDivision = structure?.[0]
  const [selectedDivisionIdx, setSelectedDivisionIdx] = useState(0)
  const selectedDivision = structure?.[selectedDivisionIdx] ?? firstDivision
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(undefined)
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

  return (
    <div className="animate-fade-in">
      <SectionWrapper title="Tabelle">
        {/* Season selector */}
        {season.all.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedSeasonId ?? ""}
              onChange={(e) => {
                setSelectedSeasonId(e.target.value)
                setSelectedDivisionIdx(0)
                setSelectedRoundId(undefined)
              }}
              className="rounded-md border border-web-text/20 bg-white px-3 py-1.5 text-sm"
            >
              {season.all.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Division tabs */}
        {structure && structure.length > 1 && (
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {structure.map((div, i) => (
              <button
                key={div.id}
                type="button"
                onClick={() => {
                  setSelectedDivisionIdx(i)
                  setSelectedRoundId(undefined)
                }}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  selectedDivisionIdx === i
                    ? "bg-web-primary text-white"
                    : "bg-web-text/5 text-web-text/70 hover:bg-web-text/10",
                )}
              >
                {div.name}
              </button>
            ))}
          </div>
        )}

        {/* Round selector */}
        {selectedDivision && selectedDivision.rounds.length > 1 && (
          <div className="mb-6">
            <select
              value={activeRoundId ?? ""}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="rounded-md border border-web-text/20 bg-white px-3 py-1.5 text-sm"
            >
              {selectedDivision.rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <StandingsTableSkeleton />
        ) : standings && standings.length > 0 ? (
          <div className="rounded-lg border border-web-text/10 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-web-text/[0.03] text-web-text/60 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-center w-12">Sp</th>
                  <th className="px-4 py-3 text-center w-10">S</th>
                  <th className="px-4 py-3 text-center w-10">U</th>
                  <th className="px-4 py-3 text-center w-10">N</th>
                  <th className="px-4 py-3 text-center w-16">Tore</th>
                  <th className="px-4 py-3 text-center w-12">Diff</th>
                  <th className="px-4 py-3 text-center w-12 font-bold">Pkt</th>
                  <th className="px-4 py-3 text-center w-24">Form</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => {
                  const form = formMap.get(s.teamId) ?? []
                  return (
                    <tr key={s.id} className="border-t border-web-text/5 hover:bg-web-text/[0.02]">
                      <td className="px-4 py-3 text-web-text/50 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size="sm" />
                          <span className="font-medium">{s.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{s.gamesPlayed}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{s.wins}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{s.draws}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{s.losses}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {s.goalsFor}:{s.goalsAgainst}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        <span className={cn(s.goalDifference > 0 && "text-green-600", s.goalDifference < 0 && "text-red-600")}>
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
                              className={cn(
                                "inline-block h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white",
                                f.result === "W" && "bg-green-500",
                                f.result === "D" && "bg-yellow-500",
                                f.result === "L" && "bg-red-500",
                              )}
                            >
                              {f.result === "W" ? "S" : f.result === "D" ? "U" : "N"}
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
          <EmptyState title="Noch keine Tabellendaten vorhanden" description="Die Tabelle wird nach den ersten Spielen angezeigt." />
        )}
      </SectionWrapper>
    </div>
  )
}
