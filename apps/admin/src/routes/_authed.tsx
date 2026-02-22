import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router"
import {
  FileText,
  GitBranch,
  Handshake,
  LayoutDashboard,
  MapPin,
  Newspaper,
  Settings,
  Shield,
  Shirt,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
} from "lucide-react"
import { Suspense, useState } from "react"
import { OrgPickerPage } from "~/components/orgPickerPage"

import { PageSkeleton } from "~/components/pageSkeleton"
import { SeasonPickerModal } from "~/components/seasonPickerModal"
import { TopBar } from "~/components/topBar"
import { OrganizationProvider, useOrganization } from "~/contexts/organizationContext"
import { type NavPermission, PermissionsProvider, usePermissions } from "~/contexts/permissionsContext"
import { SeasonProvider, useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { useSession } from "../../lib/auth-client"
import { trpc } from "../../lib/trpc"
import "~/styles/dataList.css"

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
})

// ---------------------------------------------------------------------------
// Custom icon — no Lucide equivalent for a hockey puck
// ---------------------------------------------------------------------------
function IconPuck() {
  return (
    <svg
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
  | "/"
  | "/games"
  | "/venues"
  | "/standings"
  | "/stats"
  | "/teams"
  | "/players"
  | "/trikots"
  | "/sponsors"
  | "/news"
  | "/pages"
  | "/users"
  | "/settings"

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
  seasonRoute: "/seasons/$seasonId/structure" | "/seasons/$seasonId/roster"
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
// Layout
// ---------------------------------------------------------------------------
function AuthedLayout() {
  const { t } = useTranslation("common")
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--content-bg)" }}>
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
          <span style={{ color: "var(--sidebar-text)", fontSize: 13 }} suppressHydrationWarning>
            {t("loading")}
          </span>
        </div>
      </div>
    )
  }

  if (!session) {
    navigate({ to: "/login" })
    return null
  }

  return (
    <OrganizationProvider>
      <OrgGate />
    </OrganizationProvider>
  )
}

// ---------------------------------------------------------------------------
// Org Gate — shows org picker if no active org, otherwise renders sidebar
// ---------------------------------------------------------------------------
function OrgGate() {
  const { organization, isLoading } = useOrganization()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--content-bg)" }}>
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

  if (!organization) {
    return <OrgPickerPage />
  }

  return (
    <SeasonProvider>
      <PermissionsProvider>
        <SidebarLayout />
      </PermissionsProvider>
    </SeasonProvider>
  )
}

// ---------------------------------------------------------------------------
// Sidebar + Content (extracted so useWorkingSeason is inside SeasonProvider)
// ---------------------------------------------------------------------------
function SidebarLayout() {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const { season } = useWorkingSeason()
  const { organization } = useOrganization()
  const { data: settings } = trpc.settings.get.useQuery()
  const { canSee } = usePermissions()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ label: string; route: string }>({
    label: "",
    route: "",
  })
  const allNavGroups: NavGroup[] = [
    {
      label: t("sidebar.groups.gameOperations"),
      items: [
        { to: "/games", label: t("sidebar.items.games"), icon: <IconPuck />, permission: "games" },
        { to: "/venues", label: t("sidebar.items.venues"), icon: <MapPin {...iconProps} />, permission: "venues" },
        { to: "/standings", label: t("sidebar.items.standings"), icon: <Trophy {...iconProps} />, permission: "standings" },
        { to: "/stats", label: t("sidebar.items.stats"), icon: <TrendingUp {...iconProps} />, permission: "stats" },
      ],
    },
    {
      label: t("sidebar.groups.leagueManagement"),
      items: [
        {
          label: t("sidebar.items.seasonStructure"),
          icon: <GitBranch {...iconProps} />,
          seasonRoute: "/seasons/$seasonId/structure",
          permission: "seasonStructure",
        },
        { label: t("sidebar.items.roster"), icon: <Users {...iconProps} />, seasonRoute: "/seasons/$seasonId/roster", permission: "roster" },
        { to: "/teams", label: t("sidebar.items.teams"), icon: <Shield {...iconProps} />, permission: "teams" },
        { to: "/players", label: t("sidebar.items.players"), icon: <Users {...iconProps} />, permission: "players" },
        { to: "/trikots", label: t("sidebar.items.trikots"), icon: <Shirt {...iconProps} />, permission: "trikots" },
      ],
    },
    {
      label: t("sidebar.groups.content"),
      items: [
        { to: "/news", label: t("sidebar.items.news"), icon: <Newspaper {...iconProps} />, permission: "news" },
        { to: "/pages", label: t("sidebar.items.pages"), icon: <FileText {...iconProps} />, permission: "pages" },
        { to: "/sponsors", label: t("sidebar.items.sponsors"), icon: <Handshake {...iconProps} />, permission: "sponsors" },
      ],
    },
    {
      label: t("sidebar.groups.system"),
      items: [
        { to: "/users", label: t("sidebar.items.users"), icon: <UserCog {...iconProps} />, permission: "users" },
        { to: "/settings", label: t("sidebar.items.settings"), icon: <Settings {...iconProps} />, permission: "settings" },
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
        params: { seasonId: season.id },
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
        params: { seasonId },
      })
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ─── Sidebar ─── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col"
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
              fontSize: 15,
            }}
          >
            P
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
              PuckHub
            </div>
            <div
              style={{
                color: "var(--sidebar-text-muted)",
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {settings?.leagueName ?? organization?.name ?? t("sidebar.leagueAdmin")}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 overflow-y-auto" style={{ padding: "16px 12px" }}>
          <Link
            to="/"
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
                        params={{ seasonId: season.id }}
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

      {/* ─── Main content ─── */}
      <main
        className="flex-1 min-h-screen flex flex-col"
        style={{
          marginLeft: "var(--sidebar-width)",
          background: "var(--content-bg)",
        }}
      >
        <TopBar />
        <div className="content-enter flex-1" style={{ padding: "24px 44px" }}>
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
