import { useState, useEffect, useCallback } from "react"
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Trophy,
  Globe,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"
import { useT } from "~/i18n"

const slideIcons = [LayoutDashboard, CalendarDays, ClipboardList, Users, Globe, Trophy, Sparkles]

const slideScreenshots = [
  "/screenshots/dashboard.png",
  "/screenshots/season-builder.png",
  "/screenshots/game-report.png",
  "/screenshots/team-list.png",
  "/screenshots/league-home.png",
  "/screenshots/league-standings.png",
  "/screenshots/ai-game-recap.png",
]

const AUTOPLAY_MS = 6000

export function Features() {
  const t = useT()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reveal = useScrollReveal()

  const slides = t.features.slides.map((s, i) => ({
    ...s,
    icon: slideIcons[i]!,
    screenshot: slideScreenshots[i]!,
  }))

  const goTo = useCallback((i: number) => setActive(i), [])

  const next = useCallback(
    () => setActive((i) => (i + 1) % slides.length),
    [slides.length],
  )

  const prev = useCallback(
    () => setActive((i) => (i - 1 + slides.length) % slides.length),
    [slides.length],
  )

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [paused, next, active])

  const slide = slides[active]!

  return (
    <section id="features" className="py-20 sm:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={reveal.ref} className={revealClasses(reveal)}>
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold">
              {t.features.heading}
            </h2>
            <p className="mt-4 text-lg text-brand-slate max-w-2xl mx-auto">
              {t.features.subheading}
            </p>
          </div>

          {/* Feature tabs */}
          <div className="flex gap-1 justify-center mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => goTo(i)}
                className={`relative shrink-0 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all overflow-hidden ${
                  i === active
                    ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                    : "text-brand-slate hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <s.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">
                  {s.title}
                </span>
                {i === active && !paused && (
                  <span
                    key={`p-${active}`}
                    className="absolute bottom-0 left-0 h-0.5 bg-brand-gold/40 animate-progress"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Slider */}
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="rounded-xl border border-white/10 bg-brand-navy-light shadow-2xl shadow-black/40 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border-b border-white/5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                </div>

                <div className="relative aspect-[16/10] bg-brand-navy overflow-hidden">
                  {/* Screenshot slides */}
                  {slides.map((s, i) => (
                    <div
                      key={s.title}
                      className={`absolute inset-0 transition-all duration-500 ease-out ${
                        i === active
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-[1.02]"
                      }`}
                    >
                      <img
                        src={s.screenshot}
                        alt={s.title}
                        className="w-full h-full object-cover object-top"
                        loading={i === 0 ? "eager" : "lazy"}
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display =
                            "none"
                        }}
                      />
                    </div>
                  ))}

                  {/* Title overlay on screenshot */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 via-60% to-transparent p-5 sm:p-8 z-10 pointer-events-none">
                    <div key={active}>
                      <div
                        className="inline-flex items-center gap-2.5 mb-1.5 animate-fade-in-up"
                        style={{ animationDuration: "0.35s" }}
                      >
                        <div className="rounded-lg bg-brand-gold/30 backdrop-blur-md p-1.5">
                          <slide.icon className="h-4 w-4 text-brand-gold" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.6)" }}>
                          {slide.title}
                        </h3>
                      </div>
                      <p
                        className="text-sm sm:text-base text-white/90 max-w-xl animate-fade-in-up"
                        style={{
                          animationDuration: "0.35s",
                          animationDelay: "0.05s",
                          textShadow: "0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)",
                        }}
                      >
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation arrows */}
              <button
                type="button"
                onClick={prev}
                aria-label={t.features.prevLabel}
                className="absolute left-2 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-1/2 lg:-translate-x-full lg:-ml-4 h-10 w-10 rounded-full bg-brand-navy-light/90 border border-white/10 flex items-center justify-center text-brand-slate hover:text-white hover:border-brand-gold/40 transition-all backdrop-blur-sm shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label={t.features.nextLabel}
                className="absolute right-2 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-1/2 lg:translate-x-full lg:ml-4 h-10 w-10 rounded-full bg-brand-navy-light/90 border border-white/10 flex items-center justify-center text-brand-slate hover:text-white hover:border-brand-gold/40 transition-all backdrop-blur-sm shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
