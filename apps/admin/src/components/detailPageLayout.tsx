import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { DetailPageSkeleton } from "~/components/skeletons/detailPageSkeleton"

interface DetailPageLayoutProps {
  backTo: string
  backParams?: Record<string, string>
  backLabel: string
  actions?: React.ReactNode
  isLoading?: boolean
  loadingSkeleton?: React.ReactNode
  notFound?: boolean
  notFoundContent?: React.ReactNode
  children: React.ReactNode
  maxWidth?: string
}

function DetailPageLayout({
  backTo,
  backParams,
  backLabel,
  actions,
  isLoading,
  loadingSkeleton,
  notFound,
  notFoundContent,
  children,
  maxWidth = "",
}: DetailPageLayoutProps) {
  const wrapperClass = maxWidth ? `${maxWidth} mx-auto` : undefined

  if (isLoading) {
    return <div className={wrapperClass}>{loadingSkeleton ?? <DetailPageSkeleton />}</div>
  }

  if (notFound) {
    return (
      <div className={wrapperClass}>
        <BackLink to={backTo} params={backParams} label={backLabel} className="mb-6" />
        {notFoundContent}
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      {/* Header: back link + actions */}
      <div className="flex items-center justify-between mb-6">
        <BackLink to={backTo} params={backParams} label={backLabel} />
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

function BackLink({
  to,
  params,
  label,
  className,
}: {
  to: string
  params?: Record<string, string>
  label: string
  className?: string
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors${className ? ` ${className}` : ""}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}

export { DetailPageLayout }
