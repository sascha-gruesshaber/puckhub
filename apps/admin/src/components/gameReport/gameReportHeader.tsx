import { Badge } from "@puckhub/ui"
import { useTranslation } from "~/i18n/use-translation"

interface GameReportHeaderProps {
  game: {
    homeTeam: { name: string; shortName: string; logoUrl: string | null }
    awayTeam: { name: string; shortName: string; logoUrl: string | null }
    homeScore: number | null
    awayScore: number | null
    status: string
    scheduledAt: string | Date | null
    venue: { name: string } | null
    round: { name: string; division: { name: string } }
  }
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  postponed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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

  return (
    <div className="sticky top-0 z-10 rounded-xl border bg-card/95 backdrop-blur-sm p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Home team */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {game.homeTeam.logoUrl ? (
            <img src={game.homeTeam.logoUrl} alt={game.homeTeam.name} className="w-12 h-12 object-contain rounded" />
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
              {game.homeTeam.shortName.slice(0, 2)}
            </div>
          )}
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
          <Badge className={`mt-2 ${statusColors[game.status] ?? ""}`}>{t(`gamesPage.status.${game.status}`)}</Badge>
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{game.awayTeam.name}</p>
            <p className="text-xs text-muted-foreground">{t("gameReport.away")}</p>
          </div>
          {game.awayTeam.logoUrl ? (
            <img src={game.awayTeam.logoUrl} alt={game.awayTeam.name} className="w-12 h-12 object-contain rounded" />
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
              {game.awayTeam.shortName.slice(0, 2)}
            </div>
          )}
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
