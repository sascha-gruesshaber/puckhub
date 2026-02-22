import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router"
import { Building2, Clock, LayoutDashboard, Users } from "lucide-react"
import { Suspense } from "react"
import { TopBar } from "~/components/topBar"
import { useSession } from "@/auth-client"

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
})

const iconProps = { size: 18, strokeWidth: 1.5 } as const

function AuthedLayout() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#f8fafc" }}>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
            color: "#0C1929",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          P
        </div>
      </div>
    )
  }

  if (!session) {
    navigate({ to: "/login" })
    return null
  }

  // Check platform admin role
  const userRole = (session.user as any)?.role
  if (userRole !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#f8fafc" }}>
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a platform admin role to access this application.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
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
            <div style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              PuckHub
            </div>
            <div style={{ color: "var(--sidebar-text-muted)", fontSize: 11, fontWeight: 500, lineHeight: 1.4 }}>
              Platform Admin
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
            <LayoutDashboard {...iconProps} />
            Dashboard
          </Link>

          <div style={{ marginBottom: 20 }}>
            <div className="sidebar-group-label">Platform</div>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <Link
                to="/organizations"
                className="sidebar-link"
                activeProps={{ className: "sidebar-link sidebar-link-active" }}
              >
                <Building2 {...iconProps} />
                Leagues
              </Link>
              <Link to="/users" className="sidebar-link" activeProps={{ className: "sidebar-link sidebar-link-active" }}>
                <Users {...iconProps} />
                Users
              </Link>
              <Link to="/jobs" className="sidebar-link" activeProps={{ className: "sidebar-link sidebar-link-active" }}>
                <Clock {...iconProps} />
                Jobs
              </Link>
            </div>
          </div>

        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen flex flex-col" style={{ marginLeft: "var(--sidebar-width)", background: "var(--content-bg)" }}>
        <TopBar />
        <div className="content-enter flex-1" style={{ padding: "24px 44px" }}>
          <Suspense
            fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 rounded bg-muted" />
                <div className="h-4 w-72 rounded bg-muted" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
