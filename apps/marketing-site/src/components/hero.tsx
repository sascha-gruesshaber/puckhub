import { useT } from "~/i18n"

export function Hero({ onOpenDemo }: { onOpenDemo: () => void }) {
  const t = useT()

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight animate-fade-in-up">
            {t.hero.titleLine1} <span className="gradient-text">{t.hero.titleLine2}</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-slate max-w-2xl mx-auto animate-fade-in-up-delay-1">
            {t.hero.subtitle}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-2">
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center rounded-lg bg-brand-gold px-6 py-3 text-base font-semibold text-brand-navy hover:bg-brand-gold-dark transition-colors shadow-lg shadow-brand-gold/20"
            >
              {t.hero.cta}
            </button>
            <a
              href="#pricing"
              className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/5 transition-colors"
            >
              {t.hero.pricing}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
