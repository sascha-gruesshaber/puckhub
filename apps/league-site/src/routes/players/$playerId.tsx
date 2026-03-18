import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router"
import { ArrowLeft, Calendar, User, Users } from "lucide-react"
import { lazy, Suspense, useEffect, useMemo } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { CareerStatsSummary } from "~/components/stats/careerStatsSummary"
import type { Contract, Suspension } from "~/components/stats/playerCareerTimeline"
import { PlayerCareerBar } from "~/components/stats/playerCareerTimeline"
import { PlayerSeasonStatsTable } from "~/components/stats/playerSeasonStatsTable"
import { useFeatures, useOrg } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { slugify } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

const SeasonProgressionCharts = lazy(() =>
  import("~/components/charts/seasonProgressionCharts").then((m) => ({ default: m.SeasonProgressionCharts })),
)

export const playerSearchValidator = (s: Record<string, unknown>): { from?: string } => ({
  ...(typeof s.from === "string" && s.from ? { from: s.from } : {}),
})

export const Route = createFileRoute("/players/$playerId")({
  component: PlayerHistoryPage,
  head: () => ({ meta: [{ title: "Spieler" }] }),
  validateSearch: playerSearchValidator,
})

function BackLink({ from }: { from?: string }) {
  const t = useT()
  if (from) {
    return (
      <a
        href={from}
        className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </a>
    )
  }
  return (
    <Link
      to="/stats/scorers"
      className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6"
    >
      <ArrowLeft className="h-4 w-4" />
      {t.playerDetail.backToStats}
    </Link>
  )
}

function calcAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null
  const date = dob instanceof Date ? dob : new Date(dob)
  const today = new Date()
  let a = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) a--
  return a
}

function formatDate(dob: Date | string | null | undefined): string {
  if (!dob) return ""
  const date = dob instanceof Date ? dob : new Date(dob)
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function PlayerHistoryPage() {
  const t = useT()
  const { playerId } = useParams({ strict: false }) as { playerId: string }
  const { from } = useSearch({ strict: false }) as { from?: string }
  const org = useOrg()
  const features = useFeatures()

  const enabled = features.advancedStats
  const { data: player, isLoading: playerLoading } = trpc.publicSite.getPlayerById.useQuery(
    { organizationId: org.id, playerId },
    { enabled },
  )
  const { data: rawContracts, isLoading: contractsLoading } = trpc.publicSite.getPlayerContracts.useQuery(
    { organizationId: org.id, playerId },
    { enabled },
  )
  const { data: playerCareerStats, isLoading: playerStatsLoading } = trpc.publicSite.getPlayerCareerStats.useQuery(
    { organizationId: org.id, playerId },
    { enabled },
  )
  const { data: goalieCareerStats, isLoading: goalieStatsLoading } = trpc.publicSite.getGoalieCareerStats.useQuery(
    { organizationId: org.id, playerId },
    { enabled },
  )
  const { data: rawSuspensions } = trpc.publicSite.getPlayerSuspensions.useQuery(
    { organizationId: org.id, playerId },
    { enabled },
  )

  useEffect(() => {
    if (player) {
      const slug = slugify(`${player.firstName} ${player.lastName}`)
      const basePath = window.location.pathname.startsWith("/spieler/")
        ? `/spieler/${playerId}/${slug}`
        : `/players/${playerId}/${slug}`
      if (window.location.pathname !== basePath) {
        window.history.replaceState(null, "", basePath + window.location.search)
      }
    }
  }, [player, playerId])

  const headerLoading = playerLoading || contractsLoading
  const statsLoading = playerStatsLoading || goalieStatsLoading

  const contracts = rawContracts as Contract[] | undefined
  const _suspensions = rawSuspensions as Suspension[] | undefined

  const isGoalie = useMemo(() => {
    if (!contracts || contracts.length === 0) return false
    const sorted = [...contracts].sort(
      (a, b) => new Date(b.startSeason.seasonStart).getTime() - new Date(a.startSeason.seasonStart).getTime(),
    )
    return sorted[0]!.position === "goalie"
  }, [contracts])

  // Current active contract (most recent without end)
  const activeContract = useMemo(() => {
    if (!contracts) return null
    const active = contracts.filter((c) => !c.endSeason)
    if (active.length === 0) return null
    return active.sort(
      (a, b) => new Date(b.startSeason.seasonStart).getTime() - new Date(a.startSeason.seasonStart).getTime(),
    )[0]!
  }, [contracts])

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
  const age = calcAge(player.dateOfBirth)
  const _initials = `${player.firstName[0] || ""}${player.lastName[0] || ""}`.toUpperCase()

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <BackLink from={from} />

        {/* ── Player Header ── */}
        <div className="bg-league-surface rounded-xl border border-league-text/10 p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-5">
            {/* Photo */}
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl bg-league-text/[0.06] overflow-hidden">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={`${player.firstName} ${player.lastName}`}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <User className="h-10 w-10 text-league-text/25" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                {player.firstName} <span>{player.lastName}</span>
              </h1>

              {/* Current team / position */}
              {activeContract && (
                <div className="flex items-center gap-2 mt-2">
                  <TeamLogo name={activeContract.team.name} logoUrl={activeContract.team.logoUrl} size="sm" />
                  <span className="text-sm font-medium">{activeContract.team.name}</span>
                  <span className="text-league-text/30">·</span>
                  <span className="text-sm text-league-text/60">
                    {t.positions[activeContract.position as keyof typeof t.positions] ?? activeContract.position}
                  </span>
                  {activeContract.jerseyNumber != null && (
                    <span className="text-sm font-mono font-bold text-league-primary">
                      #{activeContract.jerseyNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Meta: age, nationality, DOB */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-league-text/50">
                {age !== null && (
                  <span>
                    {age} {t.playerDetail.years}
                  </span>
                )}
                {player.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(player.dateOfBirth)}
                  </span>
                )}
                {player.nationality && (
                  <span className="inline-block bg-league-text/[0.06] text-xs font-medium rounded px-1.5 py-0.5">
                    {player.nationality}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Career Stats Summary */}
          {!statsLoading && hasAnyStats && (
            <CareerStatsSummary isGoalie={isGoalie} playerStats={playerCareerStats} goalieStats={goalieCareerStats} />
          )}

          {/* Career bar */}
          {contracts && contracts.length > 0 && <PlayerCareerBar contracts={contracts} />}

          {/* Season stats table */}
          {!statsLoading && hasAnyStats && (
            <PlayerSeasonStatsTable
              isGoalie={isGoalie}
              playerStats={playerCareerStats}
              goalieStats={goalieCareerStats}
            />
          )}

          {/* Progression Charts */}
          {!statsLoading && hasAnyStats && (
            <Suspense fallback={<div className="h-64 rounded-lg bg-league-text/5 animate-pulse" />}>
              <SeasonProgressionCharts
                isGoalie={isGoalie}
                playerStats={playerCareerStats}
                goalieStats={goalieCareerStats}
              />
            </Suspense>
          )}

          {/* No stats at all */}
          {!statsLoading && !hasAnyStats && !headerLoading && (!contracts || contracts.length === 0) && (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={t.playerDetail.noStats}
              description={t.playerDetail.noStatsDesc}
            />
          )}
        </div>
      </SectionWrapper>
    </div>
  )
}
