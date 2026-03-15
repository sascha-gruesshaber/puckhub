import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  live: "bg-red-100 text-red-800 animate-pulse",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
  postponed: "bg-yellow-100 text-yellow-800",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useT()

  const labels: Record<string, string> = {
    scheduled: t.status.scheduled,
    live: t.status.live,
    completed: t.status.completed,
    cancelled: t.status.cancelled,
    postponed: t.status.postponed,
  }

  const label = labels[status] ?? status
  const style = statusStyles[status] ?? "bg-gray-100 text-gray-600"
  const config = { label, className: style }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
