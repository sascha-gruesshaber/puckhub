import { useTranslation } from "~/i18n/use-translation"

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
  const { t } = useTranslation("common")

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">{t("statsPage.teamsTab.selectTeams")}</p>
      <div className="flex flex-wrap gap-2">
        {teams.map((team) => {
          const selected = selectedIds.includes(team.id)

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onToggle(team.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground"
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
