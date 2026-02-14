import { useTranslation } from "~/i18n/use-translation"
import type { ActiveSuspension } from "./suspensionWarnings"

interface RosterPlayer {
  id: string
  playerId: string
  teamId: string
  position: "forward" | "defense" | "goalie"
  jerseyNumber: number | null
  player: { id: string; firstName: string; lastName: string }
}

interface SelectedPlayer {
  playerId: string
  teamId: string
  position: "forward" | "defense" | "goalie"
  jerseyNumber: number | null
  isStartingGoalie: boolean
}

interface TeamRosterChecklistProps {
  teamName: string
  teamId: string
  roster: RosterPlayer[]
  selected: SelectedPlayer[]
  activeSuspensions: ActiveSuspension[]
  onToggle: (player: RosterPlayer, checked: boolean) => void
  onSetStartingGoalie: (playerId: string) => void
  startingGoalieId: string | null
}

const positionOrder: Record<string, number> = { goalie: 0, defense: 1, forward: 2 }
const positionLabels: Record<string, string> = { goalie: "Tor", defense: "Verteidigung", forward: "Sturm" }

function TeamRosterChecklist({
  teamName,
  teamId,
  roster,
  selected,
  activeSuspensions,
  onToggle,
  onSetStartingGoalie,
  startingGoalieId,
}: TeamRosterChecklistProps) {
  const { t } = useTranslation("common")

  const selectedIds = new Set(selected.map((s) => s.playerId))
  const suspendedIds = new Set(activeSuspensions.filter((s) => s.teamId === teamId).map((s) => s.playerId))

  const sorted = [...roster].sort(
    (a, b) =>
      (positionOrder[a.position] ?? 9) - (positionOrder[b.position] ?? 9) ||
      (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999),
  )

  const grouped: Record<string, RosterPlayer[]> = {}
  for (const p of sorted) {
    const key = p.position
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">{teamName}</h3>
      {(["goalie", "defense", "forward"] as const).map((pos) => {
        const players = grouped[pos] ?? []
        if (players.length === 0) return null
        return (
          <div key={pos} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {positionLabels[pos]}
            </p>
            {players.map((p) => {
              const isChecked = selectedIds.has(p.playerId)
              const isSuspended = suspendedIds.has(p.playerId)

              return (
                <label
                  key={p.playerId}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    isChecked ? "bg-primary/5" : ""
                  } ${isSuspended && isChecked ? "ring-2 ring-red-400" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onToggle(p, e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="w-8 text-right text-sm font-mono text-muted-foreground">
                    {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                  </span>
                  <span className="text-sm font-medium flex-1">
                    {p.player.lastName}, {p.player.firstName}
                  </span>
                  {isSuspended && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      {t("gameReport.suspended")}
                    </span>
                  )}
                  {pos === "goalie" && isChecked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        onSetStartingGoalie(p.playerId)
                      }}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                        startingGoalieId === p.playerId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {startingGoalieId === p.playerId ? "Starter" : "Starter?"}
                    </button>
                  )}
                </label>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export { TeamRosterChecklist }
export type { RosterPlayer, SelectedPlayer }
