import { FilterPill } from "~/components/filterPill"
import { useTranslation } from "~/i18n/use-translation"

export type TimelineFilterValue = "all" | "signed" | "transfer" | "position-change" | "suspension"

interface TimelineFiltersProps {
  active: TimelineFilterValue
  onChange: (value: TimelineFilterValue) => void
}

const FILTERS: TimelineFilterValue[] = ["all", "signed", "transfer", "position-change", "suspension"]

const FILTER_KEYS: Record<TimelineFilterValue, string> = {
  all: "playersPage.history.filterAll",
  signed: "playersPage.history.filterSigned",
  transfer: "playersPage.history.filterTransfer",
  "position-change": "playersPage.history.filterPositionChange",
  suspension: "playersPage.history.filterSuspensions",
}

function TimelineFilters({ active, onChange }: TimelineFiltersProps) {
  const { t } = useTranslation("common")

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {FILTERS.map((filter) => (
        <FilterPill
          key={filter}
          label={t(FILTER_KEYS[filter]!)}
          active={active === filter}
          onClick={() => onChange(filter)}
        />
      ))}
    </div>
  )
}

export { TimelineFilters }
