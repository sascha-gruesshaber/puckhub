import { Badge } from "@puckhub/ui"
import { Link } from "@tanstack/react-router"
import { History, Pencil } from "lucide-react"
import type { ReactNode } from "react"
import { HoverCard } from "~/components/hoverCard"
import { useTranslation } from "~/i18n/use-translation"

interface PlayerData {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  dateOfBirth?: Date | string | null
  nationality?: string | null
}

interface PlayerHoverCardProps {
  player: PlayerData
  team?: {
    id: string
    name: string
    shortName: string
    logoUrl?: string | null
  } | null
  position?: string | null
  jerseyNumber?: number | null
  onEdit?: () => void
  children: ReactNode
  disabled?: boolean
}

function PlayerHoverCard({ player, team, position, jerseyNumber, onEdit, children, disabled }: PlayerHoverCardProps) {
  const { t } = useTranslation("common")
  const initials = `${player.firstName[0] || ""}${player.lastName[0] || ""}`.toUpperCase()

  function calcAge(dob: Date | string | null | undefined): number | null {
    if (!dob) return null
    const date = dob instanceof Date ? dob : new Date(dob)
    const today = new Date()
    let a = today.getFullYear() - date.getFullYear()
    const m = today.getMonth() - date.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) a--
    return a
  }

  function formatDate(dob: Date | string | null | undefined): string {
    if (!dob) return ""
    const date = dob instanceof Date ? dob : new Date(dob)
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const age = calcAge(player.dateOfBirth)

  const content = (
    <div className="overflow-hidden rounded-xl">
      {/* Accent top strip */}
      <div className="h-1" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} />

      <div className="p-4">
        {/* Header: photo + name */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={`${player.firstName} ${player.lastName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight truncate">
              {player.firstName} <span className="text-foreground">{player.lastName}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              {jerseyNumber != null && (
                <span className="text-xs font-mono font-bold text-primary">#{jerseyNumber}</span>
              )}
              {position && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  {t(`playersPage.positions.${position}`)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
          {team && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-muted shrink-0" />
              )}
              <span className="truncate">
                {team.name} <span className="text-border">({team.shortName})</span>
              </span>
            </div>
          )}
          {!team && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-4 w-4 rounded-full bg-muted/50 shrink-0" />
              <span>{t("playersPage.hoverCard.withoutTeam")}</span>
            </div>
          )}
          {player.nationality && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-4 text-center shrink-0 font-bold text-[10px] text-foreground/60 bg-muted rounded px-0.5">
                {player.nationality.substring(0, 2)}
              </span>
              <span>{t("playersPage.hoverCard.nationality", { value: player.nationality })}</span>
            </div>
          )}
          {age !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-4 text-center shrink-0">&nbsp;</span>
              <span>
                {t("playersPage.hoverCard.ageYears", { age })}
                {player.dateOfBirth && <span className="text-border ml-1">({formatDate(player.dateOfBirth)})</span>}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
          <Link
            to="/players/$playerId/history"
            params={{ playerId: player.id }}
            className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <History className="h-3 w-3" aria-hidden="true" />
            {t("playersPage.actions.history")}
          </Link>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              {t("playersPage.actions.edit")}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <HoverCard content={content} disabled={disabled}>
      {children}
    </HoverCard>
  )
}

export { PlayerHoverCard }
export type { PlayerData, PlayerHoverCardProps }
