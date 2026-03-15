import { cn } from "~/lib/utils"

interface ScoreBadgeProps {
  homeScore: number | null
  awayScore: number | null
  status: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "text-sm px-2 py-0.5",
  md: "text-lg px-3 py-1 font-bold",
  lg: "text-3xl px-5 py-2 font-extrabold",
}

export function ScoreBadge({ homeScore, awayScore, status, size = "md", className }: ScoreBadgeProps) {
  if (status === "scheduled" || homeScore === null || awayScore === null) {
    return <span className={cn(sizeClasses[size], "text-league-text/40", className)}>vs</span>
  }

  return (
    <span className={cn(sizeClasses[size], "tabular-nums", className)}>
      {homeScore} : {awayScore}
    </span>
  )
}
