import { Skeleton } from "@puckhub/ui"

interface FilterPillsSkeletonProps {
  count?: number
}

export function FilterPillsSkeleton({ count = 4 }: FilterPillsSkeletonProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-7 w-16 rounded-full" />
      ))}
    </div>
  )
}
