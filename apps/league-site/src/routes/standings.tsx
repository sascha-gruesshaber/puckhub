import { createFileRoute } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { useState } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { FilterBar, FilterBarGroup } from "~/components/shared/filterBar"
import { InlineSelect } from "~/components/shared/inlineSelect"
import { StandingsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { PillTabs } from "~/components/shared/pillTabs"
import { TeamHoverCard } from "~/components/shared/teamHoverCard"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { cn } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
  head: () => ({ meta: [{ title: "Tabelle" }] }),
})

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

function StandingsPage() {
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()
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
                    setSelectedDivisionIdx(0)
                    setSelectedRoundId(undefined)
                  }}
                />
              ) : (
                <InlineSelect
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={(v) => {
                    setSelectedSeasonId(v)
                    setSelectedDivisionIdx(0)
                    setSelectedRoundId(undefined)
                  }}
                  icon={<Calendar className="h-3.5 w-3.5 text-league-text/40" />}
                />
              )}
            </FilterBarGroup>
          )}

          {structure && structure.length > 1 && (
            <FilterBarGroup label="Gruppe">
              <PillTabs
                items={structure.map((div, i) => ({ id: String(i), label: div.name }))}
                value={String(selectedDivisionIdx)}
                onChange={(v) => {
                  setSelectedDivisionIdx(Number(v))
                  setSelectedRoundId(undefined)
                }}
              />
            </FilterBarGroup>
          )}

          {selectedDivision && selectedDivision.rounds.length > 1 && (
            <FilterBarGroup label="Runde">
              {selectedDivision.rounds.length <= 6 ? (
                <PillTabs
                  size="sm"
                  items={selectedDivision.rounds.map((r) => ({ id: r.id, label: r.name }))}
                  value={activeRoundId!}
                  onChange={setSelectedRoundId}
                />
              ) : (
                <InlineSelect
                  items={selectedDivision.rounds.map((r) => ({ id: r.id, label: r.name }))}
                  value={activeRoundId!}
                  onChange={setSelectedRoundId}
                />
              )}
            </FilterBarGroup>
          )}
        </FilterBar>

        {/* Table */}
        {isLoading ? (
          <StandingsTableSkeleton />
        ) : standings && standings.length > 0 ? (
          <div className="rounded-lg border border-league-text/10 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-league-text/[0.03] text-league-text/60 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <Th className="px-4 py-3 text-center w-12" title="Spiele">Sp</Th>
                  <Th className="px-4 py-3 text-center w-10" title="Siege">S</Th>
                  <Th className="px-4 py-3 text-center w-10" title="Unentschieden">U</Th>
                  <Th className="px-4 py-3 text-center w-10" title="Niederlagen">N</Th>
                  <Th className="px-4 py-3 text-center w-16" title="Tore (erzielt:kassiert)">Tore</Th>
                  <Th className="px-4 py-3 text-center w-12" title="Tordifferenz">Diff</Th>
                  <Th className="px-4 py-3 text-center w-12 font-bold" title="Punkte">Pkt</Th>
                  <Th className="px-4 py-3 text-center w-24" title="Letzte 5 Spiele">Form</Th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => {
                  const form = formMap.get(s.teamId) ?? []
                  return (
                    <tr key={s.id} className="border-t border-league-text/5 hover:bg-league-text/[0.02]">
                      <td className="px-4 py-3 text-league-text/50 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        {features.advancedStats ? (
                          <TeamHoverCard
                            name={s.team.name}
                            shortName={s.team.shortName}
                            logoUrl={s.team.logoUrl}
                            primaryColor={s.team.primaryColor}
                          >
                            <div className="flex items-center gap-2 cursor-pointer hover:text-league-primary transition-colors">
                              <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size="sm" />
                              <span className="font-medium">{s.team.name}</span>
                            </div>
                          </TeamHoverCard>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size="sm" />
                            <span className="font-medium">{s.team.name}</span>
                          </div>
                        )}
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
                              title={f.result === "W" ? "Sieg" : f.result === "D" ? "Unentschieden" : "Niederlage"}
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
