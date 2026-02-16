import { create } from "zustand"

export const FILTER_ALL = "__all__"

type PageKey =
  | "teams"
  | "players"
  | "games"
  | "sponsors"
  | "users"
  | "news"
  | "pages"
  | "venues"
  | "trikots"
  | "seasons"

interface TeamsFilters {
  search: string
  divisionFilter: string
}

interface PlayersFilters {
  search: string
  teamFilter: string
}

interface GamesFilters {
  search: string
  teamFilter: string
}

interface SponsorsFilters {
  search: string
  statusFilter: string
}

interface UsersFilters {
  search: string
  roleFilter: string
}

interface NewsFilters {
  search: string
  yearFilter: string
}

interface PagesFilters {
  search: string
  statusFilter: string
}

interface VenuesFilters {
  search: string
  teamFilter: string
}

interface TrikotsFilters {
  search: string
  templateFilter: string
}

interface SeasonsFilters {
  search: string
}

export interface FilterState {
  teams: TeamsFilters
  players: PlayersFilters
  games: GamesFilters
  sponsors: SponsorsFilters
  users: UsersFilters
  news: NewsFilters
  pages: PagesFilters
  venues: VenuesFilters
  trikots: TrikotsFilters
  seasons: SeasonsFilters
}

const defaults: FilterState = {
  teams: { search: "", divisionFilter: FILTER_ALL },
  players: { search: "", teamFilter: FILTER_ALL },
  games: { search: "", teamFilter: FILTER_ALL },
  sponsors: { search: "", statusFilter: FILTER_ALL },
  users: { search: "", roleFilter: FILTER_ALL },
  news: { search: "", yearFilter: FILTER_ALL },
  pages: { search: "", statusFilter: FILTER_ALL },
  venues: { search: "", teamFilter: FILTER_ALL },
  trikots: { search: "", templateFilter: FILTER_ALL },
  seasons: { search: "" },
}

interface FilterStore extends FilterState {
  setFilter: <P extends PageKey>(
    page: P,
    patch: Partial<FilterState[P]>,
  ) => void
  resetPage: (page: PageKey) => void
  resetAll: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  ...defaults,
  setFilter: (page, patch) =>
    set((state) => ({
      [page]: { ...state[page], ...patch },
    })),
  resetPage: (page) =>
    set(() => ({
      [page]: defaults[page],
    })),
  resetAll: () => set(() => ({ ...defaults })),
}))
