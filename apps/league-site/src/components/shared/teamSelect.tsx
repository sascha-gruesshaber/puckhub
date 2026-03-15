import { ChevronDown, Users } from "lucide-react"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

export interface TeamSelectItem {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

interface TeamSelectProps {
  teams: TeamSelectItem[]
  value: string | undefined
  onChange: (teamId: string | undefined) => void
  allLabel?: string
  className?: string
}

export function TeamSelect({ teams, value, onChange, allLabel, className }: TeamSelectProps) {
  const t = useT()
  const resolvedAllLabel = allLabel ?? t.schedule.allTeams
  const selected = teams.find((team) => team.id === value)

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Visible styled display */}
      <span className="inline-flex items-center gap-2 rounded-lg border border-league-text/15 bg-league-surface px-3 py-1.5 text-sm font-medium text-league-text pointer-events-none">
        {selected ? (
          <TeamLogo name={selected.name} logoUrl={selected.logoUrl} size="sm" className="h-4 w-4 !text-[8px]" />
        ) : (
          <Users className="h-4 w-4 text-league-text/40" />
        )}
        <span className="truncate max-w-[180px]">{selected?.shortName ?? resolvedAllLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-league-text/40 flex-shrink-0" />
      </span>

      {/* Native select overlay */}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label={t.layout.selectTeam}
      >
        <option value="">{resolvedAllLabel}</option>
        {[...teams]
          .sort((a, b) => a.name.localeCompare(b.name, "de"))
          .map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
      </select>
    </div>
  )
}
