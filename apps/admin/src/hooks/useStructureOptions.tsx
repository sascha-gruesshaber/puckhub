import type { ReactNode } from "react"
import { useMemo } from "react"
import type { FilterDropdownOption, FilterDropdownOptionGroup } from "~/components/filterDropdown"
import { divisionIcon, roundTypeIcons } from "~/components/structureBuilder/utils/roundTypeIcons"

interface StructureData {
  divisions?: { id: string; name: string; sortOrder?: number | null }[]
  rounds?: { id: string; name: string; divisionId: string; roundType: string; sortOrder: number }[]
  teamAssignments?: {
    divisionId: string
    team: {
      id: string
      name: string
      shortName: string
      logoUrl?: string | null
      homeVenue?: string | null
      city?: string | null
      contactName?: string | null
      website?: string | null
      primaryColor?: string | null
    }
  }[]
}

function teamIcon(team: { shortName: string; logoUrl?: string | null }): ReactNode {
  return team.logoUrl ? (
    <img src={team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
  ) : (
    <div className="h-5 w-5 rounded-sm flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground">
      {team.shortName.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function useStructureOptions(structure: StructureData | null | undefined) {
  const divisions = structure?.divisions ?? []
  const rounds = structure?.rounds ?? []

  const teams = useMemo(() => {
    const m = new Map<
      string,
      {
        id: string
        name: string
        shortName: string
        logoUrl: string | null
        homeVenue?: string | null
        city?: string | null
        contactName?: string | null
        website?: string | null
        primaryColor?: string | null
      }
    >()
    for (const ta of structure?.teamAssignments ?? []) {
      m.set(ta.team.id, {
        id: ta.team.id,
        name: ta.team.name,
        shortName: ta.team.shortName,
        logoUrl: ta.team.logoUrl ?? null,
        homeVenue: ta.team.homeVenue ?? null,
        city: ta.team.city ?? null,
        contactName: ta.team.contactName ?? null,
        website: ta.team.website ?? null,
        primaryColor: ta.team.primaryColor ?? null,
      })
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [structure])

  const roundFilterGroups: FilterDropdownOptionGroup[] = useMemo(() => {
    if (divisions.length <= 1 || rounds.length === 0) return []
    const sortedDivisions = [...divisions].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
    )
    return sortedDivisions.map((div) => ({
      label: div.name,
      icon: divisionIcon,
      options: rounds
        .filter((r) => r.divisionId === div.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({
          value: `${r.divisionId}::${r.id}`,
          label: r.name,
          icon: roundTypeIcons[r.roundType as keyof typeof roundTypeIcons],
        })),
    }))
  }, [divisions, rounds])

  const roundFilterOptions: FilterDropdownOption[] = useMemo(() => {
    if (divisions.length === 0 || rounds.length === 0) return []
    if (rounds.length <= 1) return []
    const showLabels = divisions.length > 1
    return rounds.map((r) => {
      const div = divisions.find((d) => d.id === r.divisionId)
      return {
        value: `${r.divisionId}::${r.id}`,
        label: showLabels && div ? `${div.name} – ${r.name}` : r.name,
        icon: roundTypeIcons[r.roundType as keyof typeof roundTypeIcons],
      }
    })
  }, [divisions, rounds])

  const divisionOptions: FilterDropdownOption[] = useMemo(
    () =>
      [...divisions]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
        .map((d) => ({
          value: d.id,
          label: d.name,
          icon: divisionIcon,
        })),
    [divisions],
  )

  const teamFilterOptions: FilterDropdownOption[] = useMemo(
    () =>
      teams.map((t) => ({
        value: t.id,
        label: t.shortName,
        description: t.name,
        icon: teamIcon(t),
      })),
    [teams],
  )

  return {
    teams,
    divisions,
    rounds,
    roundFilterGroups,
    roundFilterOptions,
    divisionOptions,
    teamFilterOptions,
  }
}
