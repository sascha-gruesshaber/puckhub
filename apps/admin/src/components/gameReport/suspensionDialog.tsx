import { Button, Dialog, DialogClose, DialogContent, DialogFooter, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@puckhub/ui"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { PlayerCombobox } from "~/components/playerCombobox"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { useTranslation } from "~/i18n/use-translation"
import type { TeamInfo } from "./gameTimeline"

interface LineupPlayer {
  playerId: string
  teamId: string
  position: string
  jerseyNumber: number | null
  player: { firstName: string; lastName: string; photoUrl?: string | null }
}

interface SuspensionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  lineups: LineupPlayer[]
}

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

function SuspensionDialog({ open, onOpenChange, gameId, homeTeam, awayTeam, lineups }: SuspensionDialogProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()

  const [teamId, setTeamId] = useState(homeTeam.id)
  const [playerId, setPlayerId] = useState("")
  const [suspensionType, setSuspensionType] = useState<"match_penalty" | "game_misconduct">("match_penalty")
  const [suspendedGames, setSuspendedGames] = useState(1)
  const [reason, setReason] = useState("")

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setTeamId(homeTeam.id)
      setPlayerId("")
      setSuspensionType("match_penalty")
      setSuspendedGames(1)
      setReason("")
    }
  }, [open, homeTeam.id])

  const addSuspension = trpc.gameReport.addSuspension.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.suspensionAdded"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: (err) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

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
                <TeamToggleButton
                  team={homeTeam}
                  isSelected={teamId === homeTeam.id}
                  onClick={() => {
                    setTeamId(homeTeam.id)
                    setPlayerId("")
                  }}
                />
                <TeamToggleButton
                  team={awayTeam}
                  isSelected={teamId === awayTeam.id}
                  onClick={() => {
                    setTeamId(awayTeam.id)
                    setPlayerId("")
                  }}
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

            {/* Suspension type */}
            <FormField label={t("gameReport.fields.suspensionType")}>
              <Select value={suspensionType} onValueChange={(v) => setSuspensionType(v as "match_penalty" | "game_misconduct")}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_penalty">{t("gameReport.suspensionTypes.matchPenalty")}</SelectItem>
                  <SelectItem value="game_misconduct">{t("gameReport.suspensionTypes.gameMisconduct")}</SelectItem>
                </SelectContent>
              </Select>
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
