import { cn } from "~/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Geplant", className: "bg-blue-100 text-blue-800" },
  live: { label: "Live", className: "bg-red-100 text-red-800 animate-pulse" },
  completed: { label: "Beendet", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Abgesagt", className: "bg-gray-100 text-gray-600" },
  postponed: { label: "Verschoben", className: "bg-yellow-100 text-yellow-800" },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-600" }

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  )
}
