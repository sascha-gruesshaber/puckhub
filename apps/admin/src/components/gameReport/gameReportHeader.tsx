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
    location: string | null
    round: { name: string; roundType?: string; division: { name: string } }
  }
}

function GameReportHeader({ game }: GameReportHeaderProps) {
  const { t, i18n } = useTranslation("common")

  const scheduledDate = game.scheduledAt
    ? new Date(game.scheduledAt).toLocaleDateString(i18n.language, {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const done = game.status === "completed"
  const hWins = done && game.homeScore != null && game.awayScore != null && game.homeScore > game.awayScore
  const aWins = done && game.homeScore != null && game.awayScore != null && game.awayScore > game.homeScore

  return (
    <div className="sticky top-0 z-10 rounded-xl border bg-card/95 backdrop-blur-sm p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Home team */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <p
              className={`text-lg truncate ${hWins ? "font-bold text-emerald-600 dark:text-emerald-400" : done ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}
            >
              {game.homeTeam.shortName}
            </p>
            <p className="text-xs text-muted-foreground">{t("gameReport.home")}</p>
          </div>
          <div className="h-12 w-12 shrink-0 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
            {game.homeTeam.logoUrl ? (
              <img src={game.homeTeam.logoUrl} alt={game.homeTeam.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground/60">
                {game.homeTeam.shortName.slice(0, 2)}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-center px-4">
          <div className="text-3xl font-extrabold tabular-nums tracking-tight whitespace-nowrap">
            <span className={hWins ? "text-emerald-600 dark:text-emerald-400" : ""}>
              {game.homeScore ?? "-"}
            </span>
            <span className="text-muted-foreground/40 mx-2">:</span>
            <span className={aWins ? "text-emerald-600 dark:text-emerald-400" : ""}>
              {game.awayScore ?? "-"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {game.round.division.name} &mdash; {game.round.name}
          </div>
          <GameStatusBadge
            status={game.status}
            scheduledAt={game.scheduledAt}
            location={game.location}
            className="mt-1.5"
            t={t}
          />
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-12 w-12 shrink-0 rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
            {game.awayTeam.logoUrl ? (
              <img src={game.awayTeam.logoUrl} alt={game.awayTeam.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground/60">
                {game.awayTeam.shortName.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`text-lg truncate ${aWins ? "font-bold text-emerald-600 dark:text-emerald-400" : done ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}
            >
              {game.awayTeam.shortName}
            </p>
            <p className="text-xs text-muted-foreground">{t("gameReport.away")}</p>
          </div>
        </div>
      </div>

      {/* Meta line */}
      <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
        {scheduledDate && <span>{scheduledDate}</span>}
        {game.location && (
          <>
            <span className="text-border">|</span>
            <span>{game.location}</span>
          </>
        )}
      </div>
    </div>
  )
}

export { GameReportHeader }
