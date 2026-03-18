import { Skeleton } from "@puckhub/ui"

interface DetailPageSkeletonProps {
  /** Show a wider content area (e.g. for forms with sidebars) */
  wide?: boolean
}

export function DetailPageSkeleton({ wide }: DetailPageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <Skeleton className="h-5 w-32 rounded" />

      {wide ? (
        /* Form-style skeleton (title + two-column layout) */
        <>
          <div>
            <Skeleton className="h-9 w-64 rounded" />
            <Skeleton className="h-5 w-40 rounded mt-2" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-5">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-20 w-full rounded" />
              <Skeleton className="h-64 w-full rounded" />
            </div>
            <Skeleton className="h-56 w-full rounded" />
          </div>
        </>
      ) : (
        /* Card-style skeleton (info card + list) */
        <>
          <div className="bg-white rounded-xl shadow-sm border border-border/50 p-6 space-y-4">
            <Skeleton className="h-7 w-64 rounded" />
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
