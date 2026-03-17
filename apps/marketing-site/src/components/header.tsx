import { useState, useEffect } from "react"
import { ChevronDown, Menu, X } from "lucide-react"
import { useT } from "~/i18n"

export function Header({ onOpenDemo }: { onOpenDemo?: () => void }) {
  const t = useT()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || mobileOpen ? "glass" : ""}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Puck<span className="text-brand-gold">Hub</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Features dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <a
                href="/#features"
                className="flex items-center gap-1 text-sm font-medium text-brand-slate hover:text-white transition-colors"
              >
                {t.header.features}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${featuresOpen ? "rotate-180" : ""}`} />
              </a>

              {featuresOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                  <div className="rounded-lg border border-white/10 bg-brand-navy-light/95 backdrop-blur-xl shadow-xl p-1.5 min-w-[200px]">
                    <a
                      href="/#features"
                      className="block rounded-md px-3 py-2 text-sm text-brand-slate hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setFeaturesOpen(false)}
                    >
                      {t.header.features}
                    </a>
                    <div className="h-px bg-white/5 my-1" />
                    {t.header.featuresSections.map((section) => (
                      <a
                        key={section.href}
                        href={`/${section.href}`}
                        className="block rounded-md px-3 py-2 text-sm text-brand-slate hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setFeaturesOpen(false)}
                      >
                        {section.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a
              href="/#pricing"
              className="text-sm font-medium text-brand-slate hover:text-white transition-colors"
            >
              {t.header.pricing}
            </a>

            <a
              href="/contact"
              className="text-sm font-medium text-brand-slate hover:text-white transition-colors"
            >
              {t.contact.navLabel}
            </a>

            {onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-gold-dark transition-colors"
              >
                {t.header.cta}
              </button>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-brand-slate hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 mt-2 pt-4">
            <a
              href="/#features"
              className="block py-2 text-sm font-medium text-brand-slate hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t.header.features}
            </a>
            {t.header.featuresSections.map((section) => (
              <a
                key={section.href}
                href={`/${section.href}`}
                className="block py-2 pl-4 text-sm text-brand-slate/70 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {section.label}
              </a>
            ))}
            <a
              href="/#pricing"
              className="block py-2 text-sm font-medium text-brand-slate hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t.header.pricing}
            </a>
            <a
              href="/contact"
              className="block py-2 text-sm font-medium text-brand-slate hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t.contact.navLabel}
            </a>
            {onOpenDemo && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  onOpenDemo()
                }}
                className="mt-2 inline-flex items-center rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy"
              >
                {t.header.cta}
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
