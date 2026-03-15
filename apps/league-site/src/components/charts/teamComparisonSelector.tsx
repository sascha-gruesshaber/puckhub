import { useT } from "~/lib/i18n"

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

  return (
    <div>
      <p className="text-sm text-league-text/60 mb-2">{t.compareTeams.selectTeams}</p>
      <div className="flex flex-wrap gap-2">
        {[...teams]
          .sort((a, b) => a.name.localeCompare(b.name, "de"))
          .map((team) => {
            const selected = selectedIds.includes(team.id)
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => onToggle(team.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  selected
                    ? "bg-league-primary text-white"
                    : "bg-league-surface border border-league-text/10 text-league-text/60 hover:text-league-text"
                }`}
              >
                {team.logoUrl && (
                  <img src={team.logoUrl} alt="" className="h-4 w-4 rounded-sm object-contain shrink-0" />
                )}
                {team.shortName}
              </button>
            )
          })}
      </div>
    </div>
  )
}

export { TeamComparisonSelector }
