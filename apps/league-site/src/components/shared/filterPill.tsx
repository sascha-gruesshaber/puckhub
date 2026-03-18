import type { ReactNode } from "react"

interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  tooltip?: string
  icon?: ReactNode
}

function FilterPill({ label, active, onClick, tooltip, icon }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
        active
          ? "bg-league-primary text-white shadow-sm"
          : "bg-league-surface border border-league-text/15 text-league-text/70 hover:text-league-text hover:border-league-primary/40"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export type { FilterPillProps }
export { FilterPill }
