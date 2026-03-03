import { useRef, useState, useLayoutEffect, useCallback, useEffect } from "react"
import { cn } from "~/lib/utils"

export interface PillTabItem<T extends string = string> {
  id: T
  label: string
  icon?: React.ReactNode
}

interface PillTabsProps<T extends string = string> {
  items: PillTabItem<T>[]
  value: T
  onChange: (value: T) => void
  size?: "sm" | "md"
  className?: string
}

const sizeClasses = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
}

export function PillTabs<T extends string>({
  items,
  value,
  onChange,
  size = "md",
  className,
}: PillTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })
  const isFirstRender = useRef(true)

  const updateIndicator = useCallback(() => {
    const button = buttonRefs.current.get(value)
    const container = containerRef.current
    if (!button || !container) return
    setIndicator({
      left: button.offsetLeft,
      width: button.offsetWidth,
      ready: true,
    })
  }, [value])

  useLayoutEffect(() => {
    updateIndicator()
    if (isFirstRender.current) {
      const timer = requestAnimationFrame(() => {
        isFirstRender.current = false
      })
      return () => cancelAnimationFrame(timer)
    }
  }, [updateIndicator])

  // Recalculate on container resize (font loading, layout shifts)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(updateIndicator)
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn(
        "relative inline-flex rounded-lg bg-league-text/[0.04] p-1 overflow-x-auto scrollbar-hidden",
        className,
      )}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-md bg-league-primary shadow-sm"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.ready ? 1 : 0,
          transition: isFirstRender.current
            ? "opacity 150ms ease"
            : "left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease",
        }}
      />

      {/* Tab buttons */}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          ref={(el) => {
            if (el) buttonRefs.current.set(item.id, el)
            else buttonRefs.current.delete(item.id)
          }}
          onClick={() => {
            onChange(item.id)
            const btn = buttonRefs.current.get(item.id)
            btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
          }}
          className={cn(
            "relative z-10 rounded-md font-medium whitespace-nowrap transition-colors duration-200 flex items-center gap-1.5",
            sizeClasses[size],
            value === item.id ? "text-white" : "text-league-text/60 hover:text-league-text/80",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}
