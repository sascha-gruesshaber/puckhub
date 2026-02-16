import { Calendar, Shield } from "lucide-react"
import { HoverCard } from "~/components/hoverCard"
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
  readOnly?: boolean
}

const positionOrder: Record<string, number> = { goalie: 0, defense: 1, forward: 2 }
const positionLabels: Record<string, string> = { goalie: "Tor", defense: "Verteidigung", forward: "Sturm" }

const suspensionTypeLabels: Record<string, string> = {
  match_penalty: "Matchstrafe",
  game_misconduct: "Spieldauer-Disziplinarstrafe",
}

function SuspendedBadgeHoverContent({ suspension }: { suspension: ActiveSuspension }) {
  const { t } = useTranslation("common")

  const formattedDate = suspension.gameScheduledAt
    ? suspension.gameScheduledAt.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

  const typeLabel = suspensionTypeLabels[suspension.suspensionType] ?? suspension.suspensionType

  return (
    <div className="p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
        <Shield className="w-4 h-4" />
        <span>{t("gameReport.suspended")}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.type")}:</span>
        <span className="font-medium">{typeLabel}</span>

        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.on")}:</span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {formattedDate}
        </span>

        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.originGame")}:</span>
        <span>
          {suspension.gameHomeTeamName} {t("gameReport.suspensionWarnings.vs")} {suspension.gameAwayTeamName}
        </span>

        {suspension.reason && (
          <>
            <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.reason")}:</span>
            <span>{suspension.reason}</span>
          </>
        )}

        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.progressLabel")}:</span>
        <span className="flex items-center gap-2">
          <span className="inline-flex gap-1 items-center">
            {Array.from({ length: suspension.suspendedGames }, (_, i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full ${
                  i < suspension.servedGames ? "bg-amber-500 dark:bg-amber-400" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("gameReport.suspensionWarnings.progress", {
              served: suspension.servedGames,
              total: suspension.suspendedGames,
            })}
          </span>
        </span>
      </div>
    </div>
  )
}

function TeamRosterChecklist({
  teamName,
  teamId,
  roster,
  selected,
  activeSuspensions,
  onToggle,
  onSetStartingGoalie,
  startingGoalieId,
  readOnly,
}: TeamRosterChecklistProps) {
  const { t } = useTranslation("common")

  const selectedIds = new Set(selected.map((s) => s.playerId))
  const teamSuspensions = activeSuspensions.filter((s) => s.teamId === teamId)
  const suspendedIds = new Set(teamSuspensions.map((s) => s.playerId))

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
              const suspension = isSuspended ? teamSuspensions.find((s) => s.playerId === p.playerId) : undefined

              return (
                <label
                  key={p.playerId}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    readOnly ? "cursor-default" : "cursor-pointer hover:bg-muted/50"
                  } ${isChecked ? "bg-primary/5" : ""} ${isSuspended && isChecked ? "ring-2 ring-red-400" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={readOnly}
                    onChange={(e) => onToggle(p, e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="w-8 text-right text-sm font-mono text-muted-foreground">
                    {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                  </span>
                  <span className="text-sm font-medium flex-1">
                    {p.player.lastName}, {p.player.firstName}
                  </span>
                  {isSuspended && suspension && (
                    <HoverCard
                      content={<SuspendedBadgeHoverContent suspension={suspension} />}
                      showDelay={200}
                      hideDelay={100}
                    >
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {t("gameReport.suspended")}
                      </span>
                    </HoverCard>
                  )}
                  {pos === "goalie" && isChecked && (
                    readOnly ? (
                      startingGoalieId === p.playerId ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Starter
                        </span>
                      ) : null
                    ) : (
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
                    )
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
