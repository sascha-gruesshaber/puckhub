import { Link } from "@tanstack/react-router"
import { useT } from "~/i18n"

export function Footer() {
  const t = useT()

  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white">
              Puck<span className="text-brand-gold">Hub</span>
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-brand-slate">
            <Link to="/impressum" className="hover:text-white transition-colors">
              {t.footer.impressum}
            </Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">
              {t.footer.datenschutz}
            </Link>
          </nav>

          <p className="text-sm text-brand-slate/60">
            &copy; {new Date().getFullYear()} PuckHub. {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
