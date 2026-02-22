import { Building2, LogOut } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { signOut } from "@/auth-client"
import { useOrganization } from "~/contexts/organizationContext"
import { useTranslation } from "~/i18n/use-translation"

export function OrgPickerPage() {
  const { t } = useTranslation("common")
  const { organizations, switchOrganization, isLoading, isPlatformAdmin } = useOrganization()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate({ to: "/login" })
  }

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
          <span style={{ color: "var(--sidebar-text)", fontSize: 13 }} suppressHydrationWarning>
            {t("loading")}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--content-bg)" }}>
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
              color: "#0C1929",
              fontWeight: 800,
              fontSize: 24,
            }}
          >
            P
          </div>
          <h1 className="text-xl font-bold text-foreground">{t("org.pickerTitle")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("org.pickerDescription")}</p>
          {isPlatformAdmin && <p className="mt-2 text-xs text-primary font-medium">{t("org.platformAdminNote")}</p>}
        </div>

        {/* Organization cards */}
        <div className="space-y-3">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => switchOrganization(org.id)}
              className="flex w-full items-center gap-4 rounded-xl border border-border/50 bg-white p-4 text-left shadow-sm transition-all hover:border-border hover:shadow-md"
              style={{ cursor: "pointer" }}
            >
              {org.logo ? (
                <img src={org.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{org.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isPlatformAdmin ? t("org.roles.owner") : t(`org.roles.${org.role}`)}
                </p>
              </div>
              <Building2 size={18} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
            <Building2 size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">{t("org.noOrgs")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPlatformAdmin ? t("org.noOrgsPlatformAdmin") : t("org.noOrgsDescription")}
            </p>
          </div>
        )}

        {/* Logout */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ cursor: "pointer", background: "none", border: "none" }}
          >
            <LogOut size={13} />
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  )
}
