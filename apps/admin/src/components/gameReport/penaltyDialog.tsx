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

interface PenaltyType {
  id: string
  code: string
  name: string
  shortName: string
  defaultMinutes: number
}

interface PenaltyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  lineups: LineupPlayer[]
  penaltyTypes: PenaltyType[]
  editingEvent?: {
    id: string
    teamId: string
    period: number
    timeMinutes: number
    timeSeconds: number
    penaltyPlayerId: string | null
    penaltyTypeId: string | null
    penaltyMinutes: number | null
    penaltyDescription: string | null
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

function PenaltyDialog({
  open,
  onOpenChange,
  gameId,
  homeTeam,
  awayTeam,
  lineups,
  penaltyTypes,
  editingEvent,
}: PenaltyDialogProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const isEdit = !!editingEvent

  const [teamId, setTeamId] = useState(editingEvent?.teamId ?? homeTeam.id)
  const [period, setPeriod] = useState(editingEvent?.period ?? 1)
  const [minutes, setMinutes] = useState(editingEvent?.timeMinutes ?? 0)
  const [seconds, setSeconds] = useState(editingEvent?.timeSeconds ?? 0)
  const [playerId, setPlayerId] = useState(editingEvent?.penaltyPlayerId ?? "")
  const [penaltyTypeId, setPenaltyTypeId] = useState(editingEvent?.penaltyTypeId ?? "")
  const [penaltyMinutes, setPenaltyMinutes] = useState(editingEvent?.penaltyMinutes ?? 2)
  const [description, setDescription] = useState(editingEvent?.penaltyDescription ?? "")
  const [hasSuspension, setHasSuspension] = useState(false)
  const [suspensionType, setSuspensionType] = useState<"match_penalty" | "game_misconduct">("match_penalty")
  const [suspendedGames, setSuspendedGames] = useState(1)
  const [suspensionReason, setSuspensionReason] = useState("")

  // Reset form state when dialog opens with new data
  useEffect(() => {
    if (open) {
      setTeamId(editingEvent?.teamId ?? homeTeam.id)
      setPeriod(editingEvent?.period ?? 1)
      setMinutes(editingEvent?.timeMinutes ?? 0)
      setSeconds(editingEvent?.timeSeconds ?? 0)
      setPlayerId(editingEvent?.penaltyPlayerId ?? "")
      setPenaltyTypeId(editingEvent?.penaltyTypeId ?? "")
      setPenaltyMinutes(editingEvent?.penaltyMinutes ?? 2)
      setDescription(editingEvent?.penaltyDescription ?? "")
      setHasSuspension(false)
      setSuspensionType("match_penalty")
      setSuspendedGames(1)
      setSuspensionReason("")
    }
  }, [open, editingEvent, homeTeam.id])

  const addEvent = trpc.gameReport.addEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.penaltyAdded"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  const updateEvent = trpc.gameReport.updateEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.penaltyUpdated"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  const isPending = addEvent.isPending || updateEvent.isPending

  const teamPlayers = lineups.filter((l) => l.teamId === teamId)

  const playerOptions = useMemo(
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

  const handlePenaltyTypeChange = (typeId: string) => {
    setPenaltyTypeId(typeId)
    const pt = penaltyTypes.find((p) => p.id === typeId)
    if (pt) {
      setPenaltyMinutes(pt.defaultMinutes)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return

    if (isEdit) {
      updateEvent.mutate({
        id: editingEvent.id,
        teamId,
        period,
        timeMinutes: minutes,
        timeSeconds: seconds,
        penaltyPlayerId: playerId || null,
        penaltyTypeId: penaltyTypeId || null,
        penaltyMinutes: penaltyMinutes,
        penaltyDescription: description || null,
      })
    } else {
      addEvent.mutate({
        gameId,
        eventType: "penalty",
        teamId,
        period,
        timeMinutes: minutes,
        timeSeconds: seconds,
        penaltyPlayerId: playerId || undefined,
        penaltyTypeId: penaltyTypeId || undefined,
        penaltyMinutes,
        penaltyDescription: description || undefined,
        suspension: hasSuspension
          ? {
              suspensionType,
              suspendedGames,
              reason: suspensionReason || undefined,
            }
          : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />

        {/* Header with amber accent */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {isEdit ? t("gameReport.editPenalty") : t("gameReport.addPenalty")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-5">{t("gameReport.penaltyDescription")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Period + Time */}
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

            {/* Player */}
            <FormField label={t("gameReport.fields.player")} required>
              <PlayerCombobox
                players={playerOptions}
                value={playerId}
                onChange={setPlayerId}
                placeholder={t("gameReport.selectPlayer")}
              />
            </FormField>

            <div className="border-t border-border/60" />

            {/* Penalty type */}
            <FormField label={t("gameReport.fields.penaltyType")}>
              <select
                value={penaltyTypeId}
                onChange={(e) => handlePenaltyTypeChange(e.target.value)}
                className={selectClass}
              >
                <option value="">—</option>
                {penaltyTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} ({pt.defaultMinutes} min)
                  </option>
                ))}
              </select>
            </FormField>

            {/* Duration + Reason */}
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <FormField label={t("gameReport.fields.duration")}>
                <Input
                  type="number"
                  min={0}
                  value={penaltyMinutes}
                  onChange={(e) => setPenaltyMinutes(Number(e.target.value))}
                />
              </FormField>
              <FormField label={t("gameReport.fields.reason")}>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("gameReport.fields.reasonPlaceholder")}
                />
              </FormField>
            </div>

            {/* Suspension section (only on create) */}
            {!isEdit && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasSuspension}
                    onChange={(e) => setHasSuspension(e.target.checked)}
                    className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    {t("gameReport.fields.addSuspension")}
                  </span>
                </label>

                {hasSuspension && (
                  <div className="px-4 py-4 space-y-4 border-t border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
                    <FormField label={t("gameReport.fields.suspensionType")}>
                      <select
                        value={suspensionType}
                        onChange={(e) => setSuspensionType(e.target.value as any)}
                        className={selectClass}
                      >
                        <option value="match_penalty">{t("gameReport.suspensionTypes.matchPenalty")}</option>
                        <option value="game_misconduct">{t("gameReport.suspensionTypes.gameMisconduct")}</option>
                      </select>
                    </FormField>
                    <div className="grid grid-cols-[120px_1fr] gap-3">
                      <FormField label={t("gameReport.fields.suspendedGames")}>
                        <Input
                          type="number"
                          min={1}
                          value={suspendedGames}
                          onChange={(e) => setSuspendedGames(Number(e.target.value))}
                        />
                      </FormField>
                      <FormField label={t("gameReport.fields.suspensionComment")}>
                        <Input value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} />
                      </FormField>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !playerId}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { PenaltyDialog }
