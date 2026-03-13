export function Hero({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight animate-fade-in-up">
            Die All-in-One Plattform{" "}
            <span className="gradient-text">für Eishockey-Ligen</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-slate max-w-2xl mx-auto animate-fade-in-up-delay-1">
            Saisonplanung, Spielberichte, Statistiken, Tabellen und eine eigene Liga-Website – alles in einer Plattform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-2">
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center rounded-lg bg-brand-gold px-6 py-3 text-base font-semibold text-brand-navy hover:bg-brand-gold-dark transition-colors shadow-lg shadow-brand-gold/20"
            >
              Demo testen
            </button>
            <a
              href="#pricing"
              className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/5 transition-colors"
            >
              Preise ansehen
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
