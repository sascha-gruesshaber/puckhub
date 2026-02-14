import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { trpc } from "@/trpc"

const STORAGE_KEY = "puckhub:working-season"

interface WorkingSeason {
  id: string
  name: string
  seasonStart: string
  seasonEnd: string
}

interface SeasonContextValue {
  season: WorkingSeason | null
  isLoading: boolean
  setWorkingSeason: (season: WorkingSeason) => void
}

const SeasonContext = createContext<SeasonContextValue | null>(null)

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState<WorkingSeason | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { data: currentSeason, isLoading: currentLoading } = trpc.season.getCurrent.useQuery()
  const { data: allSeasons, isLoading: listLoading } = trpc.season.list.useQuery()

  // Resolve season on mount / when data arrives
  // ALWAYS use current season (or latest), ignoring localStorage on initial load
  useEffect(() => {
    if (currentLoading || listLoading) return

    // Clear any stored season on mount to ensure fresh start
    localStorage.removeItem(STORAGE_KEY)

    // Use current/active season (or latest if out of range)
    if (currentSeason) {
      const ws: WorkingSeason = {
        id: currentSeason.id,
        name: currentSeason.name,
        seasonStart: new Date(currentSeason.seasonStart).toISOString(),
        seasonEnd: new Date(currentSeason.seasonEnd).toISOString(),
      }
      setSeason(ws)
      setIsLoading(false)
      return
    }

    // Fallback: if no current season, use the latest available season
    if (allSeasons && allSeasons.length > 0) {
      // Sort by seasonEnd descending to get the most recent season
      const sortedSeasons = [...allSeasons].sort(
        (a, b) => new Date(b.seasonEnd).getTime() - new Date(a.seasonEnd).getTime(),
      )
      const latestSeason = sortedSeasons[0]
      const ws: WorkingSeason = {
        id: latestSeason.id,
        name: latestSeason.name,
        seasonStart: new Date(latestSeason.seasonStart).toISOString(),
        seasonEnd: new Date(latestSeason.seasonEnd).toISOString(),
      }
      setSeason(ws)
      setIsLoading(false)
      return
    }

    // No season available at all
    setIsLoading(false)
  }, [currentSeason, allSeasons, currentLoading, listLoading])

  const setWorkingSeason = useCallback((s: WorkingSeason) => {
    setSeason(s)
    // No localStorage persistence - season resets to current on every page load
  }, [])

  return <SeasonContext.Provider value={{ season, isLoading, setWorkingSeason }}>{children}</SeasonContext.Provider>
}

export function useWorkingSeason() {
  const ctx = useContext(SeasonContext)
  if (!ctx) throw new Error("useWorkingSeason must be used within SeasonProvider")
  return ctx
}
