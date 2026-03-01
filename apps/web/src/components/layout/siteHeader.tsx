import { Link } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { useOrg, useSettings, useSiteConfig } from "~/lib/context"
import { cn } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

const mainNavLinks = [
  { to: "/", label: "Start" },
  { to: "/standings", label: "Tabelle" },
  { to: "/schedule", label: "Spielplan" },
  { to: "/teams", label: "Teams" },
  { to: "/stats", label: "Statistiken" },
  { to: "/news", label: "News" },
] as const

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const org = useOrg()
  const settings = useSettings()
  const config = useSiteConfig()

  const { data: menuPages } = trpc.publicSite.getMenuPages.useQuery(
    { organizationId: org.id, location: "main_nav" },
    { staleTime: 300_000 },
  )

  return (
    <header className="sticky top-0 z-50 bg-web-header-bg text-web-header-text shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + League Name */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={settings.leagueName} className="h-10 w-10 object-contain" />
            ) : org.logo ? (
              <img src={org.logo} alt={settings.leagueName} className="h-10 w-10 object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-web-primary text-white font-bold text-lg">
                {settings.leagueShortName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-bold hidden sm:block">{settings.leagueShortName}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {mainNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
                activeProps={{ className: "bg-white/15" }}
                activeOptions={{ exact: link.to === "/" }}
              >
                {link.label}
              </Link>
            ))}
            {menuPages?.map((page) => (
              <Link
                key={page.id}
                to="/$slug"
                params={{ slug: page.slug }}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
                activeProps={{ className: "bg-white/15" }}
              >
                {page.title}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menü öffnen"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          mobileOpen ? "max-h-96 border-t border-white/10" : "max-h-0",
        )}
      >
        <nav className="px-4 py-3 space-y-1">
          {mainNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
              activeProps={{ className: "bg-white/15" }}
              activeOptions={{ exact: link.to === "/" }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {menuPages?.map((page) => (
            <Link
              key={page.id}
              to="/$slug"
              params={{ slug: page.slug }}
              className="block px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
              activeProps={{ className: "bg-white/15" }}
              onClick={() => setMobileOpen(false)}
            >
              {page.title}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
