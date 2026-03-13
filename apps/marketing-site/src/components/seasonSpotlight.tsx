import { ArrowRight } from "lucide-react"
import { useScrollReveal, revealClasses } from "~/hooks/useScrollEffects"

export function SeasonSpotlight() {
  const reveal = useScrollReveal()

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-brand-blue/[0.03] to-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={reveal.ref} className={`grid lg:grid-cols-2 gap-12 items-center ${revealClasses(reveal)}`}>
          {/* Text */}
          <div>
            <div className="inline-flex items-center rounded-full bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold mb-6">
              Highlight Feature
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Visueller Saison-Struktur-Builder
            </h2>
            <p className="text-lg text-brand-slate mb-6 leading-relaxed">
              Erstelle komplexe Saisonhierarchien per Drag & Drop auf einem interaktiven Canvas.
              Definiere Divisionen, Runden und Spielpläne – alles visuell und intuitiv.
            </p>
            <div className="space-y-4">
              {[
                { label: "Saison", desc: "Der übergreifende Zeitraum deiner Liga" },
                { label: "Division", desc: "Spielklassen oder Altersgruppen" },
                { label: "Runde", desc: "Vorrunde, Playoffs, Relegation" },
                { label: "Spiele", desc: "Automatischer Spielplan pro Runde" },
              ].map((item, i) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex items-center justify-center shrink-0 mt-1">
                    {i > 0 && (
                      <ArrowRight className="h-3.5 w-3.5 text-brand-gold/50 -ml-0.5 mr-1.5" />
                    )}
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-brand-gold/10 text-xs font-bold text-brand-gold">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">{item.label}</span>
                    <span className="text-brand-slate ml-1.5">– {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot */}
          <div className="relative">
            <div className="absolute inset-0 bg-brand-blue/10 rounded-2xl blur-2xl -z-10" />
            <div className="rounded-xl border border-white/10 bg-brand-navy-light shadow-2xl overflow-hidden">
              <img
                src="/screenshots/season-builder.png"
                alt="Saison-Struktur-Builder"
                className="w-full"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = "none"
                  target.parentElement!.insertAdjacentHTML(
                    "beforeend",
                    '<div class="aspect-video bg-gradient-to-br from-brand-navy-light to-brand-navy flex items-center justify-center text-brand-slate/40 text-lg p-8 text-center">Season Structure Builder Preview</div>',
                  )
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
