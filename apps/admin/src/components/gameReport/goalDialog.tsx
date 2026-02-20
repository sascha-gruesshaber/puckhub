import { Button, Dialog, DialogClose, DialogContent, DialogFooter, FormField, Input, toast } from "@puckhub/ui"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { PlayerCombobox } from "~/components/playerCombobox"
import { useTranslation } from "~/i18n/use-translation"
import type { TeamInfo } from "./gameTimeline"

interface LineupPlayer {
  playerId: string
  teamId: string
  position: string
  jerseyNumber: number | null
  player: { firstName: string; lastName: string; photoUrl?: string | null }
}

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
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

function TeamToggleButton({ team, isSelected, onClick }: { team: TeamInfo; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all ${
        isSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="w-7 h-7 rounded shrink-0 overflow-hidden flex items-center justify-center bg-muted/50 border border-border/40">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground">{team.shortName}</span>
        )}
      </div>
      <div className="min-w-0 text-left">
        <div className="text-xs font-bold tracking-wide uppercase truncate">{team.shortName}</div>
        <div className="text-[11px] text-muted-foreground truncate leading-tight">{team.name}</div>
      </div>
    </button>
  )
}

function GoalDialog({ open, onOpenChange, gameId, homeTeam, awayTeam, lineups, editingEvent }: GoalDialogProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const isEdit = !!editingEvent

  const [teamId, setTeamId] = useState(editingEvent?.teamId ?? homeTeam.id)
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
      setTeamId(editingEvent?.teamId ?? homeTeam.id)
      setPeriod(editingEvent?.period ?? 1)
      setMinutes(editingEvent?.timeMinutes ?? 0)
      setSeconds(editingEvent?.timeSeconds ?? 0)
      setScorerId(editingEvent?.scorerId ?? "")
      setAssist1Id(editingEvent?.assist1Id ?? "")
      setAssist2Id(editingEvent?.assist2Id ?? "")
      setGoalieId(editingEvent?.goalieId ?? "")
    }
  }, [open, editingEvent, homeTeam.id])

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
  const opposingTeamId = teamId === homeTeam.id ? awayTeam.id : homeTeam.id
  const opposingGoalies = lineups.filter((l) => l.teamId === opposingTeamId && l.position === "goalie")

  // Map lineup players to PlayerCombobox format
  const scorerOptions = useMemo(
    () =>
      teamPlayers.map((l) => ({
        id: l.playerId,
        firstName: l.player.firstName,
        lastName: l.player.lastName,
        photoUrl: l.player.photoUrl,
        jerseyNumber: l.jerseyNumber,
      })),
    [teamPlayers],
  )

  const assist1Options = useMemo(
    () =>
      teamPlayers
        .filter((p) => p.playerId !== scorerId)
        .map((l) => ({
          id: l.playerId,
          firstName: l.player.firstName,
          lastName: l.player.lastName,
          photoUrl: l.player.photoUrl,
          jerseyNumber: l.jerseyNumber,
        })),
    [teamPlayers, scorerId],
  )

  const assist2Options = useMemo(
    () =>
      teamPlayers
        .filter((p) => p.playerId !== scorerId && p.playerId !== assist1Id)
        .map((l) => ({
          id: l.playerId,
          firstName: l.player.firstName,
          lastName: l.player.lastName,
          photoUrl: l.player.photoUrl,
          jerseyNumber: l.jerseyNumber,
        })),
    [teamPlayers, scorerId, assist1Id],
  )

  const goalieOptions = useMemo(
    () =>
      opposingGoalies.map((l) => ({
        id: l.playerId,
        firstName: l.player.firstName,
        lastName: l.player.lastName,
        photoUrl: l.player.photoUrl,
        jerseyNumber: l.jerseyNumber,
      })),
    [opposingGoalies],
  )

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
                <TeamToggleButton
                  team={homeTeam}
                  isSelected={teamId === homeTeam.id}
                  onClick={() => setTeamId(homeTeam.id)}
                />
                <TeamToggleButton
                  team={awayTeam}
                  isSelected={teamId === awayTeam.id}
                  onClick={() => setTeamId(awayTeam.id)}
                />
              </div>
            </FormField>

            <div className="border-t border-border/60" />

            {/* Scorer */}
            <FormField label={t("gameReport.fields.scorer")} required>
              <PlayerCombobox
                players={scorerOptions}
                value={scorerId}
                onChange={setScorerId}
                placeholder={t("gameReport.selectPlayer")}
              />
            </FormField>

            {/* Assists side by side */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={`${t("gameReport.fields.assist")} 1`}>
                <PlayerCombobox players={assist1Options} value={assist1Id} onChange={setAssist1Id} placeholder="—" />
              </FormField>
              <FormField label={`${t("gameReport.fields.assist")} 2`}>
                <PlayerCombobox players={assist2Options} value={assist2Id} onChange={setAssist2Id} placeholder="—" />
              </FormField>
            </div>

            {/* Goalie */}
            <FormField label={t("gameReport.fields.goalie")}>
              <PlayerCombobox players={goalieOptions} value={goalieId} onChange={setGoalieId} placeholder="—" />
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
