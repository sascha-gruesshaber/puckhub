import { useRouterState } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

/**
 * Thin gold-gradient progress bar at the top of the viewport.
 * Shows for ~400ms on every route change to give immediate visual feedback.
 */
export function NavigationProgress() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname

    // Clear any previous timer (handles rapid navigation)
    if (timerRef.current) clearTimeout(timerRef.current)

    setVisible(true)
    timerRef.current = setTimeout(() => setVisible(false), 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      key={pathname}
      className="nav-progress-fill"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        background: "linear-gradient(90deg, #F4D35E 0%, #D4A843 50%, #F4D35E 100%)",
        backgroundSize: "200% 100%",
        pointerEvents: "none",
      }}
    />
  )
}
