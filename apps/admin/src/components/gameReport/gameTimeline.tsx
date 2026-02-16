import { Button, toast } from "@puckhub/ui"
import { CircleDot, Clock, ShieldBan } from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { useTranslation } from "~/i18n/use-translation"
import { GoalDialog } from "./goalDialog"
import { PenaltyDialog } from "./penaltyDialog"
import { SuspensionDialog } from "./suspensionDialog"
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
}

const periodNames: Record<number, string> = {
  1: "1. Drittel",
  2: "2. Drittel",
  3: "3. Drittel",
  4: "Verlängerung",
  5: "Penaltyschießen",
}

function GameTimeline({
  gameId,
  homeTeam,
  awayTeam,
  events,
  lineups,
  penaltyTypes,
  readOnly,
}: GameTimelineProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false)
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [editingPenalty, setEditingPenalty] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)

  const deleteEvent = trpc.gameReport.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.eventDeleted"))
      utils.gameReport.getReport.invalidate({ gameId })
      setDeleteTarget(null)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  // Group events by period and compute running score
  const { periods, runningScores } = useMemo(() => {
    const grouped: Record<number, any[]> = {}
    const scores: Record<string, string> = {}
    let homeGoals = 0
    let awayGoals = 0

    for (const event of events) {
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
  }, [events, homeTeam.id])

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
      {/* Action buttons — top right */}
      {!readOnly && (
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            onClick={() => {
              setEditingGoal(null)
              setGoalDialogOpen(true)
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
              setPenaltyDialogOpen(true)
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            {t("gameReport.addPenaltyBtn")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => setSuspensionDialogOpen(true)}
          >
            <ShieldBan className="w-3.5 h-3.5" />
            {t("gameReport.addSuspensionBtn")}
          </Button>
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
                        setGoalDialogOpen(true)
                      } else {
                        setEditingPenalty(event)
                        setPenaltyDialogOpen(true)
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
      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={(o) => {
          setGoalDialogOpen(o)
          if (!o) setEditingGoal(null)
        }}
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        lineups={lineupPlayers}
        editingEvent={editingGoal}
      />

      <PenaltyDialog
        open={penaltyDialogOpen}
        onOpenChange={(o) => {
          setPenaltyDialogOpen(o)
          if (!o) setEditingPenalty(null)
        }}
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        lineups={lineupPlayers}
        penaltyTypes={penaltyTypes}
        editingEvent={editingPenalty}
      />

      <SuspensionDialog
        open={suspensionDialogOpen}
        onOpenChange={setSuspensionDialogOpen}
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
}

export { GameTimeline }
