import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"

/**
 * A navigate wrapper for search-param-only changes (tabs, filters, season selectors).
 * Always uses `replace: true` and preserves scroll position so the page doesn't
 * jump to the top when the user interacts with a filter.
 */
export function useFilterNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (opts: { search: any }) => {
      const scrollY = window.scrollY
      navigate({ ...opts, replace: true, resetScroll: false })
      // Safety net: restore scroll after the router's own scroll handling runs.
      // Double rAF ensures we execute after any queued animation-frame callbacks.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (window.scrollY !== scrollY) {
            window.scrollTo(0, scrollY)
          }
        })
      })
    },
    [navigate],
  )
}
