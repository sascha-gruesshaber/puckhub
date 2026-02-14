import type { NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"
import { memo } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { getRoundTypeConfig, type RoundType } from "../utils/roundTypeColors"
import { roundTypeIcons } from "../utils/roundTypeIcons"

function RoundNodeComponent({ data, selected }: NodeProps) {
  const { t } = useTranslation("common")
  const d = data as {
    name: string
    roundType: string
    pointsWin: number
    pointsDraw: number
    pointsLoss: number
  }

  const typeConfig = getRoundTypeConfig(d.roundType)
  const icon = roundTypeIcons[d.roundType as RoundType] ?? roundTypeIcons.regular

  return (
    <div className={`structure-node round-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Right} id="default" />

      <div className="round-header">
        <div className="round-icon" style={{ color: typeConfig.color }}>
          {icon}
        </div>
        <div className="round-name">{d.name}</div>
        <div className="round-type-badge" style={{ color: typeConfig.color, background: typeConfig.bg }}>
          {t(typeConfig.labelKey)}
        </div>
      </div>

      <div className="round-points">
        <span className="round-point-item">
          <span className="round-point-label">{t("seasonStructure.points.shortWin")}</span>
          <span className="point-val">{d.pointsWin}</span>
        </span>
        <span className="round-point-item">
          <span className="round-point-label">{t("seasonStructure.points.shortDraw")}</span>
          <span className="point-val">{d.pointsDraw}</span>
        </span>
        <span className="round-point-item">
          <span className="round-point-label">{t("seasonStructure.points.shortLoss")}</span>
          <span className="point-val">{d.pointsLoss}</span>
        </span>
      </div>
    </div>
  )
}

export const RoundNode = memo(RoundNodeComponent)
