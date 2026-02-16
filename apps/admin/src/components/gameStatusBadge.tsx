import { useTranslation } from "~/i18n/use-translation"

type GameStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled"
type DisplayStatus = GameStatus | "incomplete" | "report_pending"

const statusStyles: Record<DisplayStatus, string> = {
  scheduled: "bg-slate-500 text-white border-slate-600",
  in_progress: "bg-orange-500 text-white border-orange-600",
  completed: "bg-emerald-600 text-white border-emerald-700",
  postponed: "bg-amber-500 text-white border-amber-600",
  cancelled: "bg-rose-500 text-white border-rose-600",
  incomplete: "bg-amber-400 text-white border-amber-500",
  report_pending: "bg-orange-500 text-white border-orange-600",
}

interface GameStatusBadgeProps {
  status: string
  scheduledAt?: string | Date | null
  venueId?: string | null
  className?: string
}

function deriveDisplayStatus(
  status: string,
  scheduledAt?: string | Date | null,
  venueId?: string | null,
): DisplayStatus {
  if (status !== "scheduled") return status as DisplayStatus
  if (!scheduledAt || !venueId) return "incomplete"
  if (new Date(scheduledAt) < new Date()) return "report_pending"
  return "scheduled"
}

function GameStatusBadge({ status, scheduledAt, venueId, className }: GameStatusBadgeProps) {
  const { t } = useTranslation("common")

  const displayStatus = deriveDisplayStatus(status, scheduledAt, venueId)
  const styles = statusStyles[displayStatus] ?? statusStyles.scheduled

  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium rounded-full border px-2 py-0.5 ${styles} ${className ?? ""}`}
    >
      {t(`gamesPage.status.${displayStatus}`)}
    </span>
  )
}

export { GameStatusBadge, deriveDisplayStatus }
export type { GameStatus }
