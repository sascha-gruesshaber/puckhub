import { Skeleton } from "@puckhub/ui"

interface DataListSkeletonProps {
  rows?: number
  showIcon?: boolean
}

export function DataListSkeleton({ rows = 5, showIcon = true }: DataListSkeletonProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-4 py-3.5 ${i < rows - 1 ? "border-b border-border/40" : ""}`}
        >
          {showIcon && <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded hidden md:block" />
        </div>
      ))}
    </div>
  )
}
