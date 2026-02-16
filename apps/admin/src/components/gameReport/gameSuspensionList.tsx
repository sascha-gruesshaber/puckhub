import { Button, Dialog, DialogClose, DialogContent, DialogFooter, FormField, Input, toast } from "@puckhub/ui"
import { Link2, Pencil, ShieldBan, Trash2, Unlink } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { useTranslation } from "~/i18n/use-translation"

interface GameSuspension {
  id: string
  playerId: string
  teamId: string
  suspensionType: string
  suspendedGames: number
  servedGames: number
  reason: string | null
  player: { id: string; firstName: string; lastName: string }
  team: { name: string; shortName: string }
  gameEvent: { id: string; period: number; timeMinutes: number; timeSeconds: number } | null
}

interface GameSuspensionListProps {
  gameId: string
  suspensions: GameSuspension[]
  homeTeamId: string
  readOnly?: boolean
}

const suspensionTypeLabels: Record<string, { de: string; en: string }> = {
  match_penalty: { de: "Matchstrafe", en: "Match penalty" },
  game_misconduct: { de: "Spieldauer-Disziplinarstrafe", en: "Game misconduct" },
}

const selectClass =
  'w-full h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10'

function EditSuspensionDialog({
  open,
  onOpenChange,
  gameId,
  suspension,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  suspension: GameSuspension | null
}) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const [suspensionType, setSuspensionType] = useState<"match_penalty" | "game_misconduct">("match_penalty")
  const [suspendedGames, setSuspendedGames] = useState(1)
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (open && suspension) {
      setSuspensionType(suspension.suspensionType as "match_penalty" | "game_misconduct")
      setSuspendedGames(suspension.suspendedGames)
      setReason(suspension.reason ?? "")
    }
  }, [open, suspension])

  const updateSuspension = trpc.gameReport.updateSuspension.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.suspensionUpdated"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!suspension) return

    updateSuspension.mutate({
      id: suspension.id,
      suspensionType,
      suspendedGames,
      reason: reason || null,
    })
  }

  if (!suspension) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-500/20" />
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {t("gameReport.gameSuspensions.editTitle")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-5">
            {suspension.player.lastName}, {suspension.player.firstName} — {suspension.team.shortName}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            <FormField label={t("gameReport.fields.suspensionType")}>
              <select
                value={suspensionType}
                onChange={(e) => setSuspensionType(e.target.value as "match_penalty" | "game_misconduct")}
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
              <FormField label={t("gameReport.fields.reason")}>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </FormField>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={updateSuspension.isPending}>
              {updateSuspension.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GameSuspensionList({ gameId, suspensions, homeTeamId, readOnly }: GameSuspensionListProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const [editingSuspension, setEditingSuspension] = useState<GameSuspension | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GameSuspension | null>(null)

  const deleteSuspension = trpc.gameReport.deleteSuspension.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.suspensionDeleted"))
      utils.gameReport.getReport.invalidate({ gameId })
      setDeleteTarget(null)
    },
    onError: () => toast.error(t("gameReport.toast.error")),
  })

  if (suspensions.length === 0) return null

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/30">
          <ShieldBan className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-foreground">{t("gameReport.gameSuspensions.title")}</h3>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{suspensions.length}</span>
        </div>

        {/* Suspension rows */}
        <div className="divide-y divide-border/60">
          {suspensions.map((s) => {
            const isHome = s.teamId === homeTeamId
            const typeLabel = suspensionTypeLabels[s.suspensionType]?.de ?? s.suspensionType
            const hasEvent = !!s.gameEvent
            const eventTime = hasEvent
              ? `${String(s.gameEvent!.timeMinutes).padStart(2, "0")}:${String(s.gameEvent!.timeSeconds).padStart(2, "0")}`
              : null

            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 group">
                {/* Team indicator */}
                <div
                  className={`w-1 h-8 rounded-full flex-shrink-0 ${isHome ? "bg-blue-400 dark:bg-blue-500" : "bg-slate-400 dark:bg-slate-500"}`}
                />

                {/* Player + details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {s.player.lastName}, {s.player.firstName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">({s.team.shortName})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{typeLabel}</span>
                    <span className="text-muted-foreground/40">&middot;</span>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      {t("gameReport.gameSuspensions.games", { count: s.suspendedGames })}
                    </span>
                    {s.reason && (
                      <>
                        <span className="text-muted-foreground/40">&middot;</span>
                        <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">{s.reason}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Linked/standalone badge */}
                <div className="flex-shrink-0">
                  {hasEvent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      <Link2 className="w-3 h-3" />
                      {eventTime}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      <Unlink className="w-3 h-3" />
                      {t("gameReport.gameSuspensions.standalone")}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingSuspension(s)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit dialog */}
      <EditSuspensionDialog
        open={!!editingSuspension}
        onOpenChange={(o) => !o && setEditingSuspension(null)}
        gameId={gameId}
        suspension={editingSuspension}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("gameReport.gameSuspensions.deleteTitle")}
        description={t("gameReport.gameSuspensions.deleteDescription")}
        confirmLabel={t("gameReport.deleteEventConfirm")}
        onConfirm={() => deleteTarget && deleteSuspension.mutate({ id: deleteTarget.id })}
        isPending={deleteSuspension.isPending}
        variant="destructive"
      />
    </>
  )
}

export { GameSuspensionList }
