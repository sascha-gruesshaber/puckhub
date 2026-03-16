import { Badge } from "@puckhub/ui"
import { Calendar } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

const POSITION_ACCENT: Record<string, string> = {
  goalie: "border-l-blue-500",
  defense: "border-l-emerald-500",
  forward: "border-l-red-500",
}

interface PlayerInfoCardProps {
  player: {
    firstName: string
    lastName: string
    photoUrl?: string | null
  }
  position?: string | null
  jerseyNumber?: number | null
  sinceSeasonName?: string | null
}

function PlayerInfoCard({ player, position, jerseyNumber, sinceSeasonName }: PlayerInfoCardProps) {
  const { t } = useTranslation("common")
  const playerName = `${player.firstName} ${player.lastName}`

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg bg-muted/40 border-l-4 ${position ? (POSITION_ACCENT[position] ?? "") : ""}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={playerName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-primary">
            {player.firstName[0]}
            {player.lastName[0]}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground truncate">{playerName}</div>
        <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
          {jerseyNumber != null && (
            <span className="font-mono text-xs">#{jerseyNumber}</span>
          )}
          {position && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {t(`rosterPage.positions.${position}`)}
            </Badge>
          )}
          {sinceSeasonName && (
            <span className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {t("rosterPage.releaseDialog.since", { season: sinceSeasonName })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export { PlayerInfoCard, POSITION_ACCENT }
