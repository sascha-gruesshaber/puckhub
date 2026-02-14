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
      className={`filter-pill flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer ${
        active
          ? "filter-pill--active bg-primary text-primary-foreground"
          : "bg-white border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export { FilterPill }
export type { FilterPillProps }
