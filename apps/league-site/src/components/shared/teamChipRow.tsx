import { Users } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { TeamLogo } from "~/components/shared/teamLogo"
import { cn } from "~/lib/utils"

export interface TeamChipItem {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

interface TeamChipRowProps {
  teams: TeamChipItem[]
  value: string | undefined
  onChange: (teamId: string | undefined) => void
  allLabel?: string
  className?: string
}

export function TeamChipRow({ teams, value, onChange, allLabel = "Alle Teams", className }: TeamChipRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setHasOverflow(el.scrollWidth > el.clientWidth + 2)
  }, [])

  useEffect(() => {
    checkOverflow()
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)
    return () => observer.disconnect()
  }, [checkOverflow])

  // Scroll active chip into view on value change
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [])

  const chipBase =
    "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 scroll-snap-align-start"
  const chipActive = "bg-league-primary text-white shadow-sm"
  const chipInactive =
    "bg-league-surface border border-league-text/15 text-league-text/70 hover:border-league-primary/40 hover:text-league-text"

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        role="radiogroup"
        className={cn("flex gap-2 overflow-x-auto scrollbar-hidden", hasOverflow && "scroll-fade-mask")}
        style={{ scrollSnapType: "x mandatory" }}
      >
        {/* "All Teams" chip */}
        {/* biome-ignore lint/a11y/useSemanticElements: custom styled chip group, role="radio" on button is intentional */}
        <button
          type="button"
          role="radio"
          aria-checked={value === undefined}
          ref={value === undefined ? activeRef : undefined}
          onClick={() => onChange(undefined)}
          className={cn(chipBase, value === undefined ? chipActive : chipInactive)}
          style={{ scrollSnapAlign: "start" }}
        >
          <Users className="h-3.5 w-3.5" />
          {allLabel}
        </button>

        {/* Team chips */}
        {[...teams]
          .sort((a, b) => a.name.localeCompare(b.name, "de"))
          .map((team) => {
            const isActive = value === team.id
            return (
              // biome-ignore lint/a11y/useSemanticElements: custom styled chip group, role="radio" on button is intentional
              <button
                key={team.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                ref={isActive ? activeRef : undefined}
                onClick={() => onChange(team.id)}
                className={cn(chipBase, isActive ? chipActive : chipInactive)}
                style={{ scrollSnapAlign: "start" }}
              >
                <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />
                {team.shortName}
              </button>
            )
          })}
      </div>
    </div>
  )
}
