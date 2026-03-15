import { ChevronDown } from "lucide-react"
import { cn } from "~/lib/utils"

export interface InlineSelectItem<T extends string = string> {
  id: T
  label: string
}

interface InlineSelectProps<T extends string = string> {
  items: InlineSelectItem<T>[]
  value: T
  onChange: (value: T) => void
  icon?: React.ReactNode
  className?: string
}

export function InlineSelect<T extends string>({ items, value, onChange, icon, className }: InlineSelectProps<T>) {
  const selectedLabel = items.find((i) => i.id === value)?.label ?? ""

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Visible styled display */}
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-league-text/15 bg-league-surface px-3 py-1.5 text-sm font-medium text-league-text pointer-events-none">
        {icon}
        <span className="truncate max-w-[160px]">{selectedLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-league-text/40 flex-shrink-0" />
      </span>

      {/* Native select overlay for accessibility and mobile UX */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label={selectedLabel}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}
