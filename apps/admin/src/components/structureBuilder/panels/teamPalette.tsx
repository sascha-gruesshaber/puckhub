import { GripVertical, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "~/i18n/use-translation"

interface Team {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

interface TeamPaletteProps {
  teams: Team[]
  teamDivisionCounts: Map<string, number>
  onDragTypeChange: (type: "team" | null) => void
}

export function TeamPalette({ teams, teamDivisionCounts, onDragTypeChange }: TeamPaletteProps) {
  const { t } = useTranslation("common")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return teams
    const q = search.toLowerCase()
    return teams.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q))
  }, [teams, search])

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("seasonStructure.teamPalette.title")}
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">{t("seasonStructure.teamPalette.description")}</p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("seasonStructure.teamPalette.searchPlaceholder")}
          className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#F4D35E]/40"
        />
      </div>

      {/* Team list */}
      <div className="flex flex-col gap-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {filtered.map((team) => {
          const divisionCount = teamDivisionCounts.get(team.id) ?? 0
          const initials = team.shortName.substring(0, 2).toUpperCase()

          return (
            <div
              key={team.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/teamId", team.id)
                e.dataTransfer.effectAllowed = "copy"
                onDragTypeChange("team")
              }}
              onDragEnd={() => onDragTypeChange(null)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-grab hover:bg-gray-100 active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />

              <div
                className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  background: team.logoUrl ? "transparent" : undefined,
                }}
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-md bg-gray-100 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-600">{initials}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">{team.shortName}</div>
                <div className="text-[10px] text-gray-500 truncate">{team.name}</div>
              </div>

              {divisionCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#F4D35E] text-[#0C1929]">
                  {divisionCount}
                </span>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-[11px] text-gray-500 text-center py-4">{t("seasonStructure.teamPalette.noTeams")}</div>
        )}
      </div>
    </div>
  )
}
