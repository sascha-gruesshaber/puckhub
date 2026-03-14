import { ArrowRight, FileText, Shield, AlertTriangle } from "lucide-react"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useT } from "~/lib/i18n"

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
    round: { name: string; division: { name: string; season: { name: string } } }
  }
  gameEvent: { penaltyType: { name: string; shortName: string } | null } | null
  team: { shortName: string; logoUrl: string | null }
}

type TimelineEvent = { type: "contract"; data: Contract; date: Date } | { type: "suspension"; data: Suspension; date: Date }

function PlayerTimeline({ contracts, suspensions, filter }: { contracts: Contract[]; suspensions: Suspension[]; filter: string }) {
  const t = useT()
  const events: TimelineEvent[] = []

  for (const c of contracts) {
    events.push({ type: "contract", data: c, date: new Date(c.startSeason.seasonStart) })
  }
  for (const s of suspensions) {
    events.push({ type: "suspension", data: s, date: new Date(s.game.scheduledAt) })
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime())

  const filtered = filter === "all"
    ? events
    : filter === "suspension"
      ? events.filter((e) => e.type === "suspension")
      : events.filter((e) => e.type === "contract")

  if (filtered.length === 0) {
    return <p className="text-sm text-league-text/40 text-center py-6">{t.playerTimeline.noEntries}</p>
  }

  return (
    <div className="space-y-3">
      {filtered.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              event.type === "suspension" ? "bg-red-100 text-red-600" : "bg-league-primary/10 text-league-primary"
            }`}>
              {event.type === "suspension" ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            {i < filtered.length - 1 && <div className="w-px flex-1 bg-league-text/10 my-1" />}
          </div>
          <div className="flex-1 pb-4">
            {event.type === "contract" ? (
              <ContractCard contract={event.data} />
            ) : (
              <SuspensionCard suspension={event.data} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ContractCard({ contract }: { contract: Contract }) {
  const t = useT()
  return (
    <div className="bg-league-surface rounded-lg border border-league-text/10 p-3">
      <div className="flex items-center gap-2 mb-1">
        <TeamLogo name={contract.team.name} logoUrl={contract.team.logoUrl} size="sm" />
        <span className="font-medium text-sm">{contract.team.name}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-league-text/60">
        <span className="bg-league-text/5 rounded px-1.5 py-0.5">{t.positions[contract.position as keyof typeof t.positions] ?? contract.position}</span>
        {contract.jerseyNumber != null && <span>#{contract.jerseyNumber}</span>}
        <span>&middot;</span>
        <span>
          {contract.startSeason.name}
          {contract.endSeason ? ` – ${contract.endSeason.name}` : ` – ${t.common.current.toLowerCase()}`}
        </span>
      </div>
    </div>
  )
}

function SuspensionCard({ suspension }: { suspension: Suspension }) {
  const t = useT()

  return (
    <div className="bg-red-50 rounded-lg border border-red-200 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-red-800 mb-1">
        <Shield className="h-3.5 w-3.5" />
        {t.playerTimeline.suspension} {suspension.gameSuspensions} Spiel{suspension.gameSuspensions !== 1 ? "e" : ""}
        {suspension.servedGames > 0 && (
          <span className="text-xs text-red-600">({suspension.servedGames} {t.playerTimeline.served})</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-red-600">
        {suspension.gameEvent?.penaltyType && (
          <span>{suspension.gameEvent.penaltyType.name}</span>
        )}
        <span>&middot;</span>
        <span>
          {suspension.game.homeTeam.shortName} vs {suspension.game.awayTeam.shortName}
        </span>
        <span>&middot;</span>
        <span>{suspension.game.round.division.season.name}</span>
      </div>
    </div>
  )
}

export { PlayerTimeline }
export type { Contract, Suspension }
