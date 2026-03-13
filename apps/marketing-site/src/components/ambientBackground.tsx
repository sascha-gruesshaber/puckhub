import type { ReactNode } from "react"
import { useParallax } from "~/hooks/useScrollEffects"

export function AmbientBackground({ children }: { children: ReactNode }) {
  const orbBlue = useParallax(0.15)
  const orbGold = useParallax(0.08)

  return (
    <div className="relative overflow-hidden">
      {/* Animated gradient orbs with parallax + glow drift */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div ref={orbBlue} className="absolute -top-40 -right-40 h-[600px] w-[600px]">
          <div className="h-full w-full rounded-full bg-brand-blue/10 blur-3xl animate-glow-drift" />
        </div>
        <div ref={orbGold} className="absolute top-1/3 -left-40 h-[500px] w-[500px]">
          <div className="h-full w-full rounded-full bg-brand-gold/5 blur-3xl animate-glow-drift-alt" />
        </div>
      </div>

      <div className="relative">{children}</div>
    </div>
  )
}
