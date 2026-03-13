import { createFileRoute } from "@tanstack/react-router"
import { useSession } from "@/auth-client"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

/**
 * Redirect to the admin app's login page (single login instance).
 * After successful login the cross-subdomain cookie is set, and the
 * admin login redirects back to the platform via the `redirect` param.
 */
function LoginPage() {
  const { data: session, isPending } = useSession()

  if (isPending) return null

  // Already logged in — go to dashboard
  if (session?.user) {
    window.location.href = "/"
    return null
  }

  // Build admin login URL from current hostname (platform.x.y → admin.x.y)
  if (typeof window !== "undefined") {
    const parts = window.location.hostname.split(".")
    parts[0] = "admin"
    const adminOrigin = `${window.location.protocol}//${parts.join(".")}`
    const returnUrl = `${window.location.protocol}//${window.location.hostname}/`
    window.location.href = `${adminOrigin}/login?redirect=${encodeURIComponent(returnUrl)}`
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#f8fafc" }}>
      <p className="text-sm text-muted-foreground">Redirecting to login...</p>
    </div>
  )
}
