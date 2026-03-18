import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { OrganizationProvider } from "~/contexts/organizationContext"
import { useTranslation } from "~/i18n/use-translation"
import { useSession } from "../../lib/auth-client"

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
})

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
    // Forward any error param from Better Auth magic link verification
    const urlError = new URLSearchParams(window.location.search).get("error")
    navigate({ to: "/login", search: urlError ? { error: urlError } : undefined })
    return null
  }

  return (
    <OrganizationProvider>
      <Outlet />
    </OrganizationProvider>
  )
}
