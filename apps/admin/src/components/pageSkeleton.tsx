import { Skeleton } from "@puckhub/ui"

/**
 * Generic page skeleton shown by the Suspense boundary in _authed.tsx
 * while route components load data via useSuspenseQuery.
 * Mirrors the DataPageLayout structure: header → search bar → data rows.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-9 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded mt-2" />
      </div>

      {/* Search bar area */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Data rows */}
      <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3.5 ${i < 4 ? "border-b border-border/40" : ""}`}>
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/4 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
