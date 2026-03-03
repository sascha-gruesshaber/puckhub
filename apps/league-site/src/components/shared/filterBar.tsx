import { cn } from "~/lib/utils"

interface FilterBarProps {
  children: React.ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row flex-wrap items-start gap-3 sm:gap-4 mb-6", className)}>
      {children}
    </div>
  )
}

interface FilterBarGroupProps {
  children: React.ReactNode
  label?: string
  className?: string
}

export function FilterBarGroup({ children, label, className }: FilterBarGroupProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-league-text/40 font-semibold pl-1">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
