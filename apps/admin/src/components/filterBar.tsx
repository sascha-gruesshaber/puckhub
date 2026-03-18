import { SlidersHorizontal } from "lucide-react"
import { Children, type ReactNode } from "react"
import { SearchInput } from "~/components/searchInput"

interface FilterBarProps {
  label?: string
  icon?: ReactNode
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  children?: ReactNode
}

function FilterBar({ label, icon, search, children }: FilterBarProps) {
  const hasFilters = Children.toArray(children).length > 0

  return (
    <div className="filter-bar-panel">
      {label && hasFilters && (
        <>
          <span className="filter-bar-panel__label">
            {icon ?? <SlidersHorizontal size={13} />}
            {label}
          </span>
          <div className="filter-bar-panel__divider" />
        </>
      )}
      {hasFilters && <div className="filter-bar-panel__controls">{children}</div>}
      {search && (
        <>
          {hasFilters && <div className="filter-bar-panel__divider" />}
          <SearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} />
        </>
      )}
    </div>
  )
}

function FilterBarDivider() {
  return <div className="filter-bar-panel__divider" />
}

export type { FilterBarProps }
export { FilterBar, FilterBarDivider }
