import { Building2, Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"
import { useOrganization } from "~/contexts/organizationContext"
import { useTranslation } from "~/i18n/use-translation"

export function OrgSwitcher() {
  const { t } = useTranslation("common")
  const { organization, organizations, switchOrganization } = useOrganization()
  const [open, setOpen] = useState(false)

  if (organizations.length <= 1) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid var(--sidebar-border)",
          color: "#E2E8F0",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <Building2 size={15} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--sidebar-text-muted)" }} />
        <span className="flex-1 truncate">{organization?.name ?? t("org.select")}</span>
        <ChevronsUpDown size={14} className="shrink-0" style={{ color: "var(--sidebar-text-muted)" }} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg shadow-lg"
            style={{
              background: "var(--sidebar-bg)",
              border: "1px solid var(--sidebar-border)",
            }}
          >
            <div className="py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={async () => {
                    await switchOrganization(org.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 transition-colors"
                  style={{
                    background: org.id === organization?.id ? "rgba(255, 255, 255, 0.06)" : "transparent",
                    color: "#E2E8F0",
                    fontSize: 13,
                    fontWeight: org.id === organization?.id ? 600 : 400,
                    cursor: "pointer",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (org.id !== organization?.id) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (org.id !== organization?.id) {
                      e.currentTarget.style.background = "transparent"
                    }
                  }}
                >
                  {org.logo ? (
                    <img src={org.logo} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
                  ) : (
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                      style={{
                        background: "linear-gradient(135deg, #1B365D, #264573)",
                        color: "#8B9DB8",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === organization?.id && <Check size={14} className="shrink-0" style={{ color: "#F4D35E" }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
