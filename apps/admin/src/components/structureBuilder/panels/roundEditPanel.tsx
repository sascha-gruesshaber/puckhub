import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@puckhub/ui"
import { AlertTriangle, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { type RoundType, roundTypeMap } from "../utils/roundTypeColors"

interface RoundEditPanelProps {
  roundId: string
  name: string
  roundType: string
  pointsWin: number
  pointsDraw: number
  pointsLoss: number
  countsForPlayerStats: boolean
  countsForGoalieStats: boolean
  onInvalidate: () => void
}

const roundTypes = Object.entries(roundTypeMap) as [RoundType, { labelKey: string }][]

export function RoundEditPanel({
  roundId,
  name,
  roundType,
  pointsWin,
  pointsDraw,
  pointsLoss,
  countsForPlayerStats,
  countsForGoalieStats,
  onInvalidate,
}: RoundEditPanelProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [editName, setEditName] = useState(name)
  const [editType, setEditType] = useState(roundType)
  const [editWin, setEditWin] = useState(String(pointsWin))
  const [editDraw, setEditDraw] = useState(String(pointsDraw))
  const [editLoss, setEditLoss] = useState(String(pointsLoss))
  const [editPlayerStats, setEditPlayerStats] = useState(countsForPlayerStats)
  const [editGoalieStats, setEditGoalieStats] = useState(countsForGoalieStats)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    setEditName(name)
    setEditType(roundType)
    setEditWin(String(pointsWin))
    setEditDraw(String(pointsDraw))
    setEditLoss(String(pointsLoss))
    setEditPlayerStats(countsForPlayerStats)
    setEditGoalieStats(countsForGoalieStats)
  }, [name, roundType, pointsWin, pointsDraw, pointsLoss, countsForPlayerStats, countsForGoalieStats])

  const updateMutation = trpc.round.update.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.roundUpdated"))
    },
    onError: (err) =>
      toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const deleteMutation = trpc.round.delete.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.roundDeleted"))
    },
    onError: (err) =>
      toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  function handleSave() {
    if (!editName.trim()) return
    updateMutation.mutate({
      id: roundId,
      name: editName.trim(),
      roundType: editType as RoundType,
      pointsWin: Number(editWin) || 0,
      pointsDraw: Number(editDraw) || 0,
      pointsLoss: Number(editLoss) || 0,
      countsForPlayerStats: editPlayerStats,
      countsForGoalieStats: editGoalieStats,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("seasonStructure.roundPanel.title")}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="round-edit-name" className="text-[11px] font-medium text-muted-foreground">
          {t("seasonStructure.fields.name")}
        </label>
        <Input
          id="round-edit-name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 text-xs bg-card border-border text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">{t("seasonStructure.fields.roundType")}</p>
        <Select value={editType} onValueChange={(v) => setEditType(v)}>
          <SelectTrigger className="h-8 text-xs bg-card border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roundTypes.map(([value, { labelKey }]) => (
              <SelectItem key={value} value={value}>
                {t(labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">{t("seasonStructure.fields.points")}</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-gray-500 mb-1">{t("seasonStructure.points.win")}</div>
            <Input
              type="number"
              value={editWin}
              onChange={(e) => setEditWin(e.target.value)}
              className="h-8 text-xs bg-card border-border text-foreground text-center"
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">{t("seasonStructure.points.draw")}</div>
            <Input
              type="number"
              value={editDraw}
              onChange={(e) => setEditDraw(e.target.value)}
              className="h-8 text-xs bg-card border-border text-foreground text-center"
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">{t("seasonStructure.points.loss")}</div>
            <Input
              type="number"
              value={editLoss}
              onChange={(e) => setEditLoss(e.target.value)}
              className="h-8 text-xs bg-card border-border text-foreground text-center"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">{t("seasonStructure.fields.statistics")}</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editPlayerStats}
              onChange={(e) => setEditPlayerStats(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#F4D35E] focus:ring-[#F4D35E]/40"
            />
            <span className="text-[11px] text-muted-foreground">{t("seasonStructure.stats.playerStats")}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editGoalieStats}
              onChange={(e) => setEditGoalieStats(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#F4D35E] focus:ring-[#F4D35E]/40"
            />
            <span className="text-[11px] text-muted-foreground">{t("seasonStructure.stats.goalieStats")}</span>
          </label>
        </div>
      </div>

      <Button
        variant="accent"
        size="sm"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="text-xs h-8"
      >
        {updateMutation.isPending ? t("saving") : t("save")}
      </Button>

      <div className="border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleteMutation.isPending}
          className="text-xs h-8 text-red-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.roundPanel.deleteRound")}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("seasonStructure.confirmDelete.roundTitle")}
        description={
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-sm text-red-400">{t("seasonStructure.confirmDelete.roundWarning")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("seasonStructure.confirmDelete.roundDescription", { name: editName })}
            </p>
          </div>
        }
        confirmLabel={t("seasonStructure.confirmDelete.confirmDelete")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          deleteMutation.mutate({ id: roundId })
          setDeleteDialogOpen(false)
        }}
        isPending={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  )
}
