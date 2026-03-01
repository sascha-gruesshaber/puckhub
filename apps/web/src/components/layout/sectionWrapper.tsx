import { cn } from "~/lib/utils"

interface SectionWrapperProps {
  title?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function SectionWrapper({ title, children, className, action }: SectionWrapperProps) {
  return (
    <section className={cn("py-8 sm:py-12", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(title || action) && (
          <div className="flex items-center justify-between mb-6">
            {title && <h2 className="text-2xl font-bold">{title}</h2>}
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
