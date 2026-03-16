import { Popover, PopoverContent, PopoverTrigger } from "@puckhub/ui"
import { Plus, X } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

interface Team {
  id: string
  name: string
  shortName: string
  logoUrl?: string | null
}

interface TeamComparisonSelectorProps {
  teams: Team[]
  selectedIds: string[]
  onToggle: (teamId: string) => void
}

function TeamComparisonSelector({ teams, selectedIds, onToggle }: TeamComparisonSelectorProps) {
  const t = useT()
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedTeams = useMemo(
    () => selectedIds.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[],
    [selectedIds, teams],
  )

  const availableTeams = useMemo(
    () =>
      teams
        .filter((t) => !selectedIds.includes(t.id))
        .filter((t) => {
          if (!search) return true
          const q = search.toLowerCase()
          return t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q)
        })
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [teams, selectedIds, search],
  )

  const selectTeam = useCallback(
    (teamId: string) => {
      onToggle(teamId)
      setSearch("")
    },
    [onToggle],
  )

  return (
    <div>
      <p className="text-sm text-league-text/60 mb-3">{t.compareTeams.selectTeams}</p>

      <div className="flex flex-wrap items-center gap-2">
        {/* Selected team bubbles */}
        {selectedTeams.map((team) => (
          <span
            key={team.id}
            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-league-primary text-white text-sm font-medium shadow-sm animate-fade-in"
          >
            <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" className="h-5 w-5 !text-[9px] rounded-full ring-1 ring-white/20" />
            <span>{team.shortName}</span>
            <button
              type="button"
              onClick={() => onToggle(team.id)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-white/20 transition-colors cursor-pointer"
              aria-label={`Remove ${team.shortName}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Add team dropdown trigger */}
        <Popover
          onOpenChange={(open) => {
            if (open) {
              setSearch("")
              requestAnimationFrame(() => inputRef.current?.focus())
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer bg-league-surface border border-dashed border-league-text/20 text-league-text/60 hover:border-league-primary/40 hover:text-league-text"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.compareTeams.addTeam}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-[260px] p-0 border-league-text/10 bg-league-surface overflow-hidden"
          >
            {/* Search input */}
            <div className="p-2 border-b border-league-text/5">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.compareTeams.searchTeams}
                className="w-full rounded-md bg-league-text/[0.04] px-2.5 py-1.5 text-sm text-league-text placeholder:text-league-text/40 outline-none focus:ring-1 focus:ring-league-primary/30"
              />
            </div>

            {/* Team list */}
            <div role="listbox" className="max-h-[240px] overflow-y-auto py-1">
              {availableTeams.length === 0 ? (
                <p className="px-3 py-3 text-sm text-league-text/40 text-center">
                  {teams.length === selectedIds.length ? t.compareTeams.allSelected : t.compareTeams.noMatch}
                </p>
              ) : (
                availableTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => selectTeam(team.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left text-league-text transition-colors cursor-pointer hover:bg-league-text/[0.03] focus:bg-league-text/[0.06] focus:outline-none"
                  >
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" className="h-5 w-5 !text-[9px]" />
                    <span className="truncate">{team.name}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export { TeamComparisonSelector }
