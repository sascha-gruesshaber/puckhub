import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router"
import {
  FileText,
  GitBranch,
  Handshake,
  LogOut,
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
import { LanguagePicker } from "~/components/languagePicker"

import { PageSkeleton } from "~/components/pageSkeleton"
import { SeasonIndicator } from "~/components/seasonIndicator"
import { SeasonPickerModal } from "~/components/seasonPickerModal"
import { SeasonProvider, useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { signOut, useSession } from "../../lib/auth-client"
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
  | "/games"
  | "/venues"
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
}

interface DisabledItem {
  label: string
  icon: React.ReactNode
  disabled: true
  badge?: string
}

interface SeasonScopedItem {
  label: string
  icon: React.ReactNode
  seasonRoute: "/seasons/$seasonId/structure" | "/seasons/$seasonId/roster"
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
    <SeasonProvider>
      <SidebarLayout session={session} />
    </SeasonProvider>
  )
}

// ---------------------------------------------------------------------------
// Sidebar + Content (extracted so useWorkingSeason is inside SeasonProvider)
// ---------------------------------------------------------------------------
function SidebarLayout({ session }: { session: { user: { email: string } } }) {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const { season } = useWorkingSeason()
  const { data: settings } = trpc.settings.get.useQuery()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ label: string; route: string }>({
    label: "",
    route: "",
  })
  const translatedNavGroups = [
    {
      label: t("sidebar.groups.gameOperations"),
      items: [
        { to: "/games", label: t("sidebar.items.games"), icon: <IconPuck /> },
        { to: "/venues", label: t("sidebar.items.venues"), icon: <MapPin {...iconProps} /> },
        { label: t("sidebar.items.standings"), icon: <Trophy {...iconProps} />, disabled: true, badge: "Soon" },
        { label: t("sidebar.items.stats"), icon: <TrendingUp {...iconProps} />, disabled: true, badge: "Soon" },
      ],
    },
    {
      label: t("sidebar.groups.leagueManagement"),
      items: [
        {
          label: t("sidebar.items.seasonStructure"),
          icon: <GitBranch {...iconProps} />,
          seasonRoute: "/seasons/$seasonId/structure",
        },
        { label: t("sidebar.items.roster"), icon: <Users {...iconProps} />, seasonRoute: "/seasons/$seasonId/roster" },
        { to: "/teams", label: t("sidebar.items.teams"), icon: <Shield {...iconProps} /> },
        { to: "/players", label: t("sidebar.items.players"), icon: <Users {...iconProps} /> },
        { to: "/trikots", label: t("sidebar.items.trikots"), icon: <Shirt {...iconProps} /> },
      ],
    },
    {
      label: t("sidebar.groups.content"),
      items: [
        { to: "/news", label: t("sidebar.items.news"), icon: <Newspaper {...iconProps} /> },
        { to: "/pages", label: t("sidebar.items.pages"), icon: <FileText {...iconProps} /> },
        { to: "/sponsors", label: t("sidebar.items.sponsors"), icon: <Handshake {...iconProps} /> },
      ],
    },
    {
      label: t("sidebar.groups.system"),
      items: [
        { to: "/users", label: t("sidebar.items.users"), icon: <UserCog {...iconProps} /> },
        { to: "/settings", label: t("sidebar.items.settings"), icon: <Settings {...iconProps} /> },
      ],
    },
  ] as NavGroup[]

  const initials = session.user.email ? session.user.email.substring(0, 2).toUpperCase() : "U"

  async function handleSignOut() {
    await signOut()
    navigate({ to: "/login" })
  }

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
              width: 34,
              height: 34,
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
              {settings?.leagueName ?? t("sidebar.leagueAdmin")}
            </div>
          </div>
        </div>

        {/* Season Indicator */}
        <SeasonIndicator />

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 overflow-y-auto" style={{ padding: "16px 12px" }}>
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

        {/* User */}
        <div
          className="shrink-0"
          style={{
            padding: "12px",
            borderTop: "1px solid var(--sidebar-border)",
          }}
        >
          {/* Language Toggle */}
          <div style={{ marginBottom: 10 }}>
            <LanguagePicker />
          </div>

          {/* User Info */}
          <div
            className="flex items-center gap-2.5"
            style={{
              padding: "8px 8px",
              borderRadius: 9,
              background: "rgba(255, 255, 255, 0.025)",
            }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "linear-gradient(135deg, #1B365D, #264573)",
                color: "#8B9DB8",
                fontSize: 10.5,
                fontWeight: 700,
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {initials}
            </div>
            <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 500, color: "#94A3B8" }}>
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              title={t("logout")}
              className="flex items-center justify-center shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--sidebar-text-muted)",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)"
                e.currentTarget.style.color = "#94A3B8"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--sidebar-text-muted)"
              }}
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <main
        className="flex-1 min-h-screen"
        style={{
          marginLeft: "var(--sidebar-width)",
          background: "var(--content-bg)",
        }}
      >
        <div className="content-enter" style={{ padding: "36px 44px" }}>
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
