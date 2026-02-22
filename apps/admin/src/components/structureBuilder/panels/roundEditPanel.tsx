import { Button, Input, toast } from "@puckhub/ui"
import { Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { useTranslation } from "~/i18n/use-translation"
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
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const deleteMutation = trpc.round.delete.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.roundDeleted"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
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
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.name")}</label>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 text-xs bg-white border-gray-200 text-gray-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.roundType")}</label>
        <select
          value={editType}
          onChange={(e) => setEditType(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-[#F4D35E]/40"
        >
          {roundTypes.map(([value, { labelKey }]) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.points")}</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-gray-500 mb-1">{t("seasonStructure.points.win")}</div>
            <Input
              type="number"
              value={editWin}
              onChange={(e) => setEditWin(e.target.value)}
              className="h-8 text-xs bg-white border-gray-200 text-gray-900 text-center"
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">{t("seasonStructure.points.draw")}</div>
            <Input
              type="number"
              value={editDraw}
              onChange={(e) => setEditDraw(e.target.value)}
              className="h-8 text-xs bg-white border-gray-200 text-gray-900 text-center"
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">{t("seasonStructure.points.loss")}</div>
            <Input
              type="number"
              value={editLoss}
              onChange={(e) => setEditLoss(e.target.value)}
              className="h-8 text-xs bg-white border-gray-200 text-gray-900 text-center"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-gray-600">{t("seasonStructure.fields.statistics")}</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editPlayerStats}
              onChange={(e) => setEditPlayerStats(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#F4D35E] focus:ring-[#F4D35E]/40"
            />
            <span className="text-[11px] text-gray-700">{t("seasonStructure.stats.playerStats")}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editGoalieStats}
              onChange={(e) => setEditGoalieStats(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#F4D35E] focus:ring-[#F4D35E]/40"
            />
            <span className="text-[11px] text-gray-700">{t("seasonStructure.stats.goalieStats")}</span>
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

      <div className="border-t border-gray-200 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteMutation.mutate({ id: roundId })}
          disabled={deleteMutation.isPending}
          className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.roundPanel.deleteRound")}
        </Button>
      </div>
    </div>
  )
}
