import {
  BarChart3,
  Blocks,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Languages,
  Layers,
  Send,
  Shield,
  Shirt,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { revealClasses, useScrollReveal } from "~/hooks/useScrollEffects"
import { useT } from "~/i18n"

// Icons and screenshots ordered to match the new section layout:
// Section 0 – Administration: Structure Builder, Schedule Generator, CMS, RBAC
// Section 1 – Operations:     AI Recaps, Live Stats, Player Stats, Jersey Designer
// Section 2 – Community:      Public Reports, Structure Overview, Bilingual
const itemIcons = [
  Blocks, // Season Structure Builder
  CalendarClock, // Schedule Generator
  FileText, // Content Management
  Shield, // RBAC
  Sparkles, // AI Recaps
  BarChart3, // Live Stats & Standings
  History, // Season Progression & Player Stats
  Shirt, // Jersey Designer
  Send, // Public Game Reporting
  Layers, // Season Structure Overview
  Languages, // Bilingual
]

const itemScreenshots: string[][] = [
  // Season Structure Builder
  ["/screenshots/season-builder.png"],
  // Schedule Generator
  ["/screenshots/league-schedule.png"],
  // Content Management
  ["/screenshots/pages-cms.png"],
  // RBAC
  [],
  // AI Game Recaps
  ["/screenshots/ai-game-recap.png"],
  // Live Statistics & Standings
  ["/screenshots/league-stats.png", "/screenshots/league-standings.png", "/screenshots/goalie-stats.png"],
  // Season Progression & Player Stats
  ["/screenshots/team-history.png", "/screenshots/player-detail.png", "/screenshots/team-comparison.png"],
  // Jersey Designer
  ["/screenshots/trikot-designer.png"],
  // Public Game Reporting
  ["/screenshots/public-report-form.png", "/screenshots/public-report-otp.png", "/screenshots/public-report-admin.png"],
  // Season Structure Overview
  ["/screenshots/season-structure.png"],
  // Bilingual
  [],
]

// Section boundaries: which item index starts each section
const SECTION_STARTS = [0, 4, 8]

export function FeatureShowcase() {
  const t = useT()
  const headerReveal = useScrollReveal()

  return (
    <section id="features-detail" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={headerReveal.ref} className={`text-center mb-16 sm:mb-20 ${revealClasses(headerReveal)}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t.featureShowcase.heading}</h2>
          <p className="mt-4 text-lg text-brand-slate max-w-2xl mx-auto">{t.featureShowcase.subheading}</p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {t.featureShowcase.items.map((item, index) => {
            const sectionIdx = SECTION_STARTS.indexOf(index)
            const section = sectionIdx !== -1 ? t.featureShowcase.sections[sectionIdx] : null

            return (
              <div key={item.title}>
                {section && (
                  <SectionHeader
                    id={`features-${section.id}`}
                    title={section.title}
                    description={section.description}
                  />
                )}
                <FeatureSpotlight
                  badge={item.badge}
                  title={item.title}
                  description={item.description}
                  highlights={item.highlights}
                  icon={itemIcons[index]!}
                  screenshots={itemScreenshots[index] ?? []}
                  reversed={index % 2 !== 0}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SectionHeader({ id, title, description }: { id: string; title: string; description: string }) {
  const reveal = useScrollReveal()
  return (
    <div id={id} ref={reveal.ref} className={`scroll-mt-24 mb-16 sm:mb-20 ${revealClasses(reveal)}`}>
      <div className="flex items-center gap-4 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent" />
        <h3 className="text-xl sm:text-2xl font-bold text-brand-gold whitespace-nowrap">{title}</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent" />
      </div>
      <p className="text-center text-brand-slate">{description}</p>
    </div>
  )
}

function FeatureSpotlight({
  badge,
  title,
  description,
  highlights,
  icon: Icon,
  screenshots,
  reversed,
}: {
  badge: string
  title: string
  description: string
  highlights: readonly string[]
  icon: typeof Sparkles
  screenshots: string[]
  reversed: boolean
}) {
  const reveal = useScrollReveal()
  const [activeImg, setActiveImg] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [paused, setPaused] = useState(false)

  const hasScreenshots = screenshots.length > 0
  const hasMultiple = screenshots.length > 1

  // Auto-advance through screenshots when visible and not paused
  useEffect(() => {
    if (!hasMultiple || !reveal.revealed || paused || lightboxOpen) return
    const id = setInterval(() => {
      setActiveImg((i) => (i + 1) % screenshots.length)
    }, 4000)
    return () => clearInterval(id)
  }, [hasMultiple, reveal.revealed, paused, lightboxOpen, screenshots.length])

  return (
    <>
      <div ref={reveal.ref} className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${revealClasses(reveal)}`}>
        {/* Text */}
        <div className={reversed ? "lg:order-2" : ""}>
          <div className="inline-flex items-center rounded-full bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold mb-4">
            {badge}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">{title}</h3>
          <p className="text-lg text-brand-slate mb-6 leading-relaxed">{description}</p>
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3">
                <Check className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <span className="text-brand-slate">{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className={reversed ? "lg:order-1" : ""}>
          {hasScreenshots ? (
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: mouse events pause autoplay on a visual container
            // biome-ignore lint/a11y/noStaticElementInteractions: mouse enter/leave are used to pause autoplay, not for primary interaction
            <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
              <div className="absolute inset-0 bg-brand-gold/5 rounded-2xl blur-2xl -z-10" />
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 bg-brand-navy-light shadow-2xl overflow-hidden group cursor-zoom-in text-left"
                onClick={() => setLightboxOpen(true)}
                aria-label={`Open ${title} screenshot in lightbox`}
              >
                <div className="relative aspect-video bg-gradient-to-br from-brand-navy-light to-brand-navy">
                  {screenshots.map((src, i) => (
                    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError hides broken screenshot images
                    <img
                      key={src}
                      src={src}
                      alt={title}
                      className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ${
                        i === activeImg ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ))}

                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="rounded-full bg-black/50 backdrop-blur-sm p-3">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Dot navigation with progress indicator */}
              {hasMultiple && (
                <div className="flex gap-2 justify-center mt-3">
                  {screenshots.map((_src, i) => (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: screenshot dots are positional, no stable key
                      key={i}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className={`relative h-2 rounded-full transition-all overflow-hidden ${
                        i === activeImg ? "w-6 bg-brand-gold/30" : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Screenshot ${i + 1}`}
                    >
                      {i === activeImg && !paused && (
                        <span
                          key={`p-${activeImg}`}
                          className="absolute inset-0 rounded-full bg-brand-gold animate-showcase-progress"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-brand-blue/5 rounded-2xl blur-2xl -z-10" />
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 sm:p-10">
                <div className="flex items-center justify-center mb-8">
                  <div className="rounded-2xl bg-brand-gold/10 p-5">
                    <Icon className="h-12 w-12 text-brand-gold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {highlights.map((h) => (
                    <div key={h} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-3 text-center">
                      <Check className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                      <span className="text-sm text-brand-slate">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && hasScreenshots && (
        <ScreenshotLightbox
          images={screenshots}
          active={activeImg}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setActiveImg}
        />
      )}
    </>
  )
}

function ScreenshotLightbox({
  images,
  active,
  onClose,
  onNavigate,
}: {
  images: string[]
  active: number
  onClose: () => void
  onNavigate: (i: number) => void
}) {
  const prev = useCallback(
    () => onNavigate((active - 1 + images.length) % images.length),
    [active, images.length, onNavigate],
  )
  const next = useCallback(() => onNavigate((active + 1) % images.length), [active, images.length, onNavigate])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [onClose, prev, next])

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: role="dialog" backdrop click closes lightbox; keyboard handled via document keydown listener
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled via document keydown listener above
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot lightbox"
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-lightbox-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation prevents backdrop click from closing when interacting with content */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on a layout container to prevent event bubbling */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled by the outer dialog's document keydown listener */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {images.map((src, i) => (
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError hides broken lightbox images
            <img
              key={src}
              src={src}
              alt=""
              className={`max-w-[90vw] max-h-[80vh] rounded-lg object-contain transition-opacity duration-300 ${
                i === active ? "opacity-100" : "opacity-0 absolute inset-0"
              }`}
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = "none"
              }}
            />
          ))}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full ml-[-16px] h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full mr-[-16px] h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="flex gap-2 justify-center mt-4">
              {images.map((_src, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: lightbox dots are positional, no stable key
                  key={i}
                  type="button"
                  onClick={() => onNavigate(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? "w-6 bg-brand-gold" : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
