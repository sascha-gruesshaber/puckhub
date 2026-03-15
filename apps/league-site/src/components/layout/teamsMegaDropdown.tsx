import { Link } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { useOrg, useSeason } from "~/lib/context"
import { Skeleton } from "../shared/loadingSkeleton"
import { TeamLogo } from "../shared/teamLogo"
import { trpc } from "../../../lib/trpc"
import type { MenuPage } from "./siteHeader"

// ---------------------------------------------------------------------------
// Desktop mega-dropdown (hover-triggered)
// ---------------------------------------------------------------------------

export function TeamsDesktopMegaDropdown({ page, link }: { page: MenuPage; link: { to: any; params: any } }) {
  const org = useOrg()
  const season = useSeason()

  const { data: teams, isLoading } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: season.current?.id },
    { staleTime: 300_000 },
  )

  return (
    <div className="relative group">
      <Link
        to={link.to}
        params={link.params}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
        activeProps={{ className: "bg-white/15" }}
      >
        {page.title}
        <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-180" />
      </Link>

      {/* Mega-dropdown panel */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        <div className="w-[460px] rounded-lg bg-league-header-bg shadow-lg ring-1 ring-white/10">
          <div className="max-h-[400px] overflow-y-auto p-3">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 rounded-md p-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    to="/teams/$teamId"
                    params={{ teamId: team.id }}
                    className="flex flex-col items-center gap-1.5 rounded-md p-2 transition-colors hover:bg-white/10"
                    activeProps={{ className: "bg-white/15 ring-1 ring-white/20" }}
                    style={{ borderTop: `2px solid ${team.primaryColor || "transparent"}` }}
                  >
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
                    <span className="text-xs font-medium text-center leading-tight line-clamp-2">
                      {team.shortName || team.name}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* Child page links (if any) */}
          {page.children.length > 0 && (
            <div className="border-t border-white/10 py-1">
              {page.children.map((child) =>
                child.routePath ? (
                  <Link
                    key={child.id}
                    to={child.routePath as any}
                    className="block px-4 py-2 text-sm transition-colors hover:bg-white/10"
                    activeProps={{ className: "bg-white/15" }}
                  >
                    {child.title}
                  </Link>
                ) : (
                  <Link
                    key={child.id}
                    to="/$slug"
                    params={{ slug: `${page.slug}/${child.slug}` }}
                    className="block px-4 py-2 text-sm transition-colors hover:bg-white/10"
                    activeProps={{ className: "bg-white/15" }}
                  >
                    {child.title}
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile grid (inside accordion)
// ---------------------------------------------------------------------------

export function TeamsMobileGrid({ page, onNavigate }: { page: MenuPage; onNavigate: () => void }) {
  const org = useOrg()
  const season = useSeason()

  const { data: teams, isLoading } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: season.current?.id },
    { staleTime: 300_000 },
  )

  return (
    <div className="ml-4 border-l border-white/10 pl-2 space-y-2 py-1">
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 rounded-md p-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {teams.map((team) => (
            <Link
              key={team.id}
              to="/teams/$teamId"
              params={{ teamId: team.id }}
              className="flex flex-col items-center gap-1.5 rounded-md p-2 transition-colors hover:bg-white/10"
              activeProps={{ className: "bg-white/15 ring-1 ring-white/20" }}
              style={{ borderTop: `2px solid ${team.primaryColor || "transparent"}` }}
              onClick={onNavigate}
            >
              <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
              <span className="text-xs font-medium text-center leading-tight line-clamp-2">
                {team.shortName || team.name}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Child page links */}
      {page.children.map((child) =>
        child.routePath ? (
          <Link
            key={child.id}
            to={child.routePath as any}
            className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 opacity-80"
            activeProps={{ className: "bg-white/15 opacity-100" }}
            onClick={onNavigate}
          >
            {child.title}
          </Link>
        ) : (
          <Link
            key={child.id}
            to="/$slug"
            params={{ slug: `${page.slug}/${child.slug}` }}
            className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 opacity-80"
            activeProps={{ className: "bg-white/15 opacity-100" }}
            onClick={onNavigate}
          >
            {child.title}
          </Link>
        ),
      )}

    </div>
  )
}
