import { CircleDot, Clock, Pencil, ShieldBan, Trash2 } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

interface TimelineEventProps {
  event: {
    id: string
    eventType: "goal" | "penalty"
    teamId: string
    period: number
    timeMinutes: number
    timeSeconds: number
    scorer?: { firstName: string; lastName: string } | null
    assist1?: { firstName: string; lastName: string } | null
    assist2?: { firstName: string; lastName: string } | null
    goalie?: { firstName: string; lastName: string } | null
    penaltyPlayer?: { firstName: string; lastName: string } | null
    penaltyType?: { name: string; shortName: string } | null
    penaltyMinutes: number | null
    penaltyDescription: string | null
    suspension?: { id: string; suspensionType: string; suspendedGames: number } | null
    team: { shortName: string }
  }
  runningScore: string
  isHome: boolean
  index: number
  onEdit: () => void
  onDelete: () => void
}

function TimelineEvent({ event, runningScore, isHome, index, onEdit, onDelete }: TimelineEventProps) {
  const { t } = useTranslation("common")

  const time = `${String(event.timeMinutes).padStart(2, "0")}:${String(event.timeSeconds).padStart(2, "0")}`
  const isGoal = event.eventType === "goal"
  const hasSuspension = !!event.suspension

  const nodeClass = isGoal
    ? "game-timeline-node--goal"
    : hasSuspension
      ? "game-timeline-node--suspension"
      : "game-timeline-node--penalty"

  const assists = [event.assist1, event.assist2].filter(Boolean)
  const sideClass = isHome ? "game-timeline-entry--home" : "game-timeline-entry--away"

  return (
    <li className={`game-timeline-entry ${sideClass}`} style={{ "--entry-index": index } as React.CSSProperties}>
      {/* Time */}
      <div className="game-timeline-time">{time}</div>

      {/* Spine + icon node */}
      <div className="game-timeline-spine">
        <div className={`game-timeline-node ${nodeClass}`}>
          {isGoal ? (
            <CircleDot strokeWidth={2.5} />
          ) : hasSuspension ? (
            <ShieldBan strokeWidth={2.5} />
          ) : (
            <Clock strokeWidth={2.5} />
          )}
        </div>
      </div>

      {/* Card */}
      <div className="game-timeline-card">
        {isGoal ? (
          /* ── Goal card ── */
          <div className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="p-3">
              {/* Action buttons */}
              <div
                className={`absolute top-2 ${isHome ? "left-2" : "right-2"} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className={`flex items-start gap-3 ${isHome ? "flex-row-reverse text-right" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 mb-1 ${isHome ? "justify-end" : ""}`}>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {t("gameReport.goal")}
                    </span>
                  </div>

                  <p className="font-semibold text-sm leading-tight">
                    {event.scorer ? `${event.scorer.lastName}, ${event.scorer.firstName}` : "—"}
                  </p>

                  {assists.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{assists.map((a) => a?.lastName).join(", ")}</p>
                  )}

                  {event.goalie && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {t("gameReport.fields.goalie")}: {event.goalie.lastName}
                    </p>
                  )}
                </div>

                {/* Running score badge */}
                {runningScore && (
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="bg-foreground text-background text-sm font-black tabular-nums px-2.5 py-1 rounded-md tracking-tight leading-none">
                      {runningScore}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Penalty card ── */
          <div className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
            <div
              className={`h-0.5 ${hasSuspension ? "bg-gradient-to-r from-red-500 to-red-400" : "bg-gradient-to-r from-amber-500 to-amber-400"}`}
            />
            <div className="p-3">
              {/* Action buttons */}
              <div
                className={`absolute top-2 ${isHome ? "left-2" : "right-2"} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className={`flex items-start gap-3 ${isHome ? "flex-row-reverse text-right" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 mb-1 flex-wrap ${isHome ? "justify-end" : ""}`}>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${
                        hasSuspension ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {t("gameReport.penalty")}
                    </span>
                  </div>

                  <p className="font-semibold text-sm leading-tight">
                    {event.penaltyPlayer ? `${event.penaltyPlayer.lastName}, ${event.penaltyPlayer.firstName}` : "—"}
                  </p>

                  <div className={`flex items-center gap-1.5 mt-0.5 flex-wrap ${isHome ? "justify-end" : ""}`}>
                    {event.penaltyType && (
                      <span className="text-xs text-muted-foreground">{event.penaltyType.name}</span>
                    )}
                    {event.penaltyDescription && (
                      <>
                        {event.penaltyType && <span className="text-muted-foreground/40">&middot;</span>}
                        <span className="text-xs text-muted-foreground italic">{event.penaltyDescription}</span>
                      </>
                    )}
                  </div>

                  {hasSuspension && (
                    <div className={`mt-1.5 ${isHome ? "flex justify-end" : ""}`}>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                        <ShieldBan className="w-3 h-3" />
                        {t("gameReport.suspensionBadge", {
                          games: event.suspension?.suspendedGames.toString(),
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Duration badge */}
                {event.penaltyMinutes != null && (
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={`text-sm font-bold tabular-nums px-2.5 py-1 rounded-md leading-none ${
                        hasSuspension
                          ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {event.penaltyMinutes}'
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

export { TimelineEvent }
