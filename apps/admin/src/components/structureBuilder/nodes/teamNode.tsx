import type { NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"
import { memo } from "react"

function TeamNodeComponent({ data, selected }: NodeProps) {
  const d = data as {
    name: string
    shortName: string
    logoUrl: string | null
  }

  const initials = d.shortName.substring(0, 3).toUpperCase()

  return (
    <div className={`structure-node team-node${selected ? " selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="default" />

      <div className="team-content">
        <div className="team-logo-wrap">
          {d.logoUrl ? (
            <img src={d.logoUrl} alt={d.shortName} className="team-logo-img" />
          ) : (
            <div className="team-logo-placeholder">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="team-shield-icon">
                <path
                  d="M7 1L2.5 3v4c0 3.1 1.9 5.3 4.5 6 2.6-.7 4.5-2.9 4.5-6V3L7 1z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
            </div>
          )}
        </div>
        <span className="team-name">{d.logoUrl ? d.shortName : initials}</span>
      </div>
    </div>
  )
}

export const TeamNode = memo(TeamNodeComponent)
