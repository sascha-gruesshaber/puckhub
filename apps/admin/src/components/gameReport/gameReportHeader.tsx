import { Trophy } from "lucide-react"
import { GameStatusBadge } from "~/components/gameStatusBadge"
import { useTranslation } from "~/i18n/use-translation"

interface GameReportHeaderProps {
  game: {
    homeTeam: { name: string; shortName: string; logoUrl: string | null }
    awayTeam: { name: string; shortName: string; logoUrl: string | null }
    homeScore: number | null
    awayScore: number | null
    status: string
    scheduledAt: string | Date | null
    venueId: string | null
    venue: { name: string } | null
    round: { name: string; division: { name: string } }
  }
}

function GameReportHeader({ game }: GameReportHeaderProps) {
  const { t } = useTranslation("common")

  const scheduledDate = game.scheduledAt
    ? new Date(game.scheduledAt).toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const isCompleted = game.status === "completed"
  const homeWins = isCompleted && game.homeScore != null && game.awayScore != null && game.homeScore > game.awayScore
  const awayWins = isCompleted && game.homeScore != null && game.awayScore != null && game.awayScore > game.homeScore

  return (
    <div className="sticky top-0 z-10 rounded-xl border bg-card/95 backdrop-blur-sm p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Home team */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            {game.homeTeam.logoUrl ? (
              <img src={game.homeTeam.logoUrl} alt={game.homeTeam.name} className="w-12 h-12 object-contain rounded" />
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                {game.homeTeam.shortName.slice(0, 2)}
              </div>
            )}
            {homeWins && (
              <span className="absolute -top-1 -right-1 inline-flex items-center p-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 ring-2 ring-white dark:ring-gray-900">
                <Trophy className="w-3 h-3" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{game.homeTeam.name}</p>
            <p className="text-xs text-muted-foreground">{t("gameReport.home")}</p>
          </div>
        </div>

        {/* Score */}
        <div className="text-center px-6">
          <div className="text-4xl font-black tabular-nums tracking-tight">
            {game.homeScore ?? "-"} : {game.awayScore ?? "-"}
          </div>
          <GameStatusBadge
            status={game.status}
            scheduledAt={game.scheduledAt}
            venueId={game.venueId}
            className="mt-2"
          />
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{game.awayTeam.name}</p>
            <p className="text-xs text-muted-foreground">{t("gameReport.away")}</p>
          </div>
          <div className="relative shrink-0">
            {game.awayTeam.logoUrl ? (
              <img src={game.awayTeam.logoUrl} alt={game.awayTeam.name} className="w-12 h-12 object-contain rounded" />
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                {game.awayTeam.shortName.slice(0, 2)}
              </div>
            )}
            {awayWins && (
              <span className="absolute -top-1 -right-1 inline-flex items-center p-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 ring-2 ring-white dark:ring-gray-900">
                <Trophy className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta line */}
      <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
        {scheduledDate && <span>{scheduledDate}</span>}
        {game.venue && (
          <>
            <span className="text-border">|</span>
            <span>{game.venue.name}</span>
          </>
        )}
        <span className="text-border">|</span>
        <span>
          {game.round.division.name} &mdash; {game.round.name}
        </span>
      </div>
    </div>
  )
}

export { GameReportHeader }
