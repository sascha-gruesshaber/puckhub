import { Button, toast } from "@puckhub/ui"
import type { Node } from "@xyflow/react"
import { ChevronLeft, ChevronRight, GripVertical, Plus } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import { type RoundType, roundTypeMap } from "../utils/roundTypeColors"
import { divisionIcon, roundTypeIcons } from "../utils/roundTypeIcons"
import { DivisionEditPanel } from "./divisionEditPanel"
import { RoundEditPanel } from "./roundEditPanel"
import { TeamAssignmentPanel } from "./teamAssignmentPanel"
import { TeamPalette } from "./teamPalette"

interface Team {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

export type DragType = "division" | "round" | "team" | null

interface SidePanelProps {
  selectedNode: Node | null
  teams: Team[]
  teamDivisionCounts: Map<string, number>
  seasonId: string
  onInvalidate: () => void
  onDragTypeChange: (type: DragType) => void
}

const allRoundTypes = Object.keys(roundTypeMap) as RoundType[]

function StructurePalette({
  t,
  onDragTypeChange,
}: {
  t: (key: string, options?: Record<string, string | number | undefined>) => string
  onDragTypeChange: (type: DragType) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("seasonStructure.panel.structureElements")}
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        {t("seasonStructure.panel.structureElementsDescription")}
      </p>

      <div className="flex flex-col gap-2">
        {/* Division drag item */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/structureType", "division")
            e.dataTransfer.effectAllowed = "copy"
            onDragTypeChange("division")
          }}
          onDragEnd={() => onDragTypeChange(null)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-300 cursor-grab hover:border-[#D4A843]/50 hover:bg-[#F4D35E]/5 active:cursor-grabbing transition-colors"
        >
          <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "rgba(244,211,94,0.12)", color: "#D4A843" }}
          >
            {divisionIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900">{t("seasonStructure.panel.division")}</div>
            <div className="text-[10px] text-gray-500">{t("seasonStructure.panel.dragToCanvas")}</div>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            {t("seasonStructure.panel.roundTypes")}
          </span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Individual round type drag items */}
        {allRoundTypes.map((type) => {
          const config = roundTypeMap[type]
          const icon = roundTypeIcons[type]
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/roundType", type)
                e.dataTransfer.effectAllowed = "copy"
                onDragTypeChange("round")
              }}
              onDragEnd={() => onDragTypeChange(null)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 cursor-grab hover:bg-gray-50 active:cursor-grabbing transition-colors"
              style={{
                borderColor: undefined,
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = config.color
                ;(e.currentTarget as HTMLDivElement).style.background = config.bg
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = ""
                ;(e.currentTarget as HTMLDivElement).style.background = ""
              }}
            >
              <GripVertical className="h-3 w-3 text-gray-300 shrink-0" />
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{ color: config.color }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-gray-800">{t(config.labelKey)}</div>
              </div>
              <div
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: config.color, background: config.bg }}
              >
                {t("seasonStructure.panel.dragToDivisionShort")}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SidePanel({
  selectedNode,
  teams,
  teamDivisionCounts,
  seasonId,
  onInvalidate,
  onDragTypeChange,
}: SidePanelProps) {
  const { t } = useTranslation("common")
  const [collapsed, setCollapsed] = useState(false)

  const createDivisionMutation = trpc.division.create.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.divisionCreated"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  function handleAddDivision() {
    createDivisionMutation.mutate({
      seasonId,
      name: t("seasonStructure.defaults.newDivision"),
      sortOrder: 0,
    })
  }

  function renderContent() {
    if (!selectedNode) {
      return (
        <>
          <StructurePalette t={t} onDragTypeChange={onDragTypeChange} />
          <div className="border-t border-gray-200 mt-4 pt-4">
            <TeamPalette teams={teams} teamDivisionCounts={teamDivisionCounts} onDragTypeChange={onDragTypeChange} />
          </div>
        </>
      )
    }

    const nodeType = selectedNode.type
    const d = selectedNode.data as Record<string, unknown>

    if (nodeType === "season") {
      const start = new Date(d.seasonStart as string)
      const end = new Date(d.seasonEnd as string)
      return (
        <div className="flex flex-col gap-4">
          <StructurePalette t={t} onDragTypeChange={onDragTypeChange} />
          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("seasonStructure.panel.season")}
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 mt-3">
              <div className="text-sm font-semibold text-gray-900">{d.name as string}</div>
              <div className="text-xs text-gray-500 mt-1">
                {t("seasonStructure.panel.range", {
                  start: String(start.getUTCFullYear()).slice(-2),
                  end: String(end.getUTCFullYear()).slice(-2),
                })}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddDivision}
              disabled={createDivisionMutation.isPending}
              className="text-xs h-8 mt-3 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("seasonStructure.panel.addDivision")}
            </Button>
          </div>
        </div>
      )
    }

    if (nodeType === "division") {
      return (
        <DivisionEditPanel
          divisionId={d.dbId as string}
          name={d.name as string}
          sortOrder={d.sortOrder as number}
          goalieMinGames={(d.goalieMinGames as number) ?? 7}
          seasonId={d.seasonId as string}
          onInvalidate={onInvalidate}
        />
      )
    }

    if (nodeType === "round") {
      return (
        <RoundEditPanel
          roundId={d.dbId as string}
          name={d.name as string}
          roundType={d.roundType as string}
          pointsWin={d.pointsWin as number}
          pointsDraw={d.pointsDraw as number}
          pointsLoss={d.pointsLoss as number}
          countsForPlayerStats={(d.countsForPlayerStats as boolean) ?? true}
          countsForGoalieStats={(d.countsForGoalieStats as boolean) ?? true}
          onInvalidate={onInvalidate}
        />
      )
    }

    if (nodeType === "team") {
      return (
        <TeamAssignmentPanel
          assignmentId={d.assignmentId as string}
          teamName={d.name as string}
          shortName={d.shortName as string}
          logoUrl={d.logoUrl as string | null}
          onInvalidate={onInvalidate}
        />
      )
    }

    return (
      <>
        <StructurePalette t={t} onDragTypeChange={onDragTypeChange} />
        <div className="border-t border-gray-200 mt-4 pt-4">
          <TeamPalette teams={teams} teamDivisionCounts={teamDivisionCounts} onDragTypeChange={onDragTypeChange} />
        </div>
      </>
    )
  }

  return (
    <>
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 z-10 flex items-center justify-center w-6 h-12 rounded-l-md bg-white border border-r-0 border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        style={{ right: collapsed ? 0 : 320 }}
      >
        {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {/* Panel */}
      <div
        className="absolute top-0 right-0 bottom-0 z-10 flex flex-col overflow-hidden transition-transform duration-200"
        style={{
          width: 320,
          background: "#FFFFFF",
          borderLeft: "1px solid #E5E7EB",
          boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.06)",
          transform: collapsed ? "translateX(100%)" : "translateX(0)",
        }}
      >
        <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      </div>
    </>
  )
}
