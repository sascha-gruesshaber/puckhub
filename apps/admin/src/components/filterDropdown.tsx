import { cn, Popover, PopoverContent, PopoverTrigger } from "@puckhub/ui"
import { Check, ChevronDown, X } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback } from "react"

interface FilterDropdownOption {
  value: string
  label: string
  icon?: ReactNode
}

interface FilterDropdownProps {
  label: string
  options: FilterDropdownOption[]
  value: string[]
  onChange: (selected: string[]) => void
  /** When true, only one option can be selected at a time (radio behaviour). */
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
  const hasSelection = value.length > 0

  const triggerLabel = hasSelection
    ? value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? label)
      : `${label.replace(/^All\s+/i, "").replace(/^Alle\s+/i, "")} (${value.length})`
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
            "filter-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors",
            hasSelection
              ? "filter-pill--active bg-primary text-primary-foreground"
              : "bg-white border border-border text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          {triggerLabel}
          {hasSelection ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={clearSelection}
              onKeyDown={(e) => {
                if (e.key === "Enter") clearSelection(e as unknown as React.MouseEvent)
              }}
              className="ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="min-w-[200px] max-w-[calc(100vw-2rem)] sm:max-w-none w-auto p-0"
      >
        <div
          role="listbox"
          aria-multiselectable={!singleSelect}
          className="max-h-[280px] overflow-y-auto py-1"
        >
          {options.map((option) => {
            const isSelected = value.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={optionTestIdPrefix ? `${optionTestIdPrefix}-${option.value}` : undefined}
                onClick={() => toggleValue(option.value)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-accent/5 focus:bg-accent/10 focus:outline-none"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center transition-colors",
                    singleSelect ? "rounded-full border-2" : "rounded border",
                    isSelected
                      ? singleSelect
                        ? "border-primary"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {isSelected &&
                    (singleSelect ? (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    ) : (
                      <Check className="h-3 w-3" />
                    ))}
                </div>
                {option.icon && <span className="shrink-0">{option.icon}</span>}
                <span className="truncate">{option.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { FilterDropdown }
export type { FilterDropdownOption, FilterDropdownProps }
