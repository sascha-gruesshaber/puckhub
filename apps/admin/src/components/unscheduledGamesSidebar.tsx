import { Draggable } from "@fullcalendar/interaction"
import { useEffect, useRef } from "react"
import { useTranslation } from "~/i18n/use-translation"

interface Game {
  id: string
  homeTeam: {
    id: string
    shortName: string
    logoUrl: string | null
  }
  awayTeam: {
    id: string
    shortName: string
    logoUrl: string | null
  }
  round: {
    name: string
  }
  venue?: {
    name: string
  } | null
}

interface UnscheduledGamesSidebarProps {
  games: Game[]
}

export function UnscheduledGamesSidebar({ games }: UnscheduledGamesSidebarProps) {
  const { t } = useTranslation("common")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || games.length === 0) return

    const draggable = new Draggable(containerRef.current, {
      itemSelector: ".game-card",
      eventData: (gameCard) => {
        const gameId = gameCard.dataset.gameId
        const game = games.find((g) => g.id === gameId)
        if (!game) return null

        return {
          id: gameId,
          title: `${game.homeTeam.shortName} vs ${game.awayTeam.shortName}`,
          extendedProps: { gameId, isExternal: true },
          duration: "02:00",
        }
      },
    })

    return () => draggable.destroy()
  }, [games.length, games.find])

  if (games.length === 0) {
    return null
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 border-l border-border bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("gamesPage.unscheduledSidebar.title")}</h3>
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Demnächst
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{t("gamesPage.unscheduledSidebar.description")}</p>
      </div>

      {/* Scrollable game cards */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {games.map((game) => (
          <div
            key={game.id}
            data-game-id={game.id}
            className="game-card cursor-move bg-white rounded-lg border border-border/50 p-3 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            {/* Team matchup */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                {game.homeTeam.logoUrl && <img src={game.homeTeam.logoUrl} alt="" className="h-5 w-5 object-contain" />}
                <span className="font-semibold text-sm">{game.homeTeam.shortName}</span>
              </div>
              <span className="text-xs text-muted-foreground">vs.</span>
              <div className="flex items-center gap-1.5">
                {game.awayTeam.logoUrl && <img src={game.awayTeam.logoUrl} alt="" className="h-5 w-5 object-contain" />}
                <span className="font-semibold text-sm">{game.awayTeam.shortName}</span>
              </div>
            </div>

            {/* Round and venue info */}
            <div className="text-xs text-muted-foreground text-center space-y-0.5">
              <div className="truncate">{game.round.name}</div>
              {game.venue && <div className="truncate opacity-80">{game.venue.name}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground text-center">
        {games.length} {games.length === 1 ? "Spiel" : "Spiele"}
      </div>
    </div>
  )
}
