import { Popover, PopoverContent, PopoverTrigger } from "@puckhub/ui"
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router"
import { Calendar, Check, ChevronDown } from "lucide-react"
import { useState } from "react"
import { useSeason } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

// ---------------------------------------------------------------------------
// Desktop — Popover-based season dropdown
// ---------------------------------------------------------------------------

export function HeaderSeasonPopover() {
  const season = useSeason()
  const t = useT()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { season: seasonParam } = useSearch({ strict: false }) as { season?: string }
  const [open, setOpen] = useState(false)

  if (season.all.length <= 1) return null

  const selectedId = seasonParam ?? season.current?.id
  const selectedLabel = season.all.find((s) => s.id === selectedId)?.name ?? season.current?.name ?? ""

  const handleSelect = (id: string) => {
    const isDefault = id === season.current?.id
    navigate({
      to: pathname,
      search: isDefault ? {} : { season: id },
      replace: true,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-white/10"
        >
          <Calendar className="h-3.5 w-3.5 opacity-60" />
          <span className="max-w-[140px] truncate">{selectedLabel}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="min-w-[220px] p-0 rounded-xl bg-league-header-bg text-league-header-text border-0 ring-1 ring-white/10 shadow-xl"
      >
        <div className="px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-50">
          {t.seasonSelector.switchSeason}
        </div>
        <div className="px-1.5 pb-1.5 space-y-0.5">
          {season.all.map((s) => {
            const isSelected = s.id === selectedId
            const isCurrent = s.id === season.current?.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isSelected ? "bg-white/15 font-semibold" : "hover:bg-white/10 opacity-75 hover:opacity-100",
                )}
              >
                <span className="flex-1 truncate text-left">{s.name}</span>
                {isCurrent && (
                  <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {t.seasonSelector.current}
                  </span>
                )}
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 opacity-80" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Mobile — inline select for hamburger menu
// ---------------------------------------------------------------------------

export function HeaderSeasonMobile({ onNavigate }: { onNavigate?: () => void }) {
  const season = useSeason()
  const t = useT()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { season: seasonParam } = useSearch({ strict: false }) as { season?: string }

  if (season.all.length <= 1) return null

  const selectedId = seasonParam ?? season.current?.id
  const selectedLabel = season.all.find((s) => s.id === selectedId)?.name ?? ""

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const isDefault = id === season.current?.id
    navigate({
      to: pathname,
      search: isDefault ? {} : { season: id },
      replace: true,
    })
    onNavigate?.()
  }

  return (
    <div className="px-3 py-2 mb-1 border-b border-white/10">
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1.5">
        {t.seasonSelector.switchSeason}
      </div>
      <div className="relative inline-flex">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium pointer-events-none">
          <Calendar className="h-3.5 w-3.5 opacity-60" />
          <span className="truncate max-w-[180px]">{selectedLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
        </span>
        <select
          value={selectedId}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-black bg-white"
          aria-label={t.seasonSelector.switchSeason}
        >
          {season.all.map((s) => (
            <option key={s.id} value={s.id} className="text-black bg-white">
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
