import { Link } from "@tanstack/react-router"
import { ArrowRight, Globe, MapPin } from "lucide-react"
import type { ReactNode } from "react"
import { useT } from "~/lib/i18n"
import { slugify, useBackPath } from "~/lib/utils"
import { HoverCard } from "./hoverCard"

interface TeamHoverCardProps {
  name: string
  shortName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  city?: string | null
  homeVenue?: string | null
  website?: string | null
  teamId?: string | null
  children: ReactNode
  disabled?: boolean
}

function TeamHoverCard({
  name,
  shortName,
  logoUrl,
  primaryColor,
  city,
  homeVenue,
  website,
  teamId,
  children,
  disabled,
}: TeamHoverCardProps) {
  return (
    <HoverCard
      content={() => (
        <TeamHoverCardContent
          name={name}
          shortName={shortName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          city={city}
          homeVenue={homeVenue}
          website={website}
          teamId={teamId}
        />
      )}
      disabled={disabled}
    >
      {children}
    </HoverCard>
  )
}

function TeamHoverCardContent({
  name,
  shortName,
  logoUrl,
  primaryColor,
  city,
  homeVenue,
  website,
  teamId,
}: Omit<TeamHoverCardProps, "children" | "disabled">) {
  const t = useT()
  const initials = (shortName ?? name).substring(0, 2).toUpperCase()
  const accentColor = primaryColor || "hsl(var(--league-primary))"
  const backPath = useBackPath()

  return (
    <div className="overflow-hidden rounded-xl">
      {/* Team-colored top strip */}
      <div className="h-1" style={{ background: accentColor }} />

      <div className="p-4">
        {/* Header: logo + name */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
            style={{ background: logoUrl ? "transparent" : `${accentColor}18` }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-bold" style={{ color: accentColor }}>
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight truncate text-league-text">{name}</p>
            <div className="flex items-center gap-2 mt-1">
              {shortName && (
                <span className="inline-flex items-center rounded border border-league-text/10 px-1.5 py-0.5 text-[10px] font-medium text-league-text/60">
                  {shortName}
                </span>
              )}
              {city && <span className="text-xs text-league-text/50">{city}</span>}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 pt-3 border-t border-league-text/[0.08] space-y-1.5">
          {homeVenue && (
            <div className="flex items-center gap-2 text-xs text-league-text/60">
              <span className="inline-block w-4 text-center shrink-0 text-league-text/40">
                <MapPin className="h-3 w-3 inline" />
              </span>
              <span className="truncate">{homeVenue}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-xs text-league-text/60">
              <span className="inline-block w-4 text-center shrink-0 text-league-text/40">
                <Globe className="h-3 w-3 inline" />
              </span>
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-league-text transition-colors underline underline-offset-2 decoration-league-text/20"
              >
                {website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {!homeVenue && !website && !teamId && (
            <p className="text-xs text-league-text/30 italic">{t.teamHoverCard.noMoreInfo}</p>
          )}
        </div>

        {/* Link to team page */}
        {teamId && (
          <div className="mt-3 pt-3 border-t border-league-text/[0.08]">
            <Link
              to="/teams/$teamId/$slug"
              params={{ teamId, slug: slugify(name) }}
              search={{ from: backPath }}
              className="flex items-center justify-between w-full text-xs font-medium transition-colors"
              style={{ color: accentColor }}
            >
              <span>{t.teamHoverCard.viewTeamPage}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export { TeamHoverCard }
export type { TeamHoverCardProps }
