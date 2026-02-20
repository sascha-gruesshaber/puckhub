import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { useActiveOrganization, useListOrganizations } from "@/auth-client"
import { authClient } from "@/auth-client"

interface Organization {
  id: string
  name: string
  slug: string
  logo: string | null
  role: string
}

interface OrganizationContextValue {
  organization: Organization | null
  organizations: Organization[]
  isLoading: boolean
  switchOrganization: (orgId: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: activeOrg, isPending: activePending } = useActiveOrganization()
  const { data: orgList, isPending: listPending } = useListOrganizations()
  const [isSwitching, setIsSwitching] = useState(false)

  const organizations: Organization[] = (orgList ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    logo: o.logo ?? null,
    role: o.role ?? "member",
  }))

  const organization: Organization | null = activeOrg
    ? {
        id: (activeOrg as any).id,
        name: (activeOrg as any).name,
        slug: (activeOrg as any).slug,
        logo: (activeOrg as any).logo ?? null,
        role: (activeOrg as any).role ?? "member",
      }
    : null

  // Auto-select if user belongs to exactly one org and none is active
  useEffect(() => {
    if (activePending || listPending || isSwitching) return
    if (!activeOrg && organizations.length === 1) {
      setIsSwitching(true)
      authClient.organization
        .setActive({ organizationId: organizations[0]!.id })
        .then(() => setIsSwitching(false))
        .catch(() => setIsSwitching(false))
    }
  }, [activeOrg, organizations, activePending, listPending, isSwitching])

  const switchOrganization = useCallback(async (orgId: string) => {
    setIsSwitching(true)
    try {
      await authClient.organization.setActive({ organizationId: orgId })
    } finally {
      setIsSwitching(false)
    }
  }, [])

  const isLoading = activePending || listPending || isSwitching

  return (
    <OrganizationContext.Provider value={{ organization, organizations, isLoading, switchOrganization }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider")
  return ctx
}
