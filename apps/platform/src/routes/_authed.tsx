import { Button } from "@puckhub/ui"
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { Building2, Clock, CreditCard, LogOut, Users } from "lucide-react"
import { Suspense, useEffect } from "react"
import { signOut, useSession } from "@/auth-client"
import { TopBar } from "~/components/topBar"
import { MobileSidebarProvider, useMobileSidebar } from "~/contexts/mobileSidebarContext"

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
})

const iconProps = { size: 18, strokeWidth: 1.5 } as const

function AuthedLayout() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
    const handleSignOut = async () => {
      await signOut()
      // Redirect to admin login after sign-out
      const parts = window.location.hostname.split(".")
      parts[0] = "admin"
      window.location.href = `${window.location.protocol}//${parts.join(".")}/login`
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a platform admin role to access this application.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <strong>{session.user.email}</strong>
          </p>
          <Button variant="outline" className="mt-4" onClick={handleSignOut}>
            <LogOut size={16} className="mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <MobileSidebarProvider>
      <PlatformSidebarLayout />
    </MobileSidebarProvider>
  )
}

function PlatformSidebarLayout() {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useMobileSidebar()
  const _pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-screen">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay has no meaningful keyboard interaction
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "var(--sidebar-width)",
          minWidth: "var(--sidebar-width)",
          background: "var(--sidebar-bg)",
          boxShadow: "4px 0 32px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 shrink-0"
          style={{
            height: 52,
            padding: "0 20px",
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
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: nav click closes mobile sidebar on link navigation */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: nav click closes mobile sidebar on link navigation */}
        <nav
          className="sidebar-nav flex-1 overflow-y-auto"
          style={{ padding: "16px 12px" }}
          onClick={() => setSidebarOpen(false)}
        >
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
              <Link
                to="/plans"
                className="sidebar-link"
                activeProps={{ className: "sidebar-link sidebar-link-active" }}
              >
                <CreditCard {...iconProps} />
                Plans
              </Link>
              <Link
                to="/users"
                className="sidebar-link"
                activeProps={{ className: "sidebar-link sidebar-link-active" }}
              >
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
      <main
        className="flex-1 min-h-screen min-w-0 flex flex-col lg:ml-[260px] overflow-x-hidden"
        style={{ background: "var(--content-bg)" }}
      >
        <TopBar />
        <div className="content-enter flex-1 px-4 py-4 sm:px-6 lg:px-11 lg:py-6">
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
