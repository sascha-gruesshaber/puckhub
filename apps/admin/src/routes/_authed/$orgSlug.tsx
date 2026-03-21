import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import {
  FileText,
  GitBranch,
  Globe,
  Handshake,
  LayoutDashboard,
  Newspaper,
  Settings,
  Shield,
  Shirt,
  UserCog,
  Users,
} from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { PageSkeleton } from "~/components/pageSkeleton"
import { SeasonPickerModal } from "~/components/seasonPickerModal"
import { TopBar } from "~/components/topBar"
import { MobileSidebarProvider, useMobileSidebar } from "~/contexts/mobileSidebarContext"
import { useOrganization } from "~/contexts/organizationContext"
import { type NavPermission, PermissionsProvider, usePermissions } from "~/contexts/permissionsContext"
import { SeasonProvider, useWorkingSeason } from "~/contexts/seasonContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import "~/styles/dataList.css"
import "~/styles/navigation.css"

export const Route = createFileRoute("/_authed/$orgSlug")({
  component: OrgSlugLayout,
})

// ---------------------------------------------------------------------------
// Custom icon — no Lucide equivalent for a hockey puck
// ---------------------------------------------------------------------------
function IconPuck() {
  return (
    <svg
      aria-hidden="true"
      width={18}
      height={18}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="10" cy="8" rx="7" ry="3.5" />
      <path d="M3 8v3.5c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5V8" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Shared icon props for Lucide icons in sidebar
// ---------------------------------------------------------------------------
const iconProps = { size: 18, strokeWidth: 1.5 } as const

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------
type RouteLink =
  | "/$orgSlug"
  | "/$orgSlug/games"
  | "/$orgSlug/teams"
  | "/$orgSlug/players"
  | "/$orgSlug/trikots"
  | "/$orgSlug/sponsors"
  | "/$orgSlug/news"
  | "/$orgSlug/pages"
  | "/$orgSlug/users"
  | "/$orgSlug/website"
  | "/$orgSlug/settings"

interface ActiveItem {
  to: RouteLink
  label: string
  icon: React.ReactNode
  exact?: boolean
  permission?: NavPermission
}

interface DisabledItem {
  label: string
  icon: React.ReactNode
  disabled: true
  badge?: string
  permission?: NavPermission
}

interface SeasonScopedItem {
  label: string
  icon: React.ReactNode
  seasonRoute: "/$orgSlug/seasons/$seasonId/structure" | "/$orgSlug/seasons/$seasonId/roster"
  permission?: NavPermission
}

type NavItem = ActiveItem | DisabledItem | SeasonScopedItem

interface NavGroup {
  label: string
  items: NavItem[]
}

function isActive(item: NavItem): item is ActiveItem {
  return "to" in item
}

function isSeasonScoped(item: NavItem): item is SeasonScopedItem {
  return "seasonRoute" in item
}

// ---------------------------------------------------------------------------
// Layout — resolve slug, sync session, render sidebar
// ---------------------------------------------------------------------------
function OrgSlugLayout() {
  const { orgSlug } = Route.useParams()
  const { organizations, organization, switchOrganization, isLoading } = useOrganization()
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(false)

  // Find the org matching the URL slug
  const matchedOrg = organizations.find((o) => o.slug === orgSlug)

  // Redirect to org picker if slug doesn't match any org
  useEffect(() => {
    if (isLoading || syncing) return
    if (!matchedOrg) {
      navigate({ to: "/", search: { redirect: undefined, switchOrg: undefined } })
    }
  }, [matchedOrg, isLoading, syncing, navigate])

  // Sync session's active org if it differs from URL
  useEffect(() => {
    if (isLoading || syncing || !matchedOrg) return
    if (organization?.id !== matchedOrg.id) {
      setSyncing(true)
      switchOrganization(matchedOrg.id).finally(() => setSyncing(false))
    }
  }, [matchedOrg, organization?.id, isLoading, syncing, switchOrganization])

  if (isLoading || syncing || !matchedOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="pulse-brand flex items-center justify-center rounded-xl"
            style={{
              width: 44,
              height: 44,
              background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
              color: "#0C1929",
              fontWeight: 800,
              fontSize: 20,
            }}
          >
            P
          </div>
        </div>
      </div>
    )
  }

  // Session is in sync, org is resolved — render the sidebar layout
  return (
    <MobileSidebarProvider>
      <SeasonProvider>
        <PermissionsProvider>
          <SidebarLayout orgSlug={orgSlug} />
        </PermissionsProvider>
      </SeasonProvider>
    </MobileSidebarProvider>
  )
}

// ---------------------------------------------------------------------------
// Sidebar + Content (extracted so useWorkingSeason is inside SeasonProvider)
// ---------------------------------------------------------------------------
function SidebarLayout({ orgSlug }: { orgSlug: string }) {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const { season } = useWorkingSeason()
  const { organization } = useOrganization()
  const { data: settings } = trpc.settings.get.useQuery()
  const { canSee } = usePermissions()
  const { canUseFeature } = usePlanLimits()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ label: string; route: string }>({
    label: "",
    route: "",
  })
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useMobileSidebar()
  const _pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  // Build trikots item — locked if featureTrikotDesigner is off
  const trikotsItem: NavItem = canUseFeature("featureTrikotDesigner")
    ? {
        to: "/$orgSlug/trikots",
        label: t("sidebar.items.trikots"),
        icon: <Shirt {...iconProps} />,
        permission: "trikots",
      }
    : {
        label: t("sidebar.items.trikots"),
        icon: <Shirt {...iconProps} />,
        disabled: true as const,
        badge: "PRO",
        permission: "trikots",
      }

  // Build sponsors item — locked if featureSponsorMgmt is off
  const sponsorsItem: NavItem = canUseFeature("featureSponsorMgmt")
    ? {
        to: "/$orgSlug/sponsors",
        label: t("sidebar.items.sponsors"),
        icon: <Handshake {...iconProps} />,
        permission: "sponsors",
      }
    : {
        label: t("sidebar.items.sponsors"),
        icon: <Handshake {...iconProps} />,
        disabled: true as const,
        badge: "PRO",
        permission: "sponsors",
      }

  // Build website item — locked if featureWebsiteBuilder is off
  const websiteItem: NavItem = canUseFeature("featureWebsiteBuilder")
    ? {
        to: "/$orgSlug/website",
        label: t("sidebar.items.website"),
        icon: <Globe {...iconProps} />,
        permission: "settings",
      }
    : {
        label: t("sidebar.items.website"),
        icon: <Globe {...iconProps} />,
        disabled: true as const,
        badge: "PRO",
        permission: "settings",
      }

  const allNavGroups: NavGroup[] = [
    {
      label: t("sidebar.groups.leagueManagement"),
      items: [
        { to: "/$orgSlug/games", label: t("sidebar.items.games"), icon: <IconPuck />, permission: "games" },
        {
          label: t("sidebar.items.seasonStructure"),
          icon: <GitBranch {...iconProps} />,
          seasonRoute: "/$orgSlug/seasons/$seasonId/structure",
          permission: "seasonStructure",
        },
        {
          label: t("sidebar.items.roster"),
          icon: <Users {...iconProps} />,
          seasonRoute: "/$orgSlug/seasons/$seasonId/roster",
          permission: "roster",
        },
        {
          to: "/$orgSlug/teams",
          label: t("sidebar.items.teams"),
          icon: <Shield {...iconProps} />,
          permission: "teams",
        },
        {
          to: "/$orgSlug/players",
          label: t("sidebar.items.players"),
          icon: <Users {...iconProps} />,
          permission: "players",
        },
        trikotsItem,
      ],
    },
    {
      label: t("sidebar.groups.content"),
      items: [
        {
          to: "/$orgSlug/news",
          label: t("sidebar.items.news"),
          icon: <Newspaper {...iconProps} />,
          permission: "news",
        },
        {
          to: "/$orgSlug/pages",
          label: t("sidebar.items.pages"),
          icon: <FileText {...iconProps} />,
          permission: "pages",
        },
        sponsorsItem,
      ],
    },
    {
      label: t("sidebar.groups.system"),
      items: [
        {
          to: "/$orgSlug/users",
          label: t("sidebar.items.users"),
          icon: <UserCog {...iconProps} />,
          permission: "users",
        },
        websiteItem,
        {
          to: "/$orgSlug/settings",
          label: t("sidebar.items.settings"),
          icon: <Settings {...iconProps} />,
          permission: "settings",
        },
      ],
    },
  ]

  // Filter nav groups by permissions — remove items the user cannot see, then remove empty groups
  const translatedNavGroups = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || canSee(item.permission)),
    }))
    .filter((group) => group.items.length > 0)

  function handleSeasonScopedClick(item: SeasonScopedItem) {
    if (season) {
      navigate({
        to: item.seasonRoute,
        params: { orgSlug, seasonId: season.id },
      })
    } else {
      setPickerTarget({ label: item.label, route: item.seasonRoute })
      setPickerOpen(true)
    }
  }

  function handlePickerSelect(seasonId: string) {
    if (pickerTarget.route) {
      navigate({
        to: pickerTarget.route,
        params: { orgSlug, seasonId },
      })
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* --- Mobile Backdrop --- */}
      {sidebarOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: presentational backdrop overlay that dismisses sidebar
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={() => setSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "var(--sidebar-width)",
          background: "var(--sidebar-bg)",
          boxShadow: "4px 0 32px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 shrink-0"
          style={{
            padding: "20px 20px 18px",
            borderBottom: "1px solid var(--sidebar-border)",
          }}
        >
          <div
            className="flex items-center justify-center shrink-0 rounded-lg"
            style={{
              width: "var(--brand-logo-size)",
              height: "var(--brand-logo-size)",
              background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
              color: "#0C1929",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {(settings?.leagueShortName || settings?.leagueName || organization?.name || "PH")
              .slice(0, 3)
              .toUpperCase()}
          </div>
          <div>
            <div
              style={{
                color: "#E2E8F0",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {settings?.leagueName || organization?.name || t("sidebar.leagueAdmin")}
            </div>
            <div
              style={{
                color: "var(--sidebar-text-muted)",
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              PuckHub
            </div>
          </div>
        </div>

        {/* Navigation */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: nav click closes mobile sidebar on tap */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: nav click closes mobile sidebar on touch/click anywhere in nav */}
        <nav
          className="sidebar-nav flex-1 overflow-y-auto"
          style={{ padding: "16px 12px" }}
          onClick={() => setSidebarOpen(false)}
        >
          <Link
            to="/$orgSlug"
            params={{ orgSlug }}
            activeOptions={{ exact: true }}
            className="sidebar-link"
            activeProps={{ className: "sidebar-link sidebar-link-active" }}
            style={{ marginBottom: 18 }}
          >
            <span className="flex shrink-0">
              <LayoutDashboard {...iconProps} />
            </span>
            {t("sidebar.items.dashboard")}
          </Link>
          {translatedNavGroups.map((group, gi) => (
            <div key={group.label} style={{ marginBottom: gi < translatedNavGroups.length - 1 ? 22 : 0 }}>
              <div className="sidebar-group-label">{group.label}</div>
              <div className="flex flex-col" style={{ gap: 2 }}>
                {group.items.map((item) => {
                  if (isSeasonScoped(item)) {
                    return season ? (
                      <Link
                        key={item.label}
                        to={item.seasonRoute}
                        params={{ orgSlug, seasonId: season.id }}
                        className="sidebar-link"
                        activeProps={{ className: "sidebar-link sidebar-link-active" }}
                      >
                        <span className="flex shrink-0">{item.icon}</span>
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        key={item.label}
                        onClick={() => handleSeasonScopedClick(item)}
                        className="sidebar-link"
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        <span className="flex shrink-0">{item.icon}</span>
                        {item.label}
                      </button>
                    )
                  }

                  if (isActive(item)) {
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        params={{ orgSlug }}
                        activeOptions={item.exact ? { exact: true } : undefined}
                        className="sidebar-link"
                        activeProps={{ className: "sidebar-link sidebar-link-active" }}
                      >
                        <span className="flex shrink-0">{item.icon}</span>
                        {item.label}
                      </Link>
                    )
                  }

                  // Disabled item
                  return (
                    <div key={item.label} className="sidebar-disabled">
                      <span className="flex shrink-0" style={{ opacity: 0.45 }}>
                        {item.icon}
                      </span>
                      <span style={{ opacity: 0.55 }}>{item.label}</span>
                      {item.badge && (
                        <span
                          className="ml-auto shrink-0"
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--sidebar-text-muted)",
                            background: "rgba(255, 255, 255, 0.03)",
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid var(--sidebar-border)",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* --- Main content --- */}
      <main className="flex-1 min-h-screen flex flex-col lg:ml-[260px]" style={{ background: "var(--content-bg)" }}>
        <TopBar />
        <div className="content-enter flex-1 px-4 py-4 sm:px-6 lg:px-11 lg:py-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Season Picker Modal (shown when no season selected and season-scoped nav clicked) */}
      <SeasonPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        targetLabel={pickerTarget.label}
      />
    </div>
  )
}
