import { useMemo } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { FilterPill } from "./filterPill"

interface Team {
  id: string
  name: string
  shortName: string
  logoUrl?: string | null
}

interface TeamFilterPillsProps {
  teams: Team[]
  activeFilter: string
  onFilterChange: (filterId: string) => void
  /** Show "All teams" filter as first option */
  showAll?: boolean
  /** Custom filters to show before team filters (e.g., "Without team") */
  customFilters?: Array<{
    id: string
    label: string
    count?: number
  }>
  /** Translation key prefix for filters (default: 'filters') */
  translationPrefix?: string
  /** Season ID for roster link in hover card */
  seasonId?: string | null
}

const FILTER_ALL = "__all__"

/**
 * Centralized team filter pills component with logos
 * Used across games, players, roster, and venues pages
 */
function TeamFilterPills({
  teams,
  activeFilter,
  onFilterChange,
  showAll = true,
  customFilters = [],
  translationPrefix = "filters",
  seasonId,
}: TeamFilterPillsProps) {
  const { t } = useTranslation("common")

  // Sort teams alphabetically
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.name.localeCompare(b.name))
  }, [teams])

  return (
    <>
      {/* All filter */}
      {showAll && (
        <FilterPill
          label={t(`${translationPrefix}.allTeams`)}
          active={activeFilter === FILTER_ALL}
          onClick={() => onFilterChange(FILTER_ALL)}
        />
      )}

      {/* Custom filters (e.g., "Without team") */}
      {customFilters.map((filter) => (
        <FilterPill
          key={filter.id}
          label={filter.count !== undefined ? `${filter.label} (${filter.count})` : filter.label}
          active={activeFilter === filter.id}
          onClick={() => onFilterChange(filter.id)}
        />
      ))}

      {/* Team filters with logos */}
      {sortedTeams.map((team) => (
        <FilterPill
          key={team.id}
          label={team.shortName}
          tooltip={team.name}
          active={activeFilter === team.id}
          onClick={() => onFilterChange(team.id)}
          icon={
            team.logoUrl ? (
              <img src={team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain shrink-0" />
            ) : (
              <div
                className={`h-5 w-5 rounded-sm flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  activeFilter === team.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {team.shortName.slice(0, 2).toUpperCase()}
              </div>
            )
          }
        />
      ))}
    </>
  )
}

export { TeamFilterPills, FILTER_ALL }
export type { Team, TeamFilterPillsProps }
