import { Link } from "@tanstack/react-router"
import { useOrg, useSettings } from "~/lib/context"
import { trpc } from "../../../lib/trpc"

export function SiteFooter() {
  const org = useOrg()
  const settings = useSettings()

  const { data: footerPages } = trpc.publicSite.getMenuPages.useQuery(
    { organizationId: org.id, location: "footer" },
    { staleTime: 300_000 },
  )

  const { data: sponsors } = trpc.publicSite.listSponsors.useQuery(
    { organizationId: org.id },
    { staleTime: 300_000 },
  )

  return (
    <footer className="bg-league-footer-bg text-league-footer-text">
      {/* Sponsor bar */}
      {sponsors && sponsors.length > 0 && (
        <div className="border-b border-white/5 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs uppercase tracking-wider text-center mb-4 opacity-60">Unsere Sponsoren</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {sponsors.map((sponsor) => (
                <a
                  key={sponsor.id}
                  href={sponsor.websiteUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={sponsor.hoverText ?? sponsor.name}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} className="h-8 max-w-[120px] object-contain" />
                  ) : (
                    <span className="text-sm font-medium">{sponsor.name}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm opacity-70">
            &copy; {new Date().getFullYear()} {settings.leagueName}
          </div>

          {footerPages && footerPages.length > 0 && (
            <nav className="flex gap-4 text-sm">
              {footerPages.map((page) => (
                <Link
                  key={page.id}
                  to="/$slug"
                  params={{ slug: page.slug }}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          )}

          <div className="text-xs opacity-40">
            Powered by PuckHub
          </div>
        </div>
      </div>
    </footer>
  )
}
