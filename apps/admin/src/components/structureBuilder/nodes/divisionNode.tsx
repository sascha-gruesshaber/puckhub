import type { NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"
import { memo, useCallback, useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { divisionIcon } from "../utils/roundTypeIcons"

interface DivisionNodeData {
  name: string
  sortOrder: number
  dbId: string
  teamCount: number
  roundCount: number
  onDropTeam?: (divisionId: string, teamId: string) => void
  onDropRound?: (divisionId: string, roundType: string) => void
}

function DivisionNodeComponent({ data, selected }: NodeProps) {
  const { t } = useTranslation("common")
  const d = data as unknown as DivisionNodeData
  const [dropActive, setDropActive] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only accept teams and rounds on divisions
    const types = e.dataTransfer.types
    const isTeam = types.includes("text/teamid")
    const isRound = types.includes("text/roundtype")
    if (!isTeam && !isRound) return

    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDropActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDropActive(false)

      const teamId = e.dataTransfer.getData("text/teamId")
      if (teamId && d.onDropTeam) {
        d.onDropTeam(d.dbId, teamId)
        return
      }

      const roundType = e.dataTransfer.getData("text/roundType")
      if (roundType && d.onDropRound) {
        d.onDropRound(d.dbId, roundType)
      }
    },
    [d],
  )

  return (
    <div
      className={`structure-node division-node${selected ? " selected" : ""}${dropActive ? " drop-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Handle type="target" position={Position.Top} id="default" />

      <div className="div-header">
        <div className="div-icon">{divisionIcon}</div>
        <div className="div-name">{d.name}</div>
      </div>

      <div className="div-stats">
        <div className="div-stat">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3.5v3l2 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <span className="div-stat-num">{d.roundCount}</span> {t("seasonStructure.labels.rounds")}
        </div>
        <div className="div-stat">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1.5l1.1 2.3 2.5.4-1.8 1.7.4 2.5L6 7.3l-2.2 1.1.4-2.5-1.8-1.7 2.5-.4z"
              stroke="currentColor"
              strokeWidth="1.1"
              fill="none"
            />
          </svg>
          <span className="div-stat-num">{d.teamCount}</span> {t("seasonStructure.labels.teams")}
        </div>
      </div>

      <Handle type="source" position={Position.Left} id="rounds" />
      <Handle type="source" position={Position.Right} id="teams" />
    </div>
  )
}

export const DivisionNode = memo(DivisionNodeComponent)
