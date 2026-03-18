import { cn } from "~/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-skeleton rounded bg-league-text/10", className)} />
}

export function GameCardSkeleton() {
  return (
    <div className="rounded-lg border border-league-text/10 bg-league-surface p-4">
      <Skeleton className="h-3 w-24 mb-3" />
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 justify-end">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-6 w-14" />
        <div className="flex-1 flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-32 mt-3 mx-auto" />
    </div>
  )
}

export function NewsCardSkeleton() {
  return (
    <div className="rounded-lg border border-league-text/10 bg-league-surface p-5">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function StandingsTableSkeleton() {
  return (
    <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-league-text/5 last:border-0">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

export function StatsTableSkeleton() {
  return (
    <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-league-text/5 last:border-0">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
    </div>
  )
}
