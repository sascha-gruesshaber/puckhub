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
          <img src="/puckhub-mark.png" alt="" width={44} height={44} className="pulse-brand h-11 w-11" />
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
