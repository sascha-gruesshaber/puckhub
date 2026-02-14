import { Badge, Card, CardContent, Skeleton } from "@puckhub/ui"
import { ArrowRightLeft, FileSignature, RefreshCw, Zap } from "lucide-react"
import { useMemo } from "react"
import "./timeline.css"
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

export type EventType = "signed" | "transfer" | "position-change" | "active"

interface ClassifiedEntry {
  contract: Contract
  eventType: EventType
}

// ---------------------------------------------------------------------------
// Classification helper
// ---------------------------------------------------------------------------

function classifyContracts(contracts: Contract[]): ClassifiedEntry[] {
  // Sort chronologically ascending by startSeason.seasonStart, then createdAt
  const sorted = [...contracts].sort((a, b) => {
    const startDiff = new Date(a.startSeason.seasonStart).getTime() - new Date(b.startSeason.seasonStart).getTime()
    if (startDiff !== 0) return startDiff
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return sorted.map((contract, i) => {
    // Active contract (no endSeason)
    if (!contract.endSeasonId) {
      return { contract, eventType: "active" as const }
    }

    if (i === 0) {
      return { contract, eventType: "signed" as const }
    }

    const prev = sorted[i - 1]!

    // Transfer — different team from previous
    if (contract.teamId !== prev.teamId) {
      return { contract, eventType: "transfer" as const }
    }

    // Position change — same team but different position
    if (contract.position !== prev.position) {
      return { contract, eventType: "position-change" as const }
    }

    // Default — signed (e.g. re-signed with same team)
    return { contract, eventType: "signed" as const }
  })
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
  }
}

// ---------------------------------------------------------------------------
// TimelineCard
// ---------------------------------------------------------------------------

const positionColors: Record<string, { bg: string; text: string }> = {
  goalie: { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa" },
  defense: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399" },
  forward: { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171" },
}

function TimelineCard({ entry }: { entry: ClassifiedEntry }) {
  const { t } = useTranslation("common")
  const { contract, eventType } = entry
  const colors = positionColors[contract.position] ?? { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" }
  const initials = contract.team.shortName.slice(0, 3).toUpperCase()

  const seasonRange = contract.endSeason
    ? `${contract.startSeason.name} – ${contract.endSeason.name}`
    : t("playersPage.timeline.sinceSeason", { season: contract.startSeason.name })

  return (
    <Card className="overflow-hidden">
      {/* Position-colored accent bar */}
      <div className={`h-1 timeline-accent-bar--${contract.position}`} aria-hidden="true" />
      <CardContent className="p-4">
        {/* Event type row */}
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

        {/* Team row */}
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

        {/* Position + season range */}
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
// PlayerTimeline
// ---------------------------------------------------------------------------

function PlayerTimeline({ contracts }: { contracts: Contract[] }) {
  const entries = useMemo(() => classifyContracts(contracts), [contracts])

  return (
    <ol className="player-timeline">
      {entries.map((entry, i) => (
        <li key={entry.contract.id} className="timeline-entry" style={{ "--entry-index": i } as React.CSSProperties}>
          {/* Year label */}
          <div className="timeline-year">{new Date(entry.contract.startSeason.seasonStart).getUTCFullYear()}</div>

          {/* Spine + node */}
          <div className="timeline-spine">
            <div className={`timeline-node timeline-node--${entry.eventType}`} />
          </div>

          {/* Card */}
          <div className="timeline-card">
            <TimelineCard entry={entry} />
          </div>
        </li>
      ))}
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
          {/* Year */}
          <div className="flex justify-end pr-3 pt-4">
            <Skeleton className="h-4 w-10 rounded" />
          </div>

          {/* Spine */}
          <div className="timeline-skeleton-spine">
            <Skeleton className="h-3.5 w-3.5 rounded-full mt-4" />
          </div>

          {/* Card */}
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
