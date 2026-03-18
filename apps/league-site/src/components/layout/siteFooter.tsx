import { Link } from "@tanstack/react-router"
import { useOrg, useSettings } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { getAdminUrl, getMarketingUrl } from "../../../lib/env"
import { trpc } from "../../../lib/trpc"

function getPageLink(page: {
  isSystemRoute: boolean
  routePath: string | null
  slug: string
  parentId: string | null
  parent: { slug: string } | null
}) {
  if (page.isSystemRoute && page.routePath) {
    return { to: page.routePath as string, params: undefined as any }
  }
  const slug = page.parentId && page.parent ? `${page.parent.slug}/${page.slug}` : page.slug
  return { to: "/$slug" as const, params: { slug } as any }
}

export function SiteFooter() {
  const org = useOrg()
  const settings = useSettings()
  const t = useT()

  const { data: footerPages } = trpc.publicSite.getMenuPages.useQuery(
    { organizationId: org.id, location: "footer" },
    { staleTime: 300_000 },
  )

  const { data: sponsors } = trpc.publicSite.listSponsors.useQuery({ organizationId: org.id }, { staleTime: 300_000 })

  // Only show top-level footer pages (sub-pages that individually have footer location are shown via parent)
  const topLevelFooterPages = footerPages?.filter((p) => !p.parentId)

  return (
    <footer className="bg-league-footer-bg text-league-footer-text">
      {/* Sponsor bar */}
      {sponsors && sponsors.length > 0 && (
        <div className="border-b border-white/5 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs uppercase tracking-wider text-center mb-4 opacity-60">{t.layout.ourSponsors}</p>
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

          {topLevelFooterPages && topLevelFooterPages.length > 0 && (
            <nav className="flex gap-4 text-sm">
              {topLevelFooterPages.map((page) => {
                const link = getPageLink(page)
                return (
                  <Link
                    key={page.id}
                    to={link.to}
                    params={link.params}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {page.title}
                  </Link>
                )
              })}
            </nav>
          )}

          <div className="flex items-center gap-3 text-xs opacity-40">
            <a href={getAdminUrl()} className="underline hover:opacity-80">
              {t.layout.admin}
            </a>
            <span aria-hidden="true">&middot;</span>
            <span>
              Powered by{" "}
              <a
                href={getMarketingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
              >
                PuckHub
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
