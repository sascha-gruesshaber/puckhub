import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router"
import { Building2, LayoutDashboard, LogOut, Users } from "lucide-react"
import { Suspense } from "react"
import { signOut, useSession } from "@/auth-client"

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

  const initials = session.user.email ? session.user.email.substring(0, 2).toUpperCase() : "U"

  async function handleSignOut() {
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col"
        style={{
          width: 240,
          background: "#0C1929",
          boxShadow: "4px 0 32px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 shrink-0"
          style={{
            padding: "20px 20px 18px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
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
            <div style={{ color: "rgba(148, 163, 184, 0.6)", fontSize: 11, fontWeight: 500, lineHeight: 1.4 }}>
              Platform Admin
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: "16px 12px" }}>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: "#94A3B8", marginBottom: 4 }}
            activeProps={{ style: { background: "rgba(255, 255, 255, 0.06)", color: "#E2E8F0" } }}
          >
            <LayoutDashboard {...iconProps} />
            Dashboard
          </Link>
          <Link
            to="/organizations"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: "#94A3B8", marginBottom: 4 }}
            activeProps={{ style: { background: "rgba(255, 255, 255, 0.06)", color: "#E2E8F0" } }}
          >
            <Building2 {...iconProps} />
            Organizations
          </Link>
          <Link
            to="/users"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: "#94A3B8" }}
            activeProps={{ style: { background: "rgba(255, 255, 255, 0.06)", color: "#E2E8F0" } }}
          >
            <Users {...iconProps} />
            Users
          </Link>
        </nav>

        {/* User */}
        <div className="shrink-0" style={{ padding: 12, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div
            className="flex items-center gap-2.5"
            style={{ padding: "8px", borderRadius: 9, background: "rgba(255, 255, 255, 0.025)" }}
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
              title="Sign out"
              className="flex items-center justify-center shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "rgba(148, 163, 184, 0.6)",
              }}
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen" style={{ marginLeft: 240, background: "#f8fafc" }}>
        <div style={{ padding: "36px 44px" }}>
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
