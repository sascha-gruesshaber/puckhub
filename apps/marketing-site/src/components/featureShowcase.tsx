import {
  Shirt,
  FileText,
  Shield,
  CalendarClock,
  Check,
} from "lucide-react"
import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"

interface ShowcaseFeature {
  badge: string
  title: string
  description: string
  highlights: string[]
  icon: typeof Shirt
  screenshot?: string
}

const features: ShowcaseFeature[] = [
  {
    badge: "Kreativ-Tool",
    icon: Shirt,
    title: "Trikot-Designer",
    description:
      "Gestalte einzigartige Teamtrikots mit dem visuellen SVG-Designer direkt im Browser. Jedes Team erhält ein individuelles Erscheinungsbild, das auf der Liga-Website und in Spielberichten angezeigt wird.",
    screenshot: "/screenshots/trikot-designer.png",
    highlights: [
      "Farben, Muster und Logos frei anpassen",
      "Echtzeit-Vorschau im Browser",
      "Trikots im Team-Profil sichtbar",
      "SVG-basiert für gestochen scharfe Darstellung",
    ],
  },
  {
    badge: "Kommunikation",
    icon: FileText,
    title: "Content Management",
    description:
      "Halte deine Liga-Community auf dem Laufenden. Mit dem integrierten CMS veröffentlichst du News, erstellst eigene Seiten und steuerst alle Inhalte zentral – ohne externe Tools.",
    highlights: [
      "News erstellen und veröffentlichen",
      "Eigene Seiten mit Rich-Text-Editor",
      "Geplante Veröffentlichungen",
      "Bilder und Medien einbetten",
    ],
  },
  {
    badge: "Sicherheit",
    icon: Shield,
    title: "Rollenbasierte Zugriffskontrolle",
    description:
      "Definiere klar, wer was sehen und bearbeiten darf. Vom Owner über Admins bis zum Scorer – jede Rolle hat genau die Berechtigungen, die sie braucht. Kein Mehr, kein Weniger.",
    highlights: [
      "Owner mit vollem Zugriff",
      "Admins für Liga-Verwaltung",
      "Scorer nur für Spielberichte",
      "Erweiterte Rollen im Pro-Plan",
    ],
  },
  {
    badge: "Automatisierung",
    icon: CalendarClock,
    title: "Spielplan-Generator",
    description:
      "Erstelle automatisch Spielpläne für jede Runde deiner Liga. Ob Round-Robin, Hin- und Rückrunde oder K.O.-System – der Generator spart Stunden manueller Arbeit.",
    highlights: [
      "Automatische Spielplanerstellung",
      "Round-Robin und K.O.-System",
      "Flexible Terminvergabe",
      "Rückrunden mit einem Klick",
    ],
  },
]

export function FeatureShowcase() {
  const headerReveal = useScrollReveal()

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={headerReveal.ref}
          className={`text-center mb-16 sm:mb-20 ${revealClasses(headerReveal)}`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            Weitere leistungsstarke Tools
          </h2>
          <p className="mt-4 text-lg text-brand-slate max-w-2xl mx-auto">
            Neben den Kernfunktionen bietet PuckHub eine Reihe weiterer Tools,
            die den Liga-Alltag erleichtern.
          </p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {features.map((feature, index) => (
            <FeatureSpotlight
              key={feature.title}
              feature={feature}
              reversed={index % 2 !== 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureSpotlight({
  feature,
  reversed,
}: {
  feature: ShowcaseFeature
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
          {feature.badge}
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-4">{feature.title}</h3>
        <p className="text-lg text-brand-slate mb-6 leading-relaxed">
          {feature.description}
        </p>
        <ul className="space-y-3">
          {feature.highlights.map((h) => (
            <li key={h} className="flex items-start gap-3">
              <Check className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <span className="text-brand-slate">{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Visual */}
      <div className={reversed ? "lg:order-1" : ""}>
        {feature.screenshot ? (
          <div className="relative">
            <div className="absolute inset-0 bg-brand-gold/5 rounded-2xl blur-2xl -z-10" />
            <div className="rounded-xl border border-white/10 bg-brand-navy-light shadow-2xl overflow-hidden">
              <img
                src={feature.screenshot}
                alt={feature.title}
                className="w-full"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = "none"
                  target.parentElement!.insertAdjacentHTML(
                    "beforeend",
                    `<div class="aspect-video bg-gradient-to-br from-brand-navy-light to-brand-navy flex items-center justify-center text-brand-slate/40 text-lg p-8 text-center">${feature.title}</div>`,
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
                  <feature.icon className="h-12 w-12 text-brand-gold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {feature.highlights.map((h) => (
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
