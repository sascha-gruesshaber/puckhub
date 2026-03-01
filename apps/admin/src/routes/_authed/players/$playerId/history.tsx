import { Badge, Card, CardContent, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Calendar, ScrollText, Trophy, Users } from "lucide-react"
import { useCallback, useMemo } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { FilterBar } from "~/components/filterBar"
import { FilterDropdown } from "~/components/filterDropdown"
import { CareerStatsSummary } from "~/components/playerHistory/careerStatsSummary"
import { PlayerSeasonStatsTable } from "~/components/playerHistory/playerSeasonStatsTable"
import { SeasonProgressionCharts } from "~/components/playerHistory/seasonProgressionChart"
import type { TimelineFilterValue } from "~/components/playerHistory/timelineFilters"
import type { Contract, Suspension } from "~/components/playerTimeline/playerTimeline"
import { PlayerTimeline, TimelineSkeleton } from "~/components/playerTimeline/playerTimeline"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/players/$playerId/history")({
  validateSearch: (s: Record<string, unknown>): { filter?: string } => ({
    ...(typeof s.filter === "string" && s.filter ? { filter: s.filter } : {}),
  }),
  loader: async ({ context, params }) => {
    await context.trpcQueryUtils?.player.getById.ensureData({ id: params.playerId })
  },
  component: PlayerHistoryPage,
})

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function PlayerHistoryPage() {
  usePermissionGuard("players")
  const { t } = useTranslation("common")
  const { playerId } = Route.useParams()
  const { filter } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const activeFilter = (filter ?? "all") as TimelineFilterValue
  const filterValue = useMemo(() => (filter ? [filter] : []), [filter])
  const setFilter = useCallback(
    (v: string[]) =>
      navigate({ search: (prev) => ({ ...prev, filter: v[0] || undefined }), replace: true }),
    [navigate],
  )

  // Parallel queries
  const { data: player, isLoading: playerLoading } = trpc.player.getById.useQuery({ id: playerId })
  const { data: rawContracts, isLoading: contractsLoading } = trpc.contract.getByPlayer.useQuery({ playerId })
  const { data: playerCareerStats, isLoading: playerStatsLoading } = trpc.stats.playerCareerStats.useQuery({ playerId })
  const { data: goalieCareerStats, isLoading: goalieStatsLoading } = trpc.stats.goalieCareerStats.useQuery({ playerId })
  const { data: rawSuspensions, isLoading: suspensionsLoading } = trpc.stats.playerSuspensions.useQuery({ playerId })

  const headerLoading = playerLoading || contractsLoading
  const statsLoading = playerStatsLoading || goalieStatsLoading
  const timelineLoading = contractsLoading || suspensionsLoading

  const contracts = rawContracts as Contract[] | undefined
  const suspensions = rawSuspensions as Suspension[] | undefined

  // Determine player type from most recent contract position
  const isGoalie = useMemo(() => {
    if (!contracts || contracts.length === 0) return false
    const sorted = [...contracts].sort(
      (a, b) => new Date(b.startSeason.seasonStart).getTime() - new Date(a.startSeason.seasonStart).getTime(),
    )
    return sorted[0]!.position === "goalie"
  }, [contracts])

  // Career summary stats (contract-based badges)
  const stats = useMemo(() => {
    if (!contracts || contracts.length === 0) return null
    const teamIds = new Set(contracts.map((c) => c.teamId))
    const years = contracts.map((c) => new Date(c.startSeason.seasonStart).getUTCFullYear())
    const careerStart = Math.min(...years)
    return { contractCount: contracts.length, teamCount: teamIds.size, careerStart }
  }, [contracts])

  // Compute age
  const age = useMemo(() => {
    if (!player?.dateOfBirth) return null
    const dob = new Date(player.dateOfBirth)
    const today = new Date()
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    return a
  }, [player?.dateOfBirth])

  // Not found
  if (!headerLoading && !player) {
    return (
      <div className="space-y-6">
        <Link
          to="/players"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("playersPage.history.backToPlayers")}
        </Link>
        <EmptyState
          icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("playersPage.history.notFoundTitle")}
          description={t("playersPage.history.notFoundDescription")}
        />
      </div>
    )
  }

  const initials = player ? `${player.firstName[0] || ""}${player.lastName[0] || ""}`.toUpperCase() : ""

  const hasPlayerStats = (playerCareerStats?.length ?? 0) > 0
  const hasGoalieStats = (goalieCareerStats?.length ?? 0) > 0
  const hasAnyStats = hasPlayerStats || hasGoalieStats

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/players"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("playersPage.history.backToPlayers")}
      </Link>

      {/* Profile header card */}
      {headerLoading ? (
        <ProfileSkeleton />
      ) : player ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold truncate">
                  {player.firstName} {player.lastName}
                </h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {age !== null && <span>{t("playersPage.history.ageYears", { age })}</span>}
                  {age !== null && player.nationality && <span>&middot;</span>}
                  {player.nationality && <span>{player.nationality}</span>}
                  {(age !== null || player.nationality) && player.dateOfBirth && <span>&middot;</span>}
                  {player.dateOfBirth && (
                    <span>
                      {new Date(player.dateOfBirth).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {stats && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ScrollText className="h-3 w-3" />
                      {t("playersPage.history.contractCount", { count: stats.contractCount })}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Trophy className="h-3 w-3" />
                      {t("playersPage.history.teamCount", { count: stats.teamCount })}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("playersPage.history.sinceYear", { year: stats.careerStart })}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Career Stats Summary */}
      {statsLoading ? (
        <StatsSkeleton isGoalie={isGoalie} />
      ) : hasAnyStats ? (
        <CareerStatsSummary
          isGoalie={isGoalie}
          playerStats={playerCareerStats}
          goalieStats={goalieCareerStats}
          isLoading={false}
        />
      ) : null}

      {/* Season Stats Table + Charts */}
      {statsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : hasAnyStats ? (
        <>
          <PlayerSeasonStatsTable
            isGoalie={isGoalie}
            playerStats={playerCareerStats}
            goalieStats={goalieCareerStats}
            isLoading={false}
          />
          <SeasonProgressionCharts
            isGoalie={isGoalie}
            playerStats={playerCareerStats}
            goalieStats={goalieCareerStats}
          />
        </>
      ) : !headerLoading ? (
        <EmptyState
          icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("playersPage.history.noStatsTitle")}
          description={t("playersPage.history.noStatsDescription")}
        />
      ) : null}

      {/* Timeline Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("playersPage.history.timeline")}</h2>
        <div className="space-y-4">
          <FilterBar label={t("statsPage.filters.label")}>
            <FilterDropdown
              label={t("playersPage.history.filterAll")}
              options={[
                { value: "signed", label: t("playersPage.history.filterSigned") },
                { value: "transfer", label: t("playersPage.history.filterTransfer") },
                { value: "position-change", label: t("playersPage.history.filterPositionChange") },
                { value: "suspension", label: t("playersPage.history.filterSuspensions") },
              ]}
              value={filterValue}
              onChange={setFilter}
              singleSelect
            />
          </FilterBar>
          {timelineLoading ? (
            <TimelineSkeleton />
          ) : contracts && contracts.length > 0 ? (
            <PlayerTimeline
              contracts={contracts}
              suspensions={suspensions}
              activeFilter={activeFilter}
            />
          ) : (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={t("playersPage.history.noContractsTitle")}
              description={t("playersPage.history.noContractsDescription")}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsSkeleton({ isGoalie }: { isGoalie: boolean }) {
  const count = isGoalie ? 3 : 5
  return (
    <div>
      <Skeleton className="h-6 w-40 rounded mb-3" />
      <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 ${!isGoalie ? "lg:grid-cols-5" : ""}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
