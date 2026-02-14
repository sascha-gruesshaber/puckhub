import type { ReactNode } from "react"
import { PageHeader } from "~/components/pageHeader"
import { SearchInput } from "~/components/searchInput"

interface DataPageLayoutProps {
  title: string
  description: string
  action?: ReactNode
  filters?: ReactNode
  search: { value: string; onChange: (v: string) => void; placeholder?: string }
  count?: ReactNode
  rightControls?: ReactNode
  children: ReactNode
}

function DataPageLayout({
  title,
  description,
  action,
  filters,
  search,
  count,
  rightControls,
  children,
}: DataPageLayoutProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} action={action} />

      {/* Filter bar + search + stats */}
      <div className="space-y-3">
        {filters && <div className="filter-bar flex items-center gap-2 flex-wrap">{filters}</div>}
        <div className="flex items-center gap-4 flex-wrap">
          <SearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} />
          {count}
          {rightControls && (
            <>
              <div className="flex-1" />
              {rightControls}
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}

export { DataPageLayout }
export type { DataPageLayoutProps }
