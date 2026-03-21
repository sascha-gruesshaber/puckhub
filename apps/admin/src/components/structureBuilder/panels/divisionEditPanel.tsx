import { Button, Input, toast } from "@puckhub/ui"
import { AlertTriangle, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

interface DivisionEditPanelProps {
  divisionId: string
  name: string
  sortOrder: number
  goalieMinGames: number
  seasonId: string
  onInvalidate: () => void
}

export function DivisionEditPanel({
  divisionId,
  name,
  sortOrder,
  goalieMinGames,
  seasonId: _seasonId,
  onInvalidate,
}: DivisionEditPanelProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [editName, setEditName] = useState(name)
  const [editOrder, setEditOrder] = useState(String(sortOrder))
  const [editGoalieMinGames, setEditGoalieMinGames] = useState(String(goalieMinGames))
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    setEditName(name)
    setEditOrder(String(sortOrder))
    setEditGoalieMinGames(String(goalieMinGames))
  }, [name, sortOrder, goalieMinGames])

  const updateMutation = trpc.division.update.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.divisionUpdated"))
    },
    onError: (err) =>
      toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const deleteMutation = trpc.division.delete.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.divisionDeleted"))
    },
    onError: (err) =>
      toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const createRoundMutation = trpc.round.create.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.roundCreated"))
    },
    onError: (err) =>
      toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  function handleSave() {
    if (!editName.trim()) return
    updateMutation.mutate({
      id: divisionId,
      name: editName.trim(),
      sortOrder: Number(editOrder) || 0,
      goalieMinGames: Number(editGoalieMinGames) || 7,
    })
  }

  function handleAddRound() {
    createRoundMutation.mutate({
      divisionId,
      name: t("seasonStructure.defaults.newRound"),
      roundType: "regular",
      sortOrder: 0,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("seasonStructure.divisionPanel.title")}
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="division-edit-name" className="text-[11px] font-medium text-muted-foreground">
          {t("seasonStructure.fields.name")}
        </label>
        <Input
          id="division-edit-name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 text-xs bg-card border-border text-foreground"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="division-edit-order" className="text-[11px] font-medium text-muted-foreground">
          {t("seasonStructure.fields.sortOrder")}
        </label>
        <Input
          id="division-edit-order"
          type="number"
          value={editOrder}
          onChange={(e) => setEditOrder(e.target.value)}
          className="h-8 text-xs bg-card border-border text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="division-edit-goalie-min-games" className="text-[11px] font-medium text-muted-foreground">
          {t("seasonStructure.fields.goalieMinGames")}
        </label>
        <Input
          id="division-edit-goalie-min-games"
          type="number"
          min={0}
          value={editGoalieMinGames}
          onChange={(e) => setEditGoalieMinGames(e.target.value)}
          className="h-8 text-xs bg-card border-border text-foreground w-20"
        />
        <span className="text-[10px] text-muted-foreground/60">{t("seasonStructure.fields.goalieMinGamesHint")}</span>
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

      <div className="border-t border-border pt-3 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRound}
          disabled={createRoundMutation.isPending}
          className="text-xs h-8 border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.divisionPanel.addRound")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleteMutation.isPending}
          className="text-xs h-8 text-red-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.divisionPanel.deleteDivision")}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("seasonStructure.confirmDelete.divisionTitle")}
        description={
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-sm text-red-400">{t("seasonStructure.confirmDelete.divisionWarning")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("seasonStructure.confirmDelete.divisionDescription", { name: editName })}
            </p>
          </div>
        }
        confirmLabel={t("seasonStructure.confirmDelete.confirmDelete")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          deleteMutation.mutate({ id: divisionId })
          setDeleteDialogOpen(false)
        }}
        isPending={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  )
}
