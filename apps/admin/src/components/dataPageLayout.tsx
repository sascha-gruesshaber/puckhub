import type { ReactNode } from "react"
import { PageHeader } from "~/components/pageHeader"

interface DataPageLayoutProps {
  title: string
  description: string
  action?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

function DataPageLayout({ title, description, action, filters, children }: DataPageLayoutProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} action={action} />
      {filters}
      {children}
    </div>
  )
}

export { DataPageLayout }
export type { DataPageLayoutProps }
