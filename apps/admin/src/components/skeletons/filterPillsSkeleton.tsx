import { Skeleton } from "@puckhub/ui"

interface FilterPillsSkeletonProps {
  count?: number
}

export function FilterPillsSkeleton({ count = 4 }: FilterPillsSkeletonProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
        <Skeleton key={i} className="h-7 w-16 rounded-full" />
      ))}
    </div>
  )
}
