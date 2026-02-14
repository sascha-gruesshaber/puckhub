import { Badge } from "@puckhub/ui"
import { Link } from "@tanstack/react-router"
import { Globe, Pencil, Users } from "lucide-react"
import type { ReactNode } from "react"
import { HoverCard } from "~/components/hoverCard"
import { useTranslation } from "~/i18n/use-translation"

interface TeamData {
  id: string
  name: string
  shortName: string
  city?: string | null
  logoUrl?: string | null
  contactName?: string | null
  website?: string | null
  primaryColor?: string | null
}

interface TeamHoverCardProps {
  team: TeamData
  seasonId?: string | null
  onEdit?: () => void
  children: ReactNode
  disabled?: boolean
}

function TeamHoverCard({ team, seasonId, onEdit, children, disabled }: TeamHoverCardProps) {
  const { t } = useTranslation("common")
  const initials = team.shortName.substring(0, 2).toUpperCase()
  const accentColor = team.primaryColor || "hsl(var(--primary))"

  const content = (
    <div className="overflow-hidden rounded-xl">
      {/* Team-colored top strip */}
      <div className="h-1" style={{ background: accentColor }} />

      <div className="p-4">
        {/* Header: logo + name */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
            style={{
              background: team.logoUrl ? "transparent" : `${accentColor}18`,
            }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-bold" style={{ color: accentColor }}>
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight truncate">{team.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] py-0">
                {team.shortName}
              </Badge>
              {team.city && <span className="text-xs text-muted-foreground">{team.city}</span>}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
          {team.contactName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-4 text-center shrink-0 text-foreground/40">
                <Users className="h-3 w-3 inline" />
              </span>
              <span className="truncate">{team.contactName}</span>
            </div>
          )}
          {team.website && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-4 text-center shrink-0 text-foreground/40">
                <Globe className="h-3 w-3 inline" />
              </span>
              <a
                href={team.website}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-foreground transition-colors underline underline-offset-2 decoration-border"
              >
                {team.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {!team.contactName && !team.website && (
            <p className="text-xs text-muted-foreground/60 italic">{t("teamsPage.hoverCard.noContactData")}</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
          {seasonId && (
            <Link
              to="/seasons/$seasonId/roster"
              params={{ seasonId }}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Users className="h-3 w-3" aria-hidden="true" />
              {t("teamsPage.hoverCard.roster")}
            </Link>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              {t("teamsPage.hoverCard.edit")}
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

export { TeamHoverCard }
export type { TeamData, TeamHoverCardProps }
