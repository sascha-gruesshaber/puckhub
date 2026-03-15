import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

interface Division {
  id: string
  name: string
  rounds: Array<{ id: string; name: string; roundType: string }>
}

interface RoundNavigatorProps {
  divisions: Division[]
  activeRoundId: string | undefined
  onRoundChange: (roundId: string) => void
  onDivisionChange?: (divisionIndex: number) => void
  activeDivisionIndex?: number
}

/**
 * Tournament-structure navigator: shows divisions as segments with rounds inside.
 * Single division → just shows round pills inline.
 * Multiple divisions → shows a division selector + round pills for the active division.
 */
export function RoundNavigator({
  divisions,
  activeRoundId,
  onRoundChange,
  onDivisionChange,
  activeDivisionIndex = 0,
}: RoundNavigatorProps) {
  const hasDivisions = divisions.length > 1
  const activeDivision = divisions[activeDivisionIndex] ?? divisions[0]
  const rounds = activeDivision?.rounds ?? []

  if (!activeDivision || rounds.length === 0) return null

  // Single division, single round → nothing to show
  if (!hasDivisions && rounds.length <= 1) return null

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Division selector (only if multiple) */}
        {hasDivisions && onDivisionChange && (
          <DivisionSelector divisions={divisions} activeIndex={activeDivisionIndex} onChange={onDivisionChange} />
        )}

        {/* Divider */}
        {hasDivisions && rounds.length > 1 && <div className="hidden sm:block w-px h-5 bg-league-text/10 mx-1" />}

        {/* Round pills */}
        {rounds.length > 1 && (
          <RoundPills rounds={rounds} activeRoundId={activeRoundId} onRoundChange={onRoundChange} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Division selector — compact dropdown for picking a division/group
// ---------------------------------------------------------------------------

function DivisionSelector({
  divisions,
  activeIndex,
  onChange,
}: {
  divisions: Division[]
  activeIndex: number
  onChange: (index: number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useT()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const activeName = divisions[activeIndex]?.name ?? t.roundNavigator.group

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
          "bg-league-primary/10 text-league-primary hover:bg-league-primary/15",
        )}
      >
        {activeName}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg border border-league-text/10 bg-league-surface shadow-lg py-1">
          {divisions.map((div, i) => (
            <button
              key={div.id}
              type="button"
              onClick={() => {
                onChange(i)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                i === activeIndex
                  ? "bg-league-primary/10 text-league-primary font-medium"
                  : "hover:bg-league-text/[0.04] text-league-text/70",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  i === activeIndex ? "bg-league-primary" : "bg-league-text/20",
                )}
              />
              {div.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Round pills — horizontally scrollable, shows round type via subtle styling
// ---------------------------------------------------------------------------

function RoundPills({
  rounds,
  activeRoundId,
  onRoundChange,
}: {
  rounds: Array<{ id: string; name: string; roundType: string }>
  activeRoundId: string | undefined
  onRoundChange: (roundId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [activeRoundId])

  return (
    <div ref={scrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hidden">
      {rounds.map((round) => {
        const isActive = round.id === activeRoundId
        const isPlayoff = round.roundType === "playoff"

        return (
          <button
            key={round.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onRoundChange(round.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors",
              isActive
                ? "bg-league-primary text-white shadow-sm"
                : "text-league-text/60 hover:text-league-text hover:bg-league-text/[0.04]",
            )}
          >
            {isPlayoff && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-1 py-px rounded",
                  isActive ? "bg-white/20" : "bg-league-accent/15 text-league-accent",
                )}
              >
                PO
              </span>
            )}
            {round.name}
          </button>
        )
      })}
    </div>
  )
}
