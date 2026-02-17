import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface HoverCardProps {
  /** Pre-built content (eager) OR render function (lazy — only called when card opens) */
  content: ReactNode | (() => ReactNode)
  children: ReactNode
  /** Delay in ms before showing (default 300) */
  showDelay?: number
  /** Delay in ms before hiding (default 150) */
  hideDelay?: number
  /** Preferred placement (default 'bottom') */
  side?: "top" | "bottom"
  /** Additional class on the card container */
  className?: string
  /** Disable the hover card entirely */
  disabled?: boolean
}

function HoverCard({
  content,
  children,
  showDelay = 300,
  hideDelay = 150,
  side = "bottom",
  className,
  disabled,
}: HoverCardProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [placement, setPlacement] = useState<"top" | "bottom">(side)

  const triggerRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const show = useCallback(() => {
    if (disabled) return
    clearTimers()
    showTimer.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const cardHeight = 220 // estimated
      const gap = 8

      // Determine placement
      let resolvedSide = side
      if (side === "bottom" && rect.bottom + cardHeight + gap > window.innerHeight) {
        resolvedSide = "top"
      } else if (side === "top" && rect.top - cardHeight - gap < 0) {
        resolvedSide = "bottom"
      }

      const top = resolvedSide === "bottom" ? rect.bottom + gap : rect.top - gap

      // Center horizontally on trigger, clamp to viewport
      let left = rect.left + rect.width / 2
      left = Math.max(180, Math.min(left, window.innerWidth - 180))

      setPlacement(resolvedSide)
      setPosition({ top, left })
      setOpen(true)
    }, showDelay)
  }, [disabled, clearTimers, side, showDelay])

  const hide = useCallback(() => {
    clearTimers()
    hideTimer.current = setTimeout(() => {
      setOpen(false)
    }, hideDelay)
  }, [clearTimers, hideDelay])

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  // Clean up timers on unmount
  useEffect(() => clearTimers, [clearTimers])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="inline-flex"
        style={{ cursor: disabled ? undefined : "default" }}
      >
        {children}
      </span>

      {open &&
        position &&
        createPortal(
          <div
            ref={cardRef}
            onMouseEnter={cancelHide}
            onMouseLeave={hide}
            className={`hover-card fixed z-50 w-[340px] rounded-xl border border-border/60 bg-white shadow-xl shadow-black/8 ${className ?? ""}`}
            style={{
              top: placement === "bottom" ? position.top : undefined,
              bottom: placement === "top" ? window.innerHeight - position.top : undefined,
              left: position.left,
              transform: "translateX(-50%)",
              transformOrigin: placement === "bottom" ? "top center" : "bottom center",
            }}
          >
            {typeof content === "function" ? content() : content}
          </div>,
          document.body,
        )}
    </>
  )
}

export { HoverCard }
export type { HoverCardProps }
