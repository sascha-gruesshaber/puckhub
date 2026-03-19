interface StatsPageShellProps {
  title: string
  children: React.ReactNode
}

export function StatsPageShell({ title, children }: StatsPageShellProps) {
  return (
    <div className="animate-fade-in">
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          {children}
        </div>
      </section>
    </div>
  )
}
