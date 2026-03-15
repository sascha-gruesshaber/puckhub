import { createFileRoute, Link, useSearch } from "@tanstack/react-router"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { ArrowRight, Calendar, ChevronRight, Users } from "lucide-react"
import { Fragment } from "react"
import { EmptyState } from "~/components/shared/emptyState"
import { Skeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { StatsPageShell } from "~/components/stats/statsPageShell"
import { useOrg, useSeason } from "~/lib/context"
import { useT, type Translations } from "~/lib/i18n"
import { cn } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

export const structureSearchValidator = (s: Record<string, unknown>): { season?: string } => ({
  ...(typeof s.season === "string" && s.season ? { season: s.season } : {}),
})

export const Route = createFileRoute("/structure")({
  component: StructurePage,
  head: () => ({ meta: [{ title: "Saisonstruktur" }] }),
  validateSearch: structureSearchValidator,
})

// ---------------------------------------------------------------------------
// Round type colors (same palette as admin roundTypeColors)
// ---------------------------------------------------------------------------

const ROUND_TYPE_COLORS: Record<string, string> = {
  regular: "#60A5FA",
  preround: "#9CA3AF",
  playoffs: "#F87171",
  playdowns: "#FBBF24",
  playups: "#34D399",
  relegation: "#A78BFA",
  placement: "#2DD4BF",
  final: "#F4D35E",
}

// ---------------------------------------------------------------------------
// Season Banner
// ---------------------------------------------------------------------------

function SeasonBanner({ seasonName }: { seasonName: string }) {
  return (
    <div className="relative mb-10 rounded-2xl overflow-hidden bg-league-primary">
      {/* Diagonal stripe pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,1) 6px, rgba(255,255,255,1) 12px)",
        }}
      />
      {/* Gradient fade to the right */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10" />

      <div className="relative flex items-center gap-4 px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-white/60 text-xs font-semibold uppercase tracking-[0.15em]">Season</span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{seasonName}</h3>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Round Node (timeline step)
// ---------------------------------------------------------------------------

function RoundNode({
  name,
  roundType,
  divisionIndex,
  roundId,
  gameCount,
  t,
}: {
  name: string
  roundType: string
  divisionIndex: number
  roundId: string
  gameCount: number
  t: Translations
}) {
  const color = ROUND_TYPE_COLORS[roundType] ?? "#9CA3AF"
  const typeLabel = (t.structure.roundTypes as Record<string, string>)[roundType] ?? roundType

  return (
    <Link
      to="/standings"
      search={{ division: divisionIndex === 0 ? undefined : String(divisionIndex), round: roundId }}
      className="group/node flex flex-col items-center gap-2 min-w-[90px] py-2 transition-transform duration-200 hover:-translate-y-0.5"
    >
      {/* Colored circle with game count */}
      <div className="relative">
        <div
          className="h-10 w-10 rounded-full shadow-lg ring-[3px] ring-league-surface transition-transform duration-200 group-hover/node:scale-110 flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <span className="text-xs font-bold text-white">{gameCount}</span>
        </div>
        {/* Glow on hover */}
        <div
          className="absolute -inset-1 rounded-full opacity-0 group-hover/node:opacity-25 blur-sm transition-opacity duration-300"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold text-league-text text-center leading-tight">{name}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-league-text/35 text-center">{typeLabel}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Team Card
// ---------------------------------------------------------------------------

function TeamCard({ team }: { team: TeamInfo }) {
  return (
    <Link
      to="/teams/$teamId"
      params={{ teamId: team.id }}
      className={cn(
        "group/team flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-league-bg border border-league-text/6",
        "transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1 hover:border-league-primary/25",
      )}
    >
      <div className="shrink-0">
        <TeamLogo name={team.name} logoUrl={team.logoUrl} size="md" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-league-text block truncate">{team.name}</span>
        <span className="text-xs text-league-text/35">{team.shortName}</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-league-text/15 group-hover/team:text-league-primary shrink-0 transition-colors duration-300" />
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Division Showcase Card
// ---------------------------------------------------------------------------

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
  primaryColor: string | null
}

interface DivisionData {
  id: string
  name: string
  rounds: { id: string; name: string; roundType: string; sortOrder: number; _count: { games: number } }[]
  teamDivisions: { team: TeamInfo }[]
}

function DivisionCard({
  division,
  divisionIndex,
  animDelay,
  t,
}: {
  division: DivisionData
  divisionIndex: number
  animDelay: number
  t: Translations
}) {
  const teams = division.teamDivisions.map((td) => td.team)

  return (
    <div
      className="animate-fade-in rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {/* ---- Gradient Header ---- */}
      <div className="relative bg-league-primary overflow-hidden">
        {/* Diagonal stripe decoration */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,1) 6px, rgba(255,255,255,1) 12px)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />

        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-extrabold text-white tracking-tight">{division.name}</h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white/80">
              <Users className="h-3 w-3" />
              {teams.length} {t.structure.teams}
            </span>
          </div>
          <Link
            to="/standings"
            search={{ division: divisionIndex === 0 ? undefined : String(divisionIndex) }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white transition-colors"
          >
            {t.structure.viewStandings}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ---- Card Body ---- */}
      <div className="bg-league-surface border border-t-0 border-league-text/6 rounded-b-2xl">
        {/* Rounds — timeline visualization */}
        {division.rounds.length > 0 && (
          <div className="px-6 pt-6 pb-2">
            <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-league-text/30 mb-4">
              <span className="h-px flex-1 max-w-[20px] bg-league-text/10" />
              {t.structure.rounds}
              <span className="h-px flex-1 bg-league-text/10" />
            </h4>
            <div className="flex flex-wrap items-start justify-center gap-x-1 gap-y-4">
              {division.rounds.map((round, i) => (
                <Fragment key={round.id}>
                  {i > 0 && (
                    <div className="flex items-center self-start mt-4 text-league-text/15">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                  <RoundNode
                    name={round.name}
                    roundType={round.roundType}
                    divisionIndex={divisionIndex}
                    roundId={round.id}
                    gameCount={round._count.games}
                    t={t}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {division.rounds.length > 0 && teams.length > 0 && (
          <div className="mx-6 my-2 h-px bg-league-text/5" />
        )}

        {/* Teams grid */}
        {teams.length > 0 && (
          <div className="px-6 pt-3 pb-6">
            <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-league-text/30 mb-4">
              <span className="h-px flex-1 max-w-[20px] bg-league-text/10" />
              {t.structure.teams}
              <span className="h-px flex-1 bg-league-text/10" />
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StructureSkeleton() {
  return (
    <div className="space-y-8">
      {/* Season banner skeleton */}
      <Skeleton className="h-[76px] w-full rounded-2xl" />

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden">
          {/* Header skeleton */}
          <div className="bg-league-primary/20 px-6 py-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          {/* Body skeleton */}
          <div className="bg-league-surface border border-t-0 border-league-text/6 rounded-b-2xl p-6 space-y-6">
            <div>
              <Skeleton className="h-3 w-20 mb-4 mx-auto" />
              <div className="flex justify-center gap-6">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex flex-col items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-league-text/5" />
            <div>
              <Skeleton className="h-3 w-20 mb-4 mx-auto" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-[56px] rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function StructurePage() {
  const org = useOrg()
  const season = useSeason()
  const t = useT()
  const filterNavigate = useFilterNavigate()
  const { season: seasonParam } = useSearch({ strict: false }) as { season?: string }

  const selectedSeasonId = seasonParam ?? season.current?.id

  const setSelectedSeasonId = (v: string) =>
    filterNavigate({
      search: (prev: any) => ({ ...prev, season: v === season.current?.id ? undefined : v }),
    })

  const { data: structure, isLoading } = trpc.publicSite.getSeasonStructure.useQuery(
    { organizationId: org.id, seasonId: selectedSeasonId! },
    { enabled: !!selectedSeasonId, staleTime: 300_000 },
  )

  const currentSeason = season.all.find((s) => s.id === selectedSeasonId)

  return (
    <StatsPageShell
      title={t.structure.title}
      selectedSeasonId={selectedSeasonId}
      onSeasonChange={setSelectedSeasonId}
    >
      {isLoading ? (
        <StructureSkeleton />
      ) : structure && structure.length > 0 ? (
        <div className="space-y-8">
          {currentSeason && <SeasonBanner seasonName={currentSeason.name} />}

          {structure.map((division, i) => (
            <DivisionCard
              key={division.id}
              division={division as DivisionData}
              divisionIndex={i}
              animDelay={i * 120}
              t={t}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={t.structure.noData} description={t.structure.noDataDesc} />
      )}
    </StatsPageShell>
  )
}
