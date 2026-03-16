import {
  HoverCard as HoverCardPrimitive,
  HoverCardContent,
  HoverCardTrigger,
} from "@puckhub/ui"
import type { ReactNode } from "react"

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
  if (disabled) {
    return <span className="inline-flex">{children}</span>
  }

  return (
    <HoverCardPrimitive openDelay={showDelay} closeDelay={hideDelay}>
      <HoverCardTrigger asChild>
        <span className="inline-flex cursor-default">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        className={`w-[340px] rounded-xl border-border/60 shadow-xl shadow-black/8 p-0 ${className ?? ""}`}
      >
        {typeof content === "function" ? content() : content}
      </HoverCardContent>
    </HoverCardPrimitive>
  )
}

export { HoverCard }
export type { HoverCardProps }
