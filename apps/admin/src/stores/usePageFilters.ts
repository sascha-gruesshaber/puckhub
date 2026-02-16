import { useCallback } from "react"
import { FILTER_ALL, useFilterStore } from "./filterStore"

export { FILTER_ALL } from "./filterStore"

export function useTeamsFilters() {
  const { search, divisionFilter } = useFilterStore((s) => s.teams)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("teams", { search: v }),
      [setFilter],
    ),
    divisionFilter,
    setDivisionFilter: useCallback(
      (v: string) => setFilter("teams", { divisionFilter: v }),
      [setFilter],
    ),
  }
}

export function usePlayersFilters() {
  const { search, teamFilter } = useFilterStore((s) => s.players)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("players", { search: v }),
      [setFilter],
    ),
    teamFilter,
    setTeamFilter: useCallback(
      (v: string) => setFilter("players", { teamFilter: v }),
      [setFilter],
    ),
  }
}

export function useGamesFilters() {
  const { search, teamFilter } = useFilterStore((s) => s.games)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("games", { search: v }),
      [setFilter],
    ),
    teamFilter,
    setTeamFilter: useCallback(
      (v: string) => setFilter("games", { teamFilter: v }),
      [setFilter],
    ),
  }
}

export function useSponsorsFilters() {
  const { search, statusFilter } = useFilterStore((s) => s.sponsors)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("sponsors", { search: v }),
      [setFilter],
    ),
    statusFilter,
    setStatusFilter: useCallback(
      (v: string) => setFilter("sponsors", { statusFilter: v }),
      [setFilter],
    ),
  }
}

export function useUsersFilters() {
  const { search, roleFilter } = useFilterStore((s) => s.users)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("users", { search: v }),
      [setFilter],
    ),
    roleFilter,
    setRoleFilter: useCallback(
      (v: string) => setFilter("users", { roleFilter: v }),
      [setFilter],
    ),
  }
}

export function useNewsFilters() {
  const { search, yearFilter } = useFilterStore((s) => s.news)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("news", { search: v }),
      [setFilter],
    ),
    yearFilter,
    setYearFilter: useCallback(
      (v: string) => setFilter("news", { yearFilter: v }),
      [setFilter],
    ),
  }
}

export function usePagesFilters() {
  const { search, statusFilter } = useFilterStore((s) => s.pages)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("pages", { search: v }),
      [setFilter],
    ),
    statusFilter,
    setStatusFilter: useCallback(
      (v: string) => setFilter("pages", { statusFilter: v }),
      [setFilter],
    ),
  }
}

export function useVenuesFilters() {
  const { search, teamFilter } = useFilterStore((s) => s.venues)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("venues", { search: v }),
      [setFilter],
    ),
    teamFilter,
    setTeamFilter: useCallback(
      (v: string) => setFilter("venues", { teamFilter: v }),
      [setFilter],
    ),
  }
}

export function useTrikotsFilters() {
  const { search, templateFilter } = useFilterStore((s) => s.trikots)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("trikots", { search: v }),
      [setFilter],
    ),
    templateFilter,
    setTemplateFilter: useCallback(
      (v: string) => setFilter("trikots", { templateFilter: v }),
      [setFilter],
    ),
  }
}

export function useSeasonsFilters() {
  const { search } = useFilterStore((s) => s.seasons)
  const setFilter = useFilterStore((s) => s.setFilter)

  return {
    search,
    setSearch: useCallback(
      (v: string) => setFilter("seasons", { search: v }),
      [setFilter],
    ),
  }
}
