import { Badge, Skeleton } from "@puckhub/ui"
import { Link } from "@tanstack/react-router"
import { Globe, Pencil, Users } from "lucide-react"
import type { ReactNode } from "react"
import { trpc } from "@/trpc"
import { HoverCard } from "~/components/hoverCard"
import { useTranslation } from "~/i18n/use-translation"

interface TeamHoverCardProps {
  teamId: string
  /** Minimal data for instant display while details load */
  name: string
  shortName: string
  logoUrl?: string | null
  seasonId?: string | null
  onEdit?: () => void
  children: ReactNode
  disabled?: boolean
}

function TeamHoverCard({ teamId, name, shortName, logoUrl, seasonId, onEdit, children, disabled }: TeamHoverCardProps) {
  return (
    <HoverCard
      content={() => (
        <TeamHoverCardContent
          teamId={teamId}
          name={name}
          shortName={shortName}
          logoUrl={logoUrl}
          seasonId={seasonId}
          onEdit={onEdit}
        />
      )}
      disabled={disabled}
    >
      {children}
    </HoverCard>
  )
}

/** Inner component — only mounts when the card opens, so the query only fires on hover */
function TeamHoverCardContent({
  teamId,
  name,
  shortName,
  logoUrl,
  seasonId,
  onEdit,
}: Omit<TeamHoverCardProps, "children" | "disabled">) {
  const { t } = useTranslation("common")
  const { data: team, isLoading } = trpc.team.getById.useQuery({ id: teamId })

  const initials = shortName.substring(0, 2).toUpperCase()
  const accentColor = team?.primaryColor || "hsl(var(--primary))"
  const displayName = team?.name ?? name
  const displayCity = team?.city

  return (
    <div className="overflow-hidden rounded-xl">
      {/* Team-colored top strip */}
      <div className="h-1" style={{ background: accentColor }} />

      <div className="p-4">
        {/* Header: logo + name */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
            style={{
              background: logoUrl ? "transparent" : `${accentColor}18`,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-bold" style={{ color: accentColor }}>
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] py-0">
                {shortName}
              </Badge>
              {displayCity && <span className="text-xs text-muted-foreground">{displayCity}</span>}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          ) : (
            <>
              {team?.contactName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block w-4 text-center shrink-0 text-foreground/40">
                    <Users className="h-3 w-3 inline" />
                  </span>
                  <span className="truncate">{team.contactName}</span>
                </div>
              )}
              {team?.website && (
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
              {!team?.contactName && !team?.website && (
                <p className="text-xs text-muted-foreground/60 italic">{t("teamsPage.hoverCard.noContactData")}</p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
          {seasonId && (
            <Link
              to="/seasons/$seasonId/roster"
              params={{ seasonId }}
              search={{ team: teamId }}
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
}

export { TeamHoverCard }
export type { TeamHoverCardProps }
