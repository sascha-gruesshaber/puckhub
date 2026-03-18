import { Button, toast } from "@puckhub/ui"
import { CircleDot, Clock, EyeOff, Pencil, ShieldBan, StickyNote, Trash2 } from "lucide-react"
import { forwardRef, useImperativeHandle, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { GoalSheet } from "./goalSheet"
import { NoteSheet } from "./noteSheet"
import { PenaltySheet } from "./penaltySheet"
import { SuspensionSheet } from "./suspensionSheet"
import { TimelineEvent } from "./timelineEvent"
import "./gameTimeline.css"

export interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
  primaryColor: string | null
}

interface GameTimelineProps {
  gameId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  events: any[]
  lineups: any[]
  penaltyTypes: any[]
  readOnly?: boolean
  /** When true, action buttons are not rendered inline (caller renders them externally) */
  externalActions?: boolean
}

export interface GameTimelineHandle {
  openGoalSheet: () => void
  openPenaltySheet: () => void
  openSuspensionSheet: () => void
  openNoteSheet: () => void
}

const periodNames: Record<number, string> = {
  1: "1. Drittel",
  2: "2. Drittel",
  3: "3. Drittel",
  4: "Verlängerung",
  5: "Penaltyschießen",
}

const GameTimeline = forwardRef<GameTimelineHandle, GameTimelineProps>(function GameTimeline(
  { gameId, homeTeam, awayTeam, events, lineups, penaltyTypes, readOnly, externalActions },
  ref,
) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()

  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [penaltySheetOpen, setPenaltySheetOpen] = useState(false)
  const [suspensionSheetOpen, setSuspensionSheetOpen] = useState(false)
  const [noteSheetOpen, setNoteSheetOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    openGoalSheet: () => {
      setEditingGoal(null)
      setGoalSheetOpen(true)
    },
    openPenaltySheet: () => {
      setEditingPenalty(null)
      setPenaltySheetOpen(true)
    },
    openSuspensionSheet: () => setSuspensionSheetOpen(true),
    openNoteSheet: () => {
      setEditingNote(null)
      setNoteSheetOpen(true)
    },
  }))

  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [editingPenalty, setEditingPenalty] = useState<any>(null)
  const [editingNote, setEditingNote] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)

  const deleteEvent = trpc.gameReport.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.eventDeleted"))
      utils.gameReport.getReport.invalidate({ gameId })
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  // Separate game-wide notes (period === null) from timeline events
  const { gameWideNotes, timelineEvents } = useMemo(() => {
    const gw: any[] = []
    const tl: any[] = []
    for (const event of events) {
      if (event.eventType === "note" && event.period == null) {
        gw.push(event)
      } else {
        tl.push(event)
      }
    }
    return { gameWideNotes: gw, timelineEvents: tl }
  }, [events])

  // Group events by period and compute running score
  const { periods, runningScores } = useMemo(() => {
    const grouped: Record<number, any[]> = {}
    const scores: Record<string, string> = {}
    let homeGoals = 0
    let awayGoals = 0

    for (const event of timelineEvents) {
      const p = event.period
      if (!grouped[p]) grouped[p] = []
      grouped[p].push(event)

      if (event.eventType === "goal") {
        if (event.teamId === homeTeam.id) homeGoals++
        else awayGoals++
        scores[event.id] = `${homeGoals}:${awayGoals}`
      }
    }

    // Ensure at least periods 1-3 exist as headers
    for (let i = 1; i <= 3; i++) {
      if (!grouped[i]) grouped[i] = []
    }

    return { periods: grouped, runningScores: scores }
  }, [timelineEvents, homeTeam.id])

  const sortedPeriods = Object.keys(periods)
    .map(Number)
    .sort((a, b) => a - b)

  const lineupPlayers = lineups.map((l: any) => ({
    playerId: l.playerId,
    teamId: l.teamId,
    position: l.position,
    jerseyNumber: l.jerseyNumber,
    player: l.player,
  }))

  return (
    <div>
      {/* Action buttons — top right (hidden when externalActions) */}
      {!readOnly && !externalActions && (
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            onClick={() => {
              setEditingGoal(null)
              setGoalSheetOpen(true)
            }}
          >
            <CircleDot className="w-3.5 h-3.5" />
            {t("gameReport.addGoalBtn")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
            onClick={() => {
              setEditingPenalty(null)
              setPenaltySheetOpen(true)
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            {t("gameReport.addPenaltyBtn")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
            onClick={() => {
              setEditingNote(null)
              setNoteSheetOpen(true)
            }}
          >
            <StickyNote className="w-3.5 h-3.5" />
            {t("gameReport.addNoteBtn")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => setSuspensionSheetOpen(true)}
          >
            <ShieldBan className="w-3.5 h-3.5" />
            {t("gameReport.addSuspensionBtn")}
          </Button>
        </div>
      )}

      {/* Game-wide notes (no period/time) */}
      {gameWideNotes.length > 0 && (
        <div className="mb-4 rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200/50 dark:border-blue-800/50">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              <StickyNote className="w-3.5 h-3.5" />
              {t("gameReport.gameNotes.title")}
            </h4>
          </div>
          <div className="divide-y divide-border/60">
            {gameWideNotes.map((note: any) => (
              <div key={note.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!note.notePublic && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <EyeOff className="w-2.5 h-2.5" />
                        {t("gameReport.notePrivateHint")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.noteText}</p>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNote(note)
                        setNoteSheetOpen(true)
                      }}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: note.id })}
                      className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1">
        {sortedPeriods.map((period) => (
          <div key={period}>
            {/* Period header */}
            <div className="game-timeline-period">
              <div className="game-timeline-period-label">
                <span>{periodNames[period] ?? `${period}. ${t("gameReport.period")}`}</span>
              </div>
            </div>

            {/* Events */}
            {(periods[period] ?? []).length > 0 ? (
              <ol className="game-timeline">
                {(periods[period] ?? []).map((event: any, idx: number) => (
                  <TimelineEvent
                    key={event.id}
                    event={event}
                    runningScore={runningScores[event.id] ?? ""}
                    isHome={event.teamId === homeTeam.id}
                    index={idx}
                    readOnly={readOnly}
                    onEdit={() => {
                      if (event.eventType === "goal") {
                        setEditingGoal(event)
                        setGoalSheetOpen(true)
                      } else if (event.eventType === "note") {
                        setEditingNote(event)
                        setNoteSheetOpen(true)
                      } else {
                        setEditingPenalty(event)
                        setPenaltySheetOpen(true)
                      }
                    }}
                    onDelete={() => setDeleteTarget({ id: event.id })}
                  />
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground/60 py-2 text-center">{t("gameReport.noEvents")}</p>
            )}
          </div>
        ))}
      </div>

      {/* Dialogs */}
      <GoalSheet
        open={goalSheetOpen}
        onOpenChange={(o) => {
          setGoalSheetOpen(o)
          if (!o) setEditingGoal(null)
        }}
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        lineups={lineupPlayers}
        editingEvent={editingGoal}
      />

      <PenaltySheet
        open={penaltySheetOpen}
        onOpenChange={(o) => {
          setPenaltySheetOpen(o)
          if (!o) setEditingPenalty(null)
        }}
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        lineups={lineupPlayers}
        penaltyTypes={penaltyTypes}
        editingEvent={editingPenalty}
      />

      <NoteSheet
        open={noteSheetOpen}
        onOpenChange={(o) => {
          setNoteSheetOpen(o)
          if (!o) setEditingNote(null)
        }}
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        editingEvent={editingNote}
      />

      <SuspensionSheet
        open={suspensionSheetOpen}
        onOpenChange={setSuspensionSheetOpen}
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        lineups={lineupPlayers}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("gameReport.deleteEventTitle")}
        description={t("gameReport.deleteEventDescription")}
        confirmLabel={t("gameReport.deleteEventConfirm")}
        onConfirm={() => deleteTarget && deleteEvent.mutate({ id: deleteTarget.id })}
        isPending={deleteEvent.isPending}
        variant="destructive"
      />
    </div>
  )
})

export { GameTimeline }
