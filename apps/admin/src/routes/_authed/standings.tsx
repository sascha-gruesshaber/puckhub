import { Button, Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { RefreshCw, Trophy } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { PageHeader } from "~/components/pageHeader"
import { BonusPointsSection } from "~/components/standings/bonusPointsSection"
import { StandingsTable } from "~/components/standings/standingsTable"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/standings")({
  validateSearch: (s: Record<string, unknown>): { division?: string; round?: string } => ({
    ...(typeof s.division === "string" && s.division ? { division: s.division } : {}),
    ...(typeof s.round === "string" && s.round ? { round: s.round } : {}),
  }),
  component: StandingsPage,
})

function StandingsPage() {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()
  const navigate = useNavigate({ from: Route.fullPath })
  const { division: selectedDivisionId, round: selectedRoundId } = Route.useSearch()
  const utils = trpc.useUtils()

  const seasonId = season?.id ?? ""
  const enabled = !!seasonId

  // Queries
  const { data: roundInfo, isLoading: roundInfoLoading } = trpc.stats.seasonRoundInfo.useQuery(
    { seasonId },
    { enabled },
  )

  const { data: teams } = trpc.team.list.useQuery(undefined, { enabled })

  // Auto-select first division
  const activeDivisionId = useMemo(() => {
    if (selectedDivisionId) return selectedDivisionId
    return roundInfo?.[0]?.id ?? ""
  }, [selectedDivisionId, roundInfo])

  // Rounds for selected division
  const divisionRounds = useMemo(() => {
    if (!roundInfo || !activeDivisionId) return []
    const div = roundInfo.find((d) => d.id === activeDivisionId)
    return div?.rounds ?? []
  }, [roundInfo, activeDivisionId])

  // Auto-select first round
  const activeRoundId = useMemo(() => {
    if (selectedRoundId && divisionRounds.some((r) => r.id === selectedRoundId)) return selectedRoundId
    return divisionRounds[0]?.id ?? ""
  }, [selectedRoundId, divisionRounds])

  // Clear stale search params when season changes
  const prevSeasonIdRef = useRef(seasonId)
  useEffect(() => {
    if (seasonId && seasonId !== prevSeasonIdRef.current) {
      prevSeasonIdRef.current = seasonId
      navigate({ search: {}, replace: true })
    }
  }, [seasonId, navigate])

  // Auto-select first division+round once roundInfo loads and nothing is selected
  useEffect(() => {
    if (!roundInfo || roundInfo.length === 0) return
    // If the selected division doesn't belong to this season's data, reset
    const divisionValid = selectedDivisionId && roundInfo.some((d) => d.id === selectedDivisionId)
    if (!divisionValid) {
      const firstDiv = roundInfo[0]!
      const firstRound = firstDiv.rounds[0]
      navigate({
        search: { division: firstDiv.id, round: firstRound?.id },
        replace: true,
      })
    }
  }, [roundInfo, selectedDivisionId, navigate])

  const setDivision = useCallback(
    (divId: string) => {
      const div = roundInfo?.find((d) => d.id === divId)
      const firstRound = div?.rounds[0]
      navigate({
        search: { division: divId, round: firstRound?.id },
        replace: true,
      })
    },
    [navigate, roundInfo],
  )

  const setRound = useCallback(
    (roundId: string) => navigate({ search: (prev) => ({ ...prev, round: roundId }), replace: true }),
    [navigate],
  )

  // Standings + form queries
  const { data: standings, isLoading: standingsLoading } = trpc.standings.getByRound.useQuery(
    { roundId: activeRoundId },
    { enabled: !!activeRoundId },
  )

  const { data: teamForm } = trpc.standings.teamForm.useQuery({ roundId: activeRoundId }, { enabled: !!activeRoundId })

  // Recalculate mutations
  const recalculateRound = trpc.standings.recalculate.useMutation({
    onSuccess: () => {
      utils.standings.getByRound.invalidate({ roundId: activeRoundId })
      utils.standings.teamForm.invalidate({ roundId: activeRoundId })
      utils.bonusPoints.listByRound.invalidate({ roundId: activeRoundId })
      toast.success(t("standingsPage.recalculate.success"))
    },
  })

  const recalculateAll = trpc.standings.recalculateAll.useMutation({
    onSuccess: () => {
      utils.standings.invalidate()
      toast.success(t("standingsPage.recalculate.allSuccess"))
    },
  })

  const isRecalculating = recalculateRound.isPending || recalculateAll.isPending

  // Team info for components
  const teamsForComponents = useMemo(() => {
    if (!teams) return []
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      city: t.city,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
    }))
  }, [teams])

  // No season
  if (!season) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("standingsPage.title")} />
        <EmptyState
          icon={<Trophy className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("standingsPage.title")}
          description={t("standingsPage.noSeason")}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("standingsPage.title")}
        description={season.name}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeRoundId && recalculateRound.mutate({ roundId: activeRoundId })}
              disabled={isRecalculating || !activeRoundId}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRecalculating ? "animate-spin" : ""}`} />
              {t("standingsPage.recalculate.round")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeDivisionId && recalculateAll.mutate({ divisionId: activeDivisionId })}
              disabled={isRecalculating || !activeDivisionId}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${recalculateAll.isPending ? "animate-spin" : ""}`} />
              {t("standingsPage.recalculate.allRounds")}
            </Button>
          </div>
        }
      />

      {/* Division pills */}
      {roundInfoLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : roundInfo && roundInfo.length > 1 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {roundInfo.map((div) => (
            <FilterPill
              key={div.id}
              label={div.name}
              active={div.id === activeDivisionId}
              onClick={() => setDivision(div.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Round pills */}
      {divisionRounds.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {divisionRounds.map((r) => (
            <FilterPill key={r.id} label={r.name} active={r.id === activeRoundId} onClick={() => setRound(r.id)} />
          ))}
        </div>
      )}

      {/* Loading */}
      {standingsLoading && (
        <div className="space-y-4">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}

      {/* Standings table */}
      {!standingsLoading && standings && standings.length > 0 && (
        <StandingsTable standings={standings as any} teams={teamsForComponents} teamForm={teamForm} />
      )}

      {/* Empty state */}
      {!standingsLoading && activeRoundId && (!standings || standings.length === 0) && (
        <EmptyState
          icon={<Trophy className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("standingsPage.noData")}
          description={t("standingsPage.noDataDescription")}
        />
      )}

      {/* Bonus points management */}
      {activeRoundId && <BonusPointsSection roundId={activeRoundId} teams={teamsForComponents} />}
    </div>
  )
}
