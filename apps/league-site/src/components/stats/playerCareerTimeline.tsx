import { useMemo } from "react"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useT } from "~/lib/i18n"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contract {
  id: string
  playerId: string
  teamId: string
  position: string
  jerseyNumber: number | null
  startSeason: { id: string; name: string; seasonStart: Date | string }
  endSeason: { id: string; name: string; seasonEnd: Date | string } | null
  team: { id: string; name: string; shortName: string; logoUrl: string | null }
}

interface Suspension {
  id: string
  gameSuspensions: number
  servedGames: number
  game: {
    scheduledAt: Date | string
    homeTeam: { shortName: string; logoUrl: string | null }
    awayTeam: { shortName: string; logoUrl: string | null }
    round: { name: string; division: { name: string; season: { id: string; name: string } } }
  }
  gameEvent: { penaltyType: { name: string; shortName: string } | null } | null
  team: { shortName: string; logoUrl: string | null }
}

// ---------------------------------------------------------------------------
// Stable team colors
// ---------------------------------------------------------------------------

const TEAM_COLORS = [
  "hsl(215, 70%, 50%)",
  "hsl(142, 60%, 40%)",
  "hsl(354, 70%, 50%)",
  "hsl(44, 80%, 45%)",
  "hsl(280, 55%, 50%)",
  "hsl(180, 55%, 40%)",
  "hsl(25, 80%, 50%)",
  "hsl(330, 60%, 50%)",
]

// ---------------------------------------------------------------------------
// Career Bar — visual overview of contracts
// ---------------------------------------------------------------------------

function PlayerCareerBar({ contracts }: { contracts: Contract[] }) {
  const t = useT()

  const teamColors = useMemo(() => {
    const map = new Map<string, string>()
    let idx = 0
    for (const c of contracts) {
      if (!map.has(c.team.id)) {
        map.set(c.team.id, TEAM_COLORS[idx % TEAM_COLORS.length]!)
        idx++
      }
    }
    return map
  }, [contracts])

  const sorted = useMemo(() => {
    return [...contracts].sort(
      (a, b) => new Date(a.startSeason.seasonStart).getTime() - new Date(b.startSeason.seasonStart).getTime(),
    )
  }, [contracts])

  if (sorted.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t.playerDetail.career}</h2>
      <div className="bg-league-surface rounded-xl border border-league-text/10 p-4">
        <div className="space-y-2">
          {sorted.map((c) => {
            const color = teamColors.get(c.team.id) ?? TEAM_COLORS[0]!
            const isActive = !c.endSeason
            const range = c.endSeason
              ? `${c.startSeason.name} – ${c.endSeason.name}`
              : `${c.startSeason.name} – ${t.common.current.toLowerCase()}`

            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-24 shrink-0 flex items-center gap-2">
                  <TeamLogo name={c.team.name} logoUrl={c.team.logoUrl} size="sm" />
                  <span className="text-xs font-medium truncate">{c.team.shortName}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="h-7 rounded-md flex items-center px-2.5 gap-2 text-white text-xs font-medium"
                    style={{ backgroundColor: color, opacity: isActive ? 1 : 0.7 }}
                  >
                    <span>{t.positions[c.position as keyof typeof t.positions] ?? c.position}</span>
                    {c.jerseyNumber != null && <span className="font-mono">#{c.jerseyNumber}</span>}
                    <span className="ml-auto text-white/80 text-[11px]">{range}</span>
                    {isActive && (
                      <span className="bg-white/20 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {t.common.current}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { PlayerCareerBar }
export type { Contract, Suspension }
