import { Button, Dialog, DialogClose, DialogContent, DialogFooter, FormField, Input, toast } from "@puckhub/ui"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"

interface LineupPlayer {
  playerId: string
  teamId: string
  position: string
  jerseyNumber: number | null
  player: { firstName: string; lastName: string }
}

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  lineups: LineupPlayer[]
  editingEvent?: {
    id: string
    teamId: string
    period: number
    timeMinutes: number
    timeSeconds: number
    scorerId: string | null
    assist1Id: string | null
    assist2Id: string | null
    goalieId: string | null
  } | null
}

const selectClass =
  'w-full h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10'

function GoalDialog({
  open,
  onOpenChange,
  gameId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  lineups,
  editingEvent,
}: GoalDialogProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const isEdit = !!editingEvent

  const [teamId, setTeamId] = useState(editingEvent?.teamId ?? homeTeamId)
  const [period, setPeriod] = useState(editingEvent?.period ?? 1)
  const [minutes, setMinutes] = useState(editingEvent?.timeMinutes ?? 0)
  const [seconds, setSeconds] = useState(editingEvent?.timeSeconds ?? 0)
  const [scorerId, setScorerId] = useState(editingEvent?.scorerId ?? "")
  const [assist1Id, setAssist1Id] = useState(editingEvent?.assist1Id ?? "")
  const [assist2Id, setAssist2Id] = useState(editingEvent?.assist2Id ?? "")
  const [goalieId, setGoalieId] = useState(editingEvent?.goalieId ?? "")

  // Reset form state when dialog opens with new data
  useEffect(() => {
    if (open) {
      setTeamId(editingEvent?.teamId ?? homeTeamId)
      setPeriod(editingEvent?.period ?? 1)
      setMinutes(editingEvent?.timeMinutes ?? 0)
      setSeconds(editingEvent?.timeSeconds ?? 0)
      setScorerId(editingEvent?.scorerId ?? "")
      setAssist1Id(editingEvent?.assist1Id ?? "")
      setAssist2Id(editingEvent?.assist2Id ?? "")
      setGoalieId(editingEvent?.goalieId ?? "")
    }
  }, [open, editingEvent, homeTeamId])

  const addEvent = trpc.gameReport.addEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.goalAdded"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  const updateEvent = trpc.gameReport.updateEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.goalUpdated"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  const isPending = addEvent.isPending || updateEvent.isPending

  const teamPlayers = lineups.filter((l) => l.teamId === teamId)
  const opposingTeamId = teamId === homeTeamId ? awayTeamId : homeTeamId
  const opposingGoalies = lineups.filter((l) => l.teamId === opposingTeamId && l.position === "goalie")

  const playerLabel = (p: LineupPlayer) =>
    `${p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}${p.player.lastName}, ${p.player.firstName}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scorerId) return

    const data = {
      teamId,
      period,
      timeMinutes: minutes,
      timeSeconds: seconds,
      scorerId: scorerId || undefined,
      assist1Id: assist1Id || undefined,
      assist2Id: assist2Id || undefined,
      goalieId: goalieId || undefined,
    }

    if (isEdit) {
      updateEvent.mutate({ id: editingEvent.id, ...data })
    } else {
      addEvent.mutate({ gameId, eventType: "goal", ...data })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogClose onClick={() => onOpenChange(false)} />

        {/* Header with green accent */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {isEdit ? t("gameReport.editGoal") : t("gameReport.addGoal")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-5">{t("gameReport.goalDescription")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Period + Time row */}
            <div className="grid grid-cols-3 gap-3">
              <FormField label={t("gameReport.fields.period")}>
                <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className={selectClass}>
                  <option value={1}>1. {t("gameReport.period")}</option>
                  <option value={2}>2. {t("gameReport.period")}</option>
                  <option value={3}>3. {t("gameReport.period")}</option>
                  <option value={4}>{t("gameReport.overtime")}</option>
                </select>
              </FormField>
              <FormField label={t("gameReport.fields.minutes")}>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </FormField>
              <FormField label={t("gameReport.fields.seconds")}>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                />
              </FormField>
            </div>

            {/* Team toggle */}
            <FormField label={t("gameReport.fields.team")}>
              <div className="grid grid-cols-2 gap-0 rounded-lg border border-input p-1 bg-muted/50">
                <button
                  type="button"
                  onClick={() => setTeamId(homeTeamId)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    teamId === homeTeamId
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {homeTeamName}
                </button>
                <button
                  type="button"
                  onClick={() => setTeamId(awayTeamId)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    teamId === awayTeamId
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {awayTeamName}
                </button>
              </div>
            </FormField>

            <div className="border-t border-border/60" />

            {/* Scorer */}
            <FormField label={t("gameReport.fields.scorer")} required>
              <select value={scorerId} onChange={(e) => setScorerId(e.target.value)} className={selectClass} required>
                <option value="">{t("gameReport.selectPlayer")}</option>
                {teamPlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {playerLabel(p)}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Assists side by side */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={`${t("gameReport.fields.assist")} 1`}>
                <select value={assist1Id} onChange={(e) => setAssist1Id(e.target.value)} className={selectClass}>
                  <option value="">—</option>
                  {teamPlayers
                    .filter((p) => p.playerId !== scorerId)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {playerLabel(p)}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label={`${t("gameReport.fields.assist")} 2`}>
                <select value={assist2Id} onChange={(e) => setAssist2Id(e.target.value)} className={selectClass}>
                  <option value="">—</option>
                  {teamPlayers
                    .filter((p) => p.playerId !== scorerId && p.playerId !== assist1Id)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {playerLabel(p)}
                      </option>
                    ))}
                </select>
              </FormField>
            </div>

            {/* Goalie */}
            <FormField label={t("gameReport.fields.goalie")}>
              <select value={goalieId} onChange={(e) => setGoalieId(e.target.value)} className={selectClass}>
                <option value="">—</option>
                {opposingGoalies.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {playerLabel(p)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !scorerId}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { GoalDialog }
