import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Preise", href: "/#pricing" },
]

export function Header({ onOpenDemo }: { onOpenDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass" : ""}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Puck<span className="text-brand-gold">Hub</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-slate hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-gold-dark transition-colors"
            >
              Demo testen
            </button>
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
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block py-2 text-sm font-medium text-brand-slate hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                onOpenDemo()
              }}
              className="mt-2 inline-flex items-center rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy"
            >
              Demo testen
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
