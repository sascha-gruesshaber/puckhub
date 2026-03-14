import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { useT } from "~/lib/i18n"
import { useBackPath } from "~/lib/utils"
import { HoverCard } from "./hoverCard"

interface PlayerHoverCardProps {
  firstName: string
  lastName: string
  photoUrl?: string | null
  jerseyNumber?: number | null
  position?: string | null
  team?: {
    name: string
    shortName?: string | null
    logoUrl?: string | null
  } | null
  nationality?: string | null
  dateOfBirth?: string | Date | null
  playerId?: string | null
  children: ReactNode
  disabled?: boolean
}

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

function PlayerHoverCard({
  firstName,
  lastName,
  photoUrl,
  jerseyNumber,
  position,
  team,
  nationality,
  dateOfBirth,
  playerId,
  children,
  disabled,
}: PlayerHoverCardProps) {
  return (
    <HoverCard
      content={() => (
        <PlayerHoverCardContent
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          jerseyNumber={jerseyNumber}
          position={position}
          team={team}
          nationality={nationality}
          dateOfBirth={dateOfBirth}
          playerId={playerId}
        />
      )}
      disabled={disabled}
    >
      {children}
    </HoverCard>
  )
}

function PlayerHoverCardContent({
  firstName,
  lastName,
  photoUrl,
  jerseyNumber,
  position,
  team,
  nationality,
  dateOfBirth,
  playerId,
}: Omit<PlayerHoverCardProps, "children" | "disabled">) {
  const t = useT()
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
  const age = calcAge(dateOfBirth)
  const backPath = useBackPath()

  return (
    <div className="overflow-hidden rounded-xl">
      {/* Accent top strip */}
      <div className="h-1 bg-league-primary" />

      <div className="p-4">
        {/* Header: photo + name */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-league-text/[0.06]">
            {photoUrl ? (
              <img src={photoUrl} alt={`${firstName} ${lastName}`} className="h-full w-full object-cover object-top" />
            ) : (
              <span className="text-sm font-bold text-league-text/40">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight truncate text-league-text">
              {firstName} <span>{lastName}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              {jerseyNumber != null && (
                <span className="text-xs font-mono font-bold text-league-primary">#{jerseyNumber}</span>
              )}
              {position && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-league-text/[0.06] text-league-text/70">
                  {t.positionLabels[position as keyof typeof t.positionLabels] ?? position}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 pt-3 border-t border-league-text/[0.08] space-y-1.5">
          {team && (
            <div className="flex items-center gap-2 text-xs text-league-text/60">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-league-text/[0.08] shrink-0" />
              )}
              <span className="truncate">
                {team.name}
                {team.shortName && <span className="text-league-text/30 ml-1">({team.shortName})</span>}
              </span>
            </div>
          )}
          {nationality && (
            <div className="flex items-center gap-2 text-xs text-league-text/60">
              <span className="inline-block w-4 text-center shrink-0 font-bold text-[10px] text-league-text/50 bg-league-text/[0.06] rounded px-0.5">
                {nationality.substring(0, 2)}
              </span>
              <span>{nationality}</span>
            </div>
          )}
          {age !== null && (
            <div className="flex items-center gap-2 text-xs text-league-text/60">
              <span className="inline-block w-4 text-center shrink-0">&nbsp;</span>
              <span>
                {age} {t.playerHoverCard.years}
                {dateOfBirth && (
                  <span className="text-league-text/30 ml-1">({formatDate(dateOfBirth)})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Link to player profile */}
        {playerId && (
          <div className="mt-3 pt-3 border-t border-league-text/[0.08]">
            <Link
              to="/stats/players/$playerId"
              params={{ playerId }}
              search={{ from: backPath }}
              className="flex items-center justify-between w-full text-xs font-medium text-league-primary hover:text-league-primary/80 transition-colors"
            >
              <span>{t.playerHoverCard.viewProfile}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export { PlayerHoverCard }
export type { PlayerHoverCardProps }
