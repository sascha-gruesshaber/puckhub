import { Button, Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { RefreshCw, Trophy } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { PageHeader } from "~/components/pageHeader"
import { roundTypeIcons } from "~/components/structureBuilder/utils/roundTypeIcons"
import { TabNavigation } from "~/components/tabNavigation"
import type { TabGroup } from "~/components/tabNavigation"
import { BonusPointsSection } from "~/components/standings/bonusPointsSection"
import { StandingsTable } from "~/components/standings/standingsTable"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/standings")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({
    ...(typeof s.tab === "string" && s.tab ? { tab: s.tab } : {}),
  }),
  component: StandingsPage,
})

function StandingsPage() {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()
  const navigate = useNavigate({ from: Route.fullPath })
  const { tab: tabParam } = Route.useSearch()
  const utils = trpc.useUtils()

  const seasonId = season?.id ?? ""
  const enabled = !!seasonId

  // Queries
  const { data: roundInfo, isLoading: roundInfoLoading } = trpc.stats.seasonRoundInfo.useQuery(
    { seasonId },
    { enabled },
  )

  const { data: teams } = trpc.team.list.useQuery(undefined, { enabled })

  // Build a flat lookup of all valid tab IDs → roundId
  const allRoundTabs = useMemo(() => {
    if (!roundInfo) return new Map<string, { divisionId: string; roundId: string }>()
    const m = new Map<string, { divisionId: string; roundId: string }>()
    for (const div of roundInfo) {
      for (const r of div.rounds) {
        m.set(`${div.id}::${r.id}`, { divisionId: div.id, roundId: r.id })
      }
    }
    return m
  }, [roundInfo])

  // Derive the default tab (first division's first round)
  const defaultTab = useMemo(() => {
    if (!roundInfo || roundInfo.length === 0) return ""
    const firstDiv = roundInfo[0]!
    const firstRound = firstDiv.rounds[0]
    return firstRound ? `${firstDiv.id}::${firstRound.id}` : ""
  }, [roundInfo])

  // Active tab: use URL param if valid, otherwise default
  const activeTab = useMemo(() => {
    if (tabParam && allRoundTabs.has(tabParam)) return tabParam
    return defaultTab
  }, [tabParam, allRoundTabs, defaultTab])

  // Derived IDs for queries and mutations
  const activeDivisionId = allRoundTabs.get(activeTab)?.divisionId ?? ""
  const activeRoundId = allRoundTabs.get(activeTab)?.roundId ?? ""

  const setTab = useCallback(
    (tab: string) => navigate({ search: { tab }, replace: true }),
    [navigate],
  )

  // Clear stale search params when season changes
  const prevSeasonIdRef = useRef(seasonId)
  useEffect(() => {
    if (seasonId && seasonId !== prevSeasonIdRef.current) {
      prevSeasonIdRef.current = seasonId
      navigate({ search: {}, replace: true })
    }
  }, [seasonId, navigate])

  // Auto-select default tab once roundInfo loads and nothing valid is selected
  useEffect(() => {
    if (!roundInfo || roundInfo.length === 0) return
    if (!tabParam || !allRoundTabs.has(tabParam)) {
      if (defaultTab) navigate({ search: { tab: defaultTab }, replace: true })
    }
  }, [roundInfo, tabParam, allRoundTabs, defaultTab, navigate])

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

  // Division + round tabs
  const standingsTabGroups: TabGroup<string>[] = useMemo(() => {
    if (!roundInfo || roundInfo.length === 0) return []
    // Only one division with one round → no tabs needed
    if (roundInfo.length === 1 && roundInfo[0]!.rounds.length <= 1) return []

    const showLabels = roundInfo.length > 1
    return roundInfo.map((div) => ({
      key: div.id,
      label: showLabels ? div.name : undefined,
      tabs: div.rounds.map((r) => ({
        id: `${div.id}::${r.id}`,
        label: r.name,
        icon: roundTypeIcons[r.roundType as keyof typeof roundTypeIcons],
      })),
    }))
  }, [roundInfo])

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

      {/* Division + round tabs */}
      {roundInfoLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : standingsTabGroups.length > 0 ? (
        <TabNavigation groups={standingsTabGroups} activeTab={activeTab} onTabChange={setTab} />
      ) : null}

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
