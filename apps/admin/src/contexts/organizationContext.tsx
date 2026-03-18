import { createContext, type ReactNode, useCallback, useContext, useState } from "react"
import { useSession } from "@/auth-client"
import { trpc } from "@/trpc"

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
  clearOrganization: () => Promise<void>
  isPlatformAdmin: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const isPlatformAdmin = (session?.user as any)?.role === "admin"

  // Regular user: use tRPC to query memberships directly via Prisma
  const { data: myOrgs, isPending: myOrgsPending } = trpc.organization.listMine.useQuery(undefined, {
    enabled: !isPlatformAdmin,
  })

  // Platform admin: use tRPC queries
  const { data: allOrgs, isPending: allOrgsPending } = trpc.organization.listAll.useQuery(undefined, {
    enabled: isPlatformAdmin,
  })

  // Both user types: get active org via tRPC (reads session's activeOrganizationId)
  const { data: activeOrgTrpc, isPending: activeOrgPending } = trpc.organization.getActiveOrNull.useQuery(undefined, {
    enabled: !!session,
  })

  const setActiveMutation = trpc.organization.setActive.useMutation()
  const setActiveForAdminMutation = trpc.organization.setActiveForAdmin.useMutation()
  const clearActiveMutation = trpc.organization.clearActive.useMutation()
  const utils = trpc.useUtils()

  const [isSwitching, setIsSwitching] = useState(false)

  // Compute organizations based on user type
  const organizations: Organization[] = isPlatformAdmin
    ? (allOrgs ?? []).map((o: any) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        logo: o.logo ?? null,
        role: "owner",
      }))
    : (myOrgs ?? []).map((o: any) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        logo: o.logo ?? null,
        role: o.role ?? "member",
      }))

  // Compute active organization
  const organization: Organization | null = activeOrgTrpc
    ? {
        id: activeOrgTrpc.id,
        name: activeOrgTrpc.name,
        slug: activeOrgTrpc.slug,
        logo: activeOrgTrpc.logo ?? null,
        role: isPlatformAdmin ? "owner" : (organizations.find((o) => o.id === activeOrgTrpc.id)?.role ?? "member"),
      }
    : null

  const switchOrganization = useCallback(
    async (orgId: string) => {
      setIsSwitching(true)
      try {
        if (isPlatformAdmin) {
          await setActiveForAdminMutation.mutateAsync({ organizationId: orgId })
        } else {
          await setActiveMutation.mutateAsync({ organizationId: orgId })
        }
        // Invalidate all queries — most are org-scoped via the session
        await utils.invalidate()
      } finally {
        setIsSwitching(false)
      }
    },
    [isPlatformAdmin, setActiveMutation, setActiveForAdminMutation, utils],
  )

  const clearOrganization = useCallback(async () => {
    setIsSwitching(true)
    try {
      await clearActiveMutation.mutateAsync()
      await utils.organization.getActiveOrNull.invalidate()
    } finally {
      setIsSwitching(false)
    }
  }, [clearActiveMutation, utils])

  const isLoading = isPlatformAdmin
    ? allOrgsPending || activeOrgPending || isSwitching
    : myOrgsPending || activeOrgPending || isSwitching

  return (
    <OrganizationContext.Provider
      value={{ organization, organizations, isLoading, switchOrganization, clearOrganization, isPlatformAdmin }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider")
  return ctx
}
