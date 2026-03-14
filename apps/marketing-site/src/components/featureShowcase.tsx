import {
  Shirt,
  FileText,
  Shield,
  CalendarClock,
  Sparkles,
  BarChart3,
  History,
  Check,
} from "lucide-react"
import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"
import { useT } from "~/i18n"

const itemIcons = [Sparkles, BarChart3, History, Shirt, FileText, Shield, CalendarClock]

const itemScreenshots = [
  "/screenshots/ai-game-recap.png",
  "/screenshots/league-stats.png",
  "/screenshots/team-history.png",
  "/screenshots/trikot-designer.png",
  undefined,
  undefined,
  undefined,
]

export function FeatureShowcase() {
  const t = useT()
  const headerReveal = useScrollReveal()

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerReveal.ref}
          className={`text-center mb-16 sm:mb-20 ${revealClasses(headerReveal)}`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            {t.featureShowcase.heading}
          </h2>
          <p className="mt-4 text-lg text-brand-slate max-w-2xl mx-auto">
            {t.featureShowcase.subheading}
          </p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {t.featureShowcase.items.map((item, index) => (
            <FeatureSpotlight
              key={item.title}
              badge={item.badge}
              title={item.title}
              description={item.description}
              highlights={item.highlights}
              icon={itemIcons[index]!}
              screenshot={itemScreenshots[index]}
              reversed={index % 2 !== 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureSpotlight({
  badge,
  title,
  description,
  highlights,
  icon: Icon,
  screenshot,
  reversed,
}: {
  badge: string
  title: string
  description: string
  highlights: readonly string[]
  icon: typeof Sparkles
  screenshot?: string
  reversed: boolean
}) {
  const reveal = useScrollReveal()

  return (
    <div
      ref={reveal.ref}
      className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${revealClasses(reveal)}`}
    >
      {/* Text */}
      <div className={reversed ? "lg:order-2" : ""}>
        <div className="inline-flex items-center rounded-full bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold mb-4">
          {badge}
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-4">{title}</h3>
        <p className="text-lg text-brand-slate mb-6 leading-relaxed">
          {description}
        </p>
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
        {screenshot ? (
          <div className="relative">
            <div className="absolute inset-0 bg-brand-gold/5 rounded-2xl blur-2xl -z-10" />
            <div className="rounded-xl border border-white/10 bg-brand-navy-light shadow-2xl overflow-hidden">
              <img
                src={screenshot}
                alt={title}
                className="w-full"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = "none"
                  target.parentElement!.insertAdjacentHTML(
                    "beforeend",
                    `<div class="aspect-video bg-gradient-to-br from-brand-navy-light to-brand-navy flex items-center justify-center text-brand-slate/40 text-lg p-8 text-center">${title}</div>`,
                  )
                }}
              />
            </div>
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
                  <div
                    key={h}
                    className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-3 text-center"
                  >
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
  )
}
