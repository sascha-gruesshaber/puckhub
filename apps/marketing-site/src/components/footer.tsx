import { Link } from "@tanstack/react-router"

export function Footer() {
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
              Impressum
            </Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">
              Datenschutz
            </Link>
          </nav>

          <p className="text-sm text-brand-slate/60">
            &copy; {new Date().getFullYear()} PuckHub. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  )
}
