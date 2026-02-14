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

interface SuspensionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  lineups: LineupPlayer[]
}

const selectClass =
  'w-full h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10'

function SuspensionDialog({
  open,
  onOpenChange,
  gameId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  lineups,
}: SuspensionDialogProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const [teamId, setTeamId] = useState(homeTeamId)
  const [playerId, setPlayerId] = useState("")
  const [suspensionType, setSuspensionType] = useState<"match_penalty" | "game_misconduct">("match_penalty")
  const [suspendedGames, setSuspendedGames] = useState(1)
  const [reason, setReason] = useState("")

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setTeamId(homeTeamId)
      setPlayerId("")
      setSuspensionType("match_penalty")
      setSuspendedGames(1)
      setReason("")
    }
  }, [open, homeTeamId])

  const addSuspension = trpc.gameReport.addSuspension.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.suspensionAdded"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  const teamPlayers = lineups.filter((l) => l.teamId === teamId)

  const playerLabel = (p: LineupPlayer) =>
    `${p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}${p.player.lastName}, ${p.player.firstName}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return

    addSuspension.mutate({
      gameId,
      playerId,
      teamId,
      suspensionType,
      suspendedGames,
      reason: reason || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />

        {/* Header with red accent */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-500/20" />
            <h2 className="text-lg font-semibold leading-none tracking-tight">{t("gameReport.addSuspension")}</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-5">{t("gameReport.suspensionDescription")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Team toggle */}
            <FormField label={t("gameReport.fields.team")}>
              <div className="grid grid-cols-2 gap-0 rounded-lg border border-input p-1 bg-muted/50">
                <button
                  type="button"
                  onClick={() => {
                    setTeamId(homeTeamId)
                    setPlayerId("")
                  }}
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
                  onClick={() => {
                    setTeamId(awayTeamId)
                    setPlayerId("")
                  }}
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

            {/* Player */}
            <FormField label={t("gameReport.fields.player")} required>
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={selectClass} required>
                <option value="">{t("gameReport.selectPlayer")}</option>
                {teamPlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {playerLabel(p)}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="border-t border-border/60" />

            {/* Suspension type */}
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

            {/* Games + Reason */}
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <FormField label={t("gameReport.fields.suspendedGames")}>
                <Input
                  type="number"
                  min={1}
                  value={suspendedGames}
                  onChange={(e) => setSuspendedGames(Number(e.target.value))}
                />
              </FormField>
              <FormField label={t("gameReport.fields.reason")}>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("gameReport.fields.reasonPlaceholder")}
                />
              </FormField>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={addSuspension.isPending || !playerId}>
              {addSuspension.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { SuspensionDialog }
