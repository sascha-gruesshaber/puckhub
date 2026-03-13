import { Link } from "@tanstack/react-router"
import { ChevronDown, Menu, X } from "lucide-react"
import { useState } from "react"
import { useOrg, useSettings, useSiteConfig } from "~/lib/context"
import { cn } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

type MenuPage = {
  id: string
  title: string
  slug: string
  isSystemRoute: boolean
  routePath: string | null
  parentId: string | null
  parent: { slug: string } | null
  children: { id: string; title: string; slug: string }[]
}

function getPageLink(page: Pick<MenuPage, "isSystemRoute" | "routePath" | "slug" | "parentId" | "parent">) {
  if (page.isSystemRoute && page.routePath) {
    return { to: page.routePath as any, params: undefined }
  }
  const slug = page.parentId && page.parent ? `${page.parent.slug}/${page.slug}` : page.slug
  return { to: "/$slug" as const, params: { slug } }
}

function DesktopNavItem({ page }: { page: MenuPage }) {
  const link = getPageLink(page)
  const hasChildren = page.children.length > 0

  if (!hasChildren) {
    return (
      <Link
        to={link.to}
        params={link.params}
        className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
        activeProps={{ className: "bg-white/15" }}
        activeOptions={{ exact: page.isSystemRoute && page.routePath === "/" }}
      >
        {page.title}
      </Link>
    )
  }

  return (
    <div className="relative group">
      <Link
        to={link.to}
        params={link.params}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
        activeProps={{ className: "bg-white/15" }}
        activeOptions={{ exact: page.isSystemRoute && page.routePath === "/" }}
      >
        {page.title}
        <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-180" />
      </Link>

      {/* Dropdown */}
      <div className="absolute left-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        <div className="min-w-[180px] rounded-lg bg-league-header-bg shadow-lg ring-1 ring-white/10 py-1">
          {page.children.map((child) => (
            <Link
              key={child.id}
              to="/$slug"
              params={{ slug: `${page.slug}/${child.slug}` }}
              className="block px-4 py-2 text-sm transition-colors hover:bg-white/10"
              activeProps={{ className: "bg-white/15" }}
            >
              {child.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null)
  const org = useOrg()
  const settings = useSettings()
  const config = useSiteConfig()

  const { data: menuPages } = trpc.publicSite.getMenuPages.useQuery(
    { organizationId: org.id, location: "main_nav" },
    { staleTime: 300_000 },
  )

  // Only show top-level pages (not sub-pages that individually have main_nav)
  const topLevelMenuPages = menuPages?.filter((p) => !p.parentId)

  return (
    <header className="sticky top-0 z-50 bg-league-header-bg text-league-header-text shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + League Name */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={settings.leagueName} className="h-10 w-10 object-contain" />
            ) : org.logo ? (
              <img src={org.logo} alt={settings.leagueName} className="h-10 w-10 object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-league-primary text-white font-bold text-lg">
                {settings.leagueShortName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-bold hidden sm:block">{settings.leagueShortName}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {topLevelMenuPages?.map((page) => (
              <DesktopNavItem key={page.id} page={page} />
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
          mobileOpen ? "max-h-[80vh] border-t border-white/10 overflow-y-auto" : "max-h-0",
        )}
      >
        <nav className="px-4 py-3 space-y-1">
          {topLevelMenuPages?.map((page) => {
            const link = getPageLink(page)
            const hasChildren = page.children.length > 0
            const isExpanded = expandedMobileId === page.id

            return (
              <div key={page.id}>
                <div className="flex items-center">
                  <Link
                    to={link.to}
                    params={link.params}
                    className="flex-1 block px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
                    activeProps={{ className: "bg-white/15" }}
                    activeOptions={{ exact: page.isSystemRoute && page.routePath === "/" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {page.title}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      className="p-2 rounded-md hover:bg-white/10 transition-colors"
                      onClick={() => setExpandedMobileId(isExpanded ? null : page.id)}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-4 border-l border-white/10 pl-2 space-y-1">
                    {page.children.map((child) => (
                      <Link
                        key={child.id}
                        to="/$slug"
                        params={{ slug: `${page.slug}/${child.slug}` }}
                        className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 opacity-80"
                        activeProps={{ className: "bg-white/15 opacity-100" }}
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
