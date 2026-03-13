import { useEffect, useRef, useState } from "react"

/**
 * Triggers a reveal animation when the element scrolls into view.
 * SSR-safe: elements visible by default, animation only added client-side for below-fold content.
 */
export function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true)
      return
    }

    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setRevealed(true)
      return
    }

    setShouldAnimate(true)

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, revealed, shouldAnimate }
}

/**
 * Returns the CSS class string for scroll-reveal or scroll-stagger animations.
 * Returns empty string for elements that were in viewport on mount (no animation needed).
 */
export function revealClasses(
  r: { shouldAnimate: boolean; revealed: boolean },
  type: "reveal" | "stagger" = "reveal",
) {
  if (!r.shouldAnimate) return ""
  const base = type === "stagger" ? "scroll-stagger" : "scroll-reveal"
  return r.revealed ? `${base} revealed` : base
}

/**
 * Applies a parallax translateY to the referenced element based on scroll position.
 * Uses requestAnimationFrame for performance. Respects prefers-reduced-motion.
 */
export function useParallax(speed: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const el = ref.current
    if (!el) return

    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          el.style.transform = `translateY(${window.scrollY * speed}px)`
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [speed])

  return ref
}
