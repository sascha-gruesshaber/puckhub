import { Link } from "@tanstack/react-router"
import { cn } from "~/lib/utils"
import { formatDate, formatTime } from "~/lib/utils"
import { ScoreBadge } from "./scoreBadge"
import { TeamLogo } from "./teamLogo"

interface GameTeam {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

interface GameCardProps {
  id: string
  homeTeam: GameTeam
  awayTeam: GameTeam
  homeScore: number | null
  awayScore: number | null
  status: string
  scheduledAt: Date | string | null
  round?: { name: string; division?: { name: string } } | null
  compact?: boolean
  className?: string
}

export function GameCard({
  id,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  scheduledAt,
  round,
  compact,
  className,
}: GameCardProps) {
  return (
    <Link
      to="/schedule/$gameId"
      params={{ gameId: id }}
      className={cn(
        "block rounded-lg border border-league-text/10 bg-league-surface p-4 transition-all hover:shadow-md hover:border-league-primary/30",
        className,
      )}
    >
      {/* Round info */}
      {round && !compact && (
        <div className="text-xs text-league-text/50 mb-2">
          {round.division?.name && <span>{round.division.name} &middot; </span>}
          {round.name}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2 justify-end text-right">
          <span className={cn("text-sm font-medium", compact && "text-xs")}>{homeTeam.shortName}</span>
          <TeamLogo name={homeTeam.name} logoUrl={homeTeam.logoUrl} size={compact ? "sm" : "md"} />
        </div>

        {/* Score */}
        <div className="flex-shrink-0 min-w-[60px] text-center">
          <ScoreBadge homeScore={homeScore} awayScore={awayScore} status={status} size={compact ? "sm" : "md"} />
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2">
          <TeamLogo name={awayTeam.name} logoUrl={awayTeam.logoUrl} size={compact ? "sm" : "md"} />
          <span className={cn("text-sm font-medium", compact && "text-xs")}>{awayTeam.shortName}</span>
        </div>
      </div>

      {/* Date/time */}
      {scheduledAt && (
        <div className="text-xs text-league-text/50 mt-2 text-center">
          {formatDate(scheduledAt)} &middot; {formatTime(scheduledAt)}
        </div>
      )}
    </Link>
  )
}
