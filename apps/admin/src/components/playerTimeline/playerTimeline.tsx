import { Badge, Card, CardContent, Skeleton } from "@puckhub/ui"
import { ArrowRightLeft, FileSignature, RefreshCw, ShieldAlert, Zap } from "lucide-react"
import { useMemo } from "react"
import "./timeline.css"
import type { TimelineFilterValue } from "~/components/playerHistory/timelineFilters"
import { useTranslation } from "~/i18n/use-translation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Season {
  id: string
  name: string
  seasonStart: Date | string
  seasonEnd: Date | string
}

interface Team {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

export interface Contract {
  id: string
  playerId: string
  teamId: string
  position: string
  jerseyNumber: number | null
  startSeasonId: string
  endSeasonId: string | null
  createdAt: Date
  team: Team
  startSeason: Season
  endSeason: Season | null
}

export interface Suspension {
  id: string
  suspensionType: string
  suspendedGames: number
  servedGames: number
  reason: string | null
  createdAt: Date | string
  game: {
    id: string
    scheduledAt: Date | string | null
    homeTeam: { id: string; shortName: string; logoUrl: string | null }
    awayTeam: { id: string; shortName: string; logoUrl: string | null }
    round: {
      name: string
      division: {
        name: string
        season: { name: string }
      }
    }
  }
  gameEvent: {
    penaltyType: { name: string; shortName: string } | null
  } | null
  team: { id: string; shortName: string; logoUrl: string | null }
}

export type EventType = "signed" | "transfer" | "position-change" | "active" | "suspension"

interface TimelineEntry {
  id: string
  eventType: EventType
  sortDate: number
  contract?: Contract
  suspension?: Suspension
}

// ---------------------------------------------------------------------------
// Classification helper
// ---------------------------------------------------------------------------

function classifyContracts(contracts: Contract[]): TimelineEntry[] {
  const sorted = [...contracts].sort((a, b) => {
    const startDiff = new Date(a.startSeason.seasonStart).getTime() - new Date(b.startSeason.seasonStart).getTime()
    if (startDiff !== 0) return startDiff
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return sorted.map((contract, i) => {
    let eventType: EventType

    if (!contract.endSeasonId) {
      eventType = "active"
    } else if (i === 0) {
      eventType = "signed"
    } else {
      const prev = sorted[i - 1]!
      if (contract.teamId !== prev.teamId) {
        eventType = "transfer"
      } else if (contract.position !== prev.position) {
        eventType = "position-change"
      } else {
        eventType = "signed"
      }
    }

    return {
      id: contract.id,
      eventType,
      sortDate: new Date(contract.startSeason.seasonStart).getTime(),
      contract,
    }
  })
}

function mergeSuspensions(entries: TimelineEntry[], suspensions: Suspension[]): TimelineEntry[] {
  const suspensionEntries: TimelineEntry[] = suspensions.map((s) => ({
    id: s.id,
    eventType: "suspension" as const,
    sortDate: new Date(s.createdAt).getTime(),
    suspension: s,
  }))

  return [...entries, ...suspensionEntries].sort((a, b) => a.sortDate - b.sortDate)
}

// ---------------------------------------------------------------------------
// TimelineIcon
// ---------------------------------------------------------------------------

function TimelineIcon({ eventType }: { eventType: EventType }) {
  const iconClass = "h-4 w-4"
  switch (eventType) {
    case "signed":
      return <FileSignature className={iconClass} />
    case "transfer":
      return <ArrowRightLeft className={iconClass} />
    case "position-change":
      return <RefreshCw className={iconClass} />
    case "active":
      return <Zap className={iconClass} />
    case "suspension":
      return <ShieldAlert className={iconClass} />
  }
}

// ---------------------------------------------------------------------------
// TimelineCard (contract)
// ---------------------------------------------------------------------------

const positionColors: Record<string, { bg: string; text: string }> = {
  goalie: { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa" },
  defense: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399" },
  forward: { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171" },
}

function ContractTimelineCard({ entry }: { entry: TimelineEntry }) {
  const { t } = useTranslation("common")
  const contract = entry.contract!
  const eventType = entry.eventType
  const colors = positionColors[contract.position] ?? { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" }
  const initials = contract.team.shortName.slice(0, 3).toUpperCase()

  const seasonRange = contract.endSeason
    ? `${contract.startSeason.name} – ${contract.endSeason.name}`
    : t("playersPage.timeline.sinceSeason", { season: contract.startSeason.name })

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 timeline-accent-bar--${contract.position}`} aria-hidden="true" />
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-muted-foreground">
            <TimelineIcon eventType={eventType} />
          </span>
          <Badge
            variant={eventType === "active" ? "default" : "outline"}
            className={
              eventType === "active"
                ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-xs"
                : "text-xs"
            }
          >
            {t(`playersPage.timeline.eventLabels.${eventType}`)}
          </Badge>
          {contract.jerseyNumber != null && (
            <span className="ml-auto text-sm font-mono font-bold text-muted-foreground">#{contract.jerseyNumber}</span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden bg-muted">
            {contract.team.logoUrl ? (
              <img src={contract.team.logoUrl} alt={contract.team.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{contract.team.name}</p>
            <p className="text-xs text-muted-foreground">{contract.team.shortName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ background: colors.bg, color: colors.text }}
          >
            {t(`playersPage.positions.${contract.position}`)}
          </span>
          <span className="text-xs text-muted-foreground">{seasonRange}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// SuspensionTimelineCard
// ---------------------------------------------------------------------------

function SuspensionTimelineCard({ suspension }: { suspension: Suspension }) {
  const { t } = useTranslation("common")
  const { game, gameEvent } = suspension

  const matchup = `${game.homeTeam.shortName} vs ${game.awayTeam.shortName}`
  const penaltyName = gameEvent?.penaltyType?.name ?? suspension.suspensionType

  return (
    <Card className="overflow-hidden">
      <div className="h-1 timeline-accent-bar--suspension" aria-hidden="true" />
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-500">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600">
            {t("playersPage.history.suspensionLabel")}
          </Badge>
          <Badge variant="secondary" className="text-xs ml-auto">
            {t("playersPage.history.suspensionGamesInfo", {
              served: suspension.servedGames,
              total: suspension.suspendedGames,
            })}
          </Badge>
        </div>

        {/* Game matchup */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <TeamLogo url={game.homeTeam.logoUrl} />
            <span className="text-sm font-medium">{matchup}</span>
            <TeamLogo url={game.awayTeam.logoUrl} />
          </div>
        </div>

        {/* Penalty + season info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600">
            {penaltyName}
          </span>
          <span className="text-xs text-muted-foreground">{game.round.division.season.name}</span>
          {suspension.reason && (
            <span className="text-xs text-muted-foreground">– {suspension.reason}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TeamLogo({ url }: { url: string | null }) {
  if (!url) return <div className="w-5 h-5 rounded-sm bg-muted shrink-0" />
  return <img src={url} alt="" className="w-5 h-5 rounded-sm object-contain shrink-0" />
}

// ---------------------------------------------------------------------------
// PlayerTimeline
// ---------------------------------------------------------------------------

function PlayerTimeline({
  contracts,
  suspensions,
  activeFilter = "all",
}: {
  contracts: Contract[]
  suspensions?: Suspension[]
  activeFilter?: TimelineFilterValue
}) {
  const allEntries = useMemo(() => {
    const contractEntries = classifyContracts(contracts)
    return suspensions ? mergeSuspensions(contractEntries, suspensions) : contractEntries
  }, [contracts, suspensions])

  const entries = useMemo(() => {
    if (activeFilter === "all") return allEntries
    return allEntries.filter((e) => e.eventType === activeFilter)
  }, [allEntries, activeFilter])

  return (
    <ol className="player-timeline">
      {entries.map((entry, i) => {
        const year = entry.contract
          ? new Date(entry.contract.startSeason.seasonStart).getUTCFullYear()
          : entry.suspension
            ? new Date(entry.suspension.createdAt).getUTCFullYear()
            : ""

        return (
          <li key={entry.id} className="timeline-entry" style={{ "--entry-index": i } as React.CSSProperties}>
            <div className="timeline-year">{year}</div>
            <div className="timeline-spine">
              <div className={`timeline-node timeline-node--${entry.eventType}`} />
            </div>
            <div className="timeline-card">
              {entry.eventType === "suspension" && entry.suspension ? (
                <SuspensionTimelineCard suspension={entry.suspension} />
              ) : entry.contract ? (
                <ContractTimelineCard entry={entry} />
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// TimelineSkeleton
// ---------------------------------------------------------------------------

function TimelineSkeleton() {
  return (
    <div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="timeline-skeleton-entry">
          <div className="flex justify-end pr-3 pt-4">
            <Skeleton className="h-4 w-10 rounded" />
          </div>
          <div className="timeline-skeleton-spine">
            <Skeleton className="h-3.5 w-3.5 rounded-full mt-4" />
          </div>
          <div className="pt-1">
            <Card className="overflow-hidden">
              <Skeleton className="h-1 rounded-none" />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-2/3 rounded" />
                    <Skeleton className="h-3 w-1/4 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  )
}

export { PlayerTimeline, TimelineSkeleton }
