import { Popover, PopoverContent, PopoverTrigger } from "@puckhub/ui"
import { Check, ChevronDown, X } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback } from "react"
import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

interface FilterDropdownOption {
  value: string
  label: string
  icon?: ReactNode
  group?: string
}

interface FilterDropdownProps {
  label: string
  options: FilterDropdownOption[]
  value: string[]
  onChange: (selected: string[]) => void
  singleSelect?: boolean
  className?: string
  testId?: string
  optionTestIdPrefix?: string
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
  singleSelect,
  className,
  testId,
  optionTestIdPrefix,
}: FilterDropdownProps) {
  const t = useT()

  const hasSelection = value.length > 0

  const triggerLabel = hasSelection
    ? value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? label)
      : `${label.replace(/^Alle?\s+/i, "")} (${value.length})`
    : label

  const toggleValue = useCallback(
    (optionValue: string) => {
      if (singleSelect) {
        onChange(value.includes(optionValue) ? [] : [optionValue])
      } else {
        const next = value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]
        onChange(next)
      }
    },
    [value, onChange, singleSelect],
  )

  const clearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange([])
    },
    [onChange],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors",
            hasSelection
              ? "bg-league-primary text-white shadow-sm"
              : "bg-league-surface border border-league-text/15 text-league-text/70 hover:text-league-text hover:border-league-primary/40",
            className,
          )}
        >
          {triggerLabel}
          {hasSelection ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={clearSelection}
              className="ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
              aria-label={t.layout.resetFilters}
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="min-w-[200px] w-auto p-0 border-league-text/10 bg-league-surface">
        <div role="listbox" aria-multiselectable={!singleSelect} className="max-h-[280px] overflow-y-auto py-1">
          {options.map((option, i) => {
            const isSelected = value.includes(option.value)
            const showGroupHeader = option.group && option.group !== options[i - 1]?.group
            return (
              <div key={option.value}>
                {showGroupHeader && (
                  <div
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-league-text/35",
                      i > 0 && "mt-1 border-t border-league-text/5 pt-2",
                    )}
                  >
                    {option.group}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-testid={optionTestIdPrefix ? `${optionTestIdPrefix}-${option.value}` : undefined}
                  onClick={() => toggleValue(option.value)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left text-league-text transition-colors hover:bg-league-text/[0.03] focus:bg-league-text/[0.06] focus:outline-none"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center transition-colors",
                      singleSelect ? "rounded-full border-2" : "rounded border",
                      isSelected
                        ? singleSelect
                          ? "border-league-primary"
                          : "border-league-primary bg-league-primary text-white"
                        : "border-league-text/20",
                    )}
                  >
                    {isSelected &&
                      (singleSelect ? (
                        <div className="h-2 w-2 rounded-full bg-league-primary" />
                      ) : (
                        <Check className="h-3 w-3" />
                      ))}
                  </div>
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </button>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export type { FilterDropdownOption, FilterDropdownProps }
export { FilterDropdown }
