import { useNavigate } from "@tanstack/react-router"
import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react"
import { trpc } from "@/trpc"
import { useOrganization } from "./organizationContext"

export type OrgRole = "owner" | "admin" | "game_manager" | "game_reporter" | "team_manager" | "editor"

interface MemberRoleEntry {
  id: string
  role: OrgRole
  teamId: string | null
  team: { id: string; name: string; shortName: string } | null
}

interface PermissionsContextValue {
  roles: MemberRoleEntry[]
  isLoading: boolean
  hasRole: (role: OrgRole, teamId?: string) => boolean
  canSee: (item: NavPermission) => boolean
}

export type NavPermission =
  | "dashboard"
  | "games"
  | "venues"
  | "standings"
  | "stats"
  | "seasonStructure"
  | "roster"
  | "teams"
  | "players"
  | "trikots"
  | "news"
  | "pages"
  | "sponsors"
  | "users"
  | "settings"

/** Map nav items to required roles. null = everyone. */
const NAV_PERMISSIONS: Record<NavPermission, OrgRole[] | null> = {
  dashboard: null,
  games: ["game_manager", "game_reporter"],
  venues: ["admin", "owner"],
  standings: null,
  stats: null,
  seasonStructure: ["admin", "owner"],
  roster: ["admin", "owner", "team_manager"],
  teams: ["admin", "owner", "team_manager"],
  players: ["admin", "owner", "team_manager"],
  trikots: ["admin", "owner"],
  news: ["editor"],
  pages: ["editor"],
  sponsors: ["admin", "owner"],
  users: ["admin", "owner"],
  settings: ["admin", "owner"],
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { organization, isPlatformAdmin } = useOrganization()

  const { data: myRoles, isPending } = trpc.organization.getMyRoles.useQuery(undefined, {
    enabled: !!organization,
  })

  const roles: MemberRoleEntry[] = useMemo(() => {
    if (!myRoles) return []
    return myRoles as MemberRoleEntry[]
  }, [myRoles])

  const hasRole = useMemo(() => {
    return (role: OrgRole, teamId?: string): boolean => {
      if (isPlatformAdmin) return true
      // owner/admin grant everything
      if (roles.some((r) => r.role === "owner" || r.role === "admin")) return true
      return roles.some((r) => {
        if (r.role !== role) return false
        if (r.teamId === null) return true
        if (teamId && r.teamId === teamId) return true
        if (!teamId) return true
        return false
      })
    }
  }, [roles, isPlatformAdmin])

  const canSee = useMemo(() => {
    return (item: NavPermission): boolean => {
      if (isPlatformAdmin) return true
      const required = NAV_PERMISSIONS[item]
      if (required === null) return true
      // owner/admin see everything
      if (roles.some((r) => r.role === "owner" || r.role === "admin")) return true
      return required.some((role) => hasRole(role))
    }
  }, [roles, isPlatformAdmin, hasRole])

  return (
    <PermissionsContext.Provider value={{ roles, isLoading: isPending, hasRole, canSee }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider")
  return ctx
}

/**
 * Hook that redirects to dashboard if the user lacks the required permission.
 * Call at the top of protected route components.
 */
export function usePermissionGuard(permission: NavPermission): boolean {
  const { canSee, isLoading } = usePermissions()
  const navigate = useNavigate()
  const allowed = isLoading || canSee(permission)

  useEffect(() => {
    if (!isLoading && !canSee(permission)) {
      navigate({ to: "/" })
    }
  }, [isLoading, canSee, permission, navigate])

  return allowed
}
