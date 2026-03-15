import { Check, ChevronDown, X } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useT } from "~/lib/i18n"
import { cn } from "~/lib/utils"

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
  singleSelect?: boolean
  className?: string
}

function FilterDropdown({ label, options, value, onChange, singleSelect, className }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${focusedIndex}"]`)
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [focusedIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(0)
      }
      return
    }
    switch (e.key) {
      case "Escape":
      case "Tab":
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        break
      case "ArrowDown":
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (focusedIndex >= 0 && options[focusedIndex]) {
          toggleValue(options[focusedIndex].value)
        }
        break
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen) setFocusedIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors",
          hasSelection
            ? "bg-league-primary text-white shadow-sm"
            : "bg-league-surface border border-league-text/15 text-league-text/70 hover:text-league-text hover:border-league-primary/40",
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
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
            className="ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
            aria-label={t.layout.resetFilters}
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
        )}
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-multiselectable={!singleSelect}
          className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] max-h-[280px] overflow-y-auto rounded-lg border border-league-text/10 bg-league-surface shadow-lg"
          onKeyDown={handleKeyDown}
        >
          <div className="py-1">
            {options.map((option, index) => {
              const isSelected = value.includes(option.value)
              const isFocused = index === focusedIndex
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onClick={() => toggleValue(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left text-league-text transition-colors",
                    isFocused ? "bg-league-text/[0.06]" : "hover:bg-league-text/[0.03]",
                  )}
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
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export { FilterDropdown }
export type { FilterDropdownOption, FilterDropdownProps }
