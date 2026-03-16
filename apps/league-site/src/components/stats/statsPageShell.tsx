import { Calendar } from "lucide-react"
import { InlineSelect } from "~/components/shared/inlineSelect"
import { PillTabs } from "~/components/shared/pillTabs"
import { useSeason } from "~/lib/context"

interface StatsPageShellProps {
  title: string
  selectedSeasonId?: string | undefined
  onSeasonChange?: (v: string) => void
  showSeasonSelector?: boolean
  children: React.ReactNode
}

export function StatsPageShell({ title, selectedSeasonId, onSeasonChange, showSeasonSelector = true, children }: StatsPageShellProps) {
  const season = useSeason()

  return (
    <div className="animate-fade-in">
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
            {showSeasonSelector && onSeasonChange && season.all.length > 1 &&
              (season.all.length <= 4 ? (
                <PillTabs
                  size="sm"
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={onSeasonChange}
                />
              ) : (
                <InlineSelect
                  items={season.all.map((s) => ({ id: s.id, label: s.name }))}
                  value={selectedSeasonId!}
                  onChange={onSeasonChange}
                  icon={<Calendar className="h-3.5 w-3.5 text-league-text/40" />}
                />
              ))}
          </div>
          {children}
        </div>
      </section>
    </div>
  )
}
