import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { OrgPickerPage } from "~/components/orgPickerPage"
import { useOrganization } from "~/contexts/organizationContext"

export const Route = createFileRoute("/_authed/")({
  component: OrgIndexPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || undefined,
    switchOrg: search.switchOrg === true || search.switchOrg === "true" || undefined,
  }),
})

function OrgIndexPage() {
  const { organization, organizations, isLoading } = useOrganization()
  const navigate = useNavigate()
  const { redirect: redirectParam, switchOrg } = Route.useSearch()

  useEffect(() => {
    if (isLoading) return
    if (redirectParam) {
      window.location.href = redirectParam
      return
    }

    // User explicitly wants to switch — show the picker
    if (switchOrg) return

    // Auto-redirect if we already have an active org in session
    if (organization) {
      navigate({ to: "/$orgSlug", params: { orgSlug: organization.slug }, replace: true })
      return
    }

    // Auto-redirect for single-org users
    if (organizations.length === 1) {
      navigate({ to: "/$orgSlug", params: { orgSlug: organizations[0]!.slug }, replace: true })
      return
    }
  }, [isLoading, organization, organizations, navigate, redirectParam, switchOrg])

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

  // Show org picker for multi-org users with no active org
  return <OrgPickerPage />
}
