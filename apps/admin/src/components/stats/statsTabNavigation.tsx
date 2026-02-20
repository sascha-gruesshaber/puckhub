import { useTranslation } from "~/i18n/use-translation"

const TABS = ["overview", "scorers", "goals", "assists", "penalties", "goalies", "teams"] as const
type StatsTab = (typeof TABS)[number]

interface StatsTabNavigationProps {
  activeTab: StatsTab
  onTabChange: (tab: StatsTab) => void
}

function StatsTabNavigation({ activeTab, onTabChange }: StatsTabNavigationProps) {
  const { t } = useTranslation("common")

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === tab
              ? "bg-primary text-primary-foreground"
              : "bg-white border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(`statsPage.tabs.${tab}`)}
        </button>
      ))}
    </div>
  )
}

export { StatsTabNavigation, TABS }
export type { StatsTab }
