import { cn } from "~/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      {icon && <div className="flex justify-center mb-3 text-web-text/30">{icon}</div>}
      <h3 className="text-lg font-medium text-web-text/60">{title}</h3>
      {description && <p className="text-sm text-web-text/40 mt-1">{description}</p>}
    </div>
  )
}
