import type { NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"
import { memo } from "react"
import { useTranslation } from "~/i18n/use-translation"

function SeasonNodeComponent({ data, selected }: NodeProps) {
  const { t } = useTranslation("common")
  const d = data as {
    name: string
    seasonStart: Date | string
    seasonEnd: Date | string
  }
  const start = new Date(d.seasonStart)
  const end = new Date(d.seasonEnd)
  const badge = String(start.getUTCFullYear()).slice(-2)

  return (
    <div className={`structure-node season-node${selected ? " selected" : ""}`}>
      <div className="season-badge">{badge}</div>
      <div className="season-info">
        <div className="season-name">{d.name}</div>
        <div className="season-sub">
          {t("seasonStructure.labels.seasonRange", {
            start: String(start.getUTCFullYear()).slice(-2),
            end: String(end.getUTCFullYear()).slice(-2),
          })}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="default" />
    </div>
  )
}

export const SeasonNode = memo(SeasonNodeComponent)
