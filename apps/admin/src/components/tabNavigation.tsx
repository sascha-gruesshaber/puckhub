import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Fragment, isValidElement } from "react"

interface TabDef<T extends string> {
  id: T
  label: string
  icon?: LucideIcon | ReactNode
  testId?: string
}

interface TabGroup<T extends string> {
  key: string
  label?: string
  tabs: TabDef<T>[]
}

interface TabNavigationProps<T extends string> {
  groups: TabGroup<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
}

function TabNavigation<T extends string>({ groups, activeTab, onTabChange }: TabNavigationProps<T>) {
  return (
    <nav className="tab-nav">
      <div className="tab-nav__track">
        {groups.map((group, gi) => {
          const isGroupActive = group.tabs.some((tab) => tab.id === activeTab)
          const isMulti = group.tabs.length > 1

          return (
            <Fragment key={group.key}>
              {gi > 0 && <div className="tab-nav__divider" />}
              <div className="tab-nav__group">
                {group.label && <span className="tab-nav__group-label">{group.label}</span>}
                <div
                  className={
                    isMulti ? `tab-nav__segment${isGroupActive ? " tab-nav__segment--active" : ""}` : undefined
                  }
                >
                  {group.tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        data-testid={tab.testId}
                        className={`tab-nav__tab${isActive ? " tab-nav__tab--active" : ""}`}
                      >
                        {tab.icon && (
                          <span className="tab-nav__tab-icon">
                            {isValidElement(tab.icon)
                              ? tab.icon
                              : (() => {
                                  const Icon = tab.icon as LucideIcon
                                  return <Icon size={14} />
                                })()}
                          </span>
                        )}
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </nav>
  )
}

export type { TabDef, TabGroup, TabNavigationProps }
export { TabNavigation }
