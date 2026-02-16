import { Button, Input, toast } from "@puckhub/ui"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"

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
  const [editName, setEditName] = useState(name)
  const [editOrder, setEditOrder] = useState(String(sortOrder))
  const [editGoalieMinGames, setEditGoalieMinGames] = useState(String(goalieMinGames))

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
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  const deleteMutation = trpc.division.delete.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.divisionDeleted"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  const createRoundMutation = trpc.round.create.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.roundCreated"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
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
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.name")}</label>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 text-xs bg-white border-gray-200 text-gray-900"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.sortOrder")}</label>
        <Input
          type="number"
          value={editOrder}
          onChange={(e) => setEditOrder(e.target.value)}
          className="h-8 text-xs bg-white border-gray-200 text-gray-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.goalieMinGames")}</label>
        <Input
          type="number"
          min={0}
          value={editGoalieMinGames}
          onChange={(e) => setEditGoalieMinGames(e.target.value)}
          className="h-8 text-xs bg-white border-gray-200 text-gray-900 w-20"
        />
        <span className="text-[10px] text-gray-400">{t("seasonStructure.fields.goalieMinGamesHint")}</span>
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

      <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRound}
          disabled={createRoundMutation.isPending}
          className="text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.divisionPanel.addRound")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteMutation.mutate({ id: divisionId })}
          disabled={deleteMutation.isPending}
          className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.divisionPanel.deleteDivision")}
        </Button>
      </div>
    </div>
  )
}
