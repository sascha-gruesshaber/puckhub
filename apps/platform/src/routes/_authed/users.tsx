import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  toast,
} from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import {
  Building2,
  Crown,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

type OrgRole = "owner" | "admin" | "game_manager" | "game_reporter" | "team_manager" | "editor"

const iconProps = { size: 14, strokeWidth: 2 } as const

const ROLE_META: Record<
  OrgRole,
  { color: string; bgColor: string; icon: React.ReactNode; label: string; description: string }
> = {
  owner: {
    color: "hsl(45 93% 47%)",
    bgColor: "hsl(45 93% 47% / 0.1)",
    icon: <Crown {...iconProps} />,
    label: "Owner",
    description: "Full access to all areas including organization deletion.",
  },
  admin: {
    color: "hsl(25 95% 53%)",
    bgColor: "hsl(25 95% 53% / 0.1)",
    icon: <Shield {...iconProps} />,
    label: "Administrator",
    description: "Full access to all areas except organization deletion.",
  },
  game_manager: {
    color: "hsl(142 72% 42%)",
    bgColor: "hsl(142 72% 42% / 0.1)",
    icon: <Users {...iconProps} />,
    label: "Game Manager",
    description: "Create, edit, and manage games.",
  },
  game_reporter: {
    color: "hsl(198 93% 45%)",
    bgColor: "hsl(198 93% 45% / 0.1)",
    icon: <KeyRound {...iconProps} />,
    label: "Game Reporter",
    description: "Manage game reports, lineups, and events.",
  },
  team_manager: {
    color: "hsl(262 83% 58%)",
    bgColor: "hsl(262 83% 58% / 0.1)",
    icon: <Shield {...iconProps} />,
    label: "Team Manager",
    description: "Manage team details, rosters, and contracts.",
  },
  editor: {
    color: "hsl(330 81% 60%)",
    bgColor: "hsl(330 81% 60% / 0.1)",
    icon: <User {...iconProps} />,
    label: "Editor",
    description: "Create and edit news articles and pages.",
  },
}

const ORG_ROLES: OrgRole[] = ["owner", "admin", "game_manager", "game_reporter", "team_manager", "editor"]

export const Route = createFileRoute("/_authed/users")({
  component: UsersPage,
})

function UsersPage() {
  const { data: users, isLoading } = trpc.users.listAll.useQuery()
  const { data: allOrgs } = trpc.organization.listAll.useQuery()
  const [search, setSearch] = useState("")

  // Delete user dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    user: { id: string; name: string; orgCount: number } | null
  }>({
    open: false,
    user: null,
  })

  // Assign to league dialog
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean
    userId: string
    userName: string
    existingOrgIds: string[]
  }>({
    open: false,
    userId: "",
    userName: "",
    existingOrgIds: [],
  })
  const [assignOrgId, setAssignOrgId] = useState("")
  const [assignRole, setAssignRole] = useState<
    "admin" | "owner" | "game_manager" | "game_reporter" | "team_manager" | "editor"
  >("admin")

  // Remove from org dialog
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean
    userId: string
    userName: string
    organizationId: string
    orgName: string
  }>({ open: false, userId: "", userName: "", organizationId: "", orgName: "" })

  // Change role dialog
  const [changeRoleDialog, setChangeRoleDialog] = useState<{
    open: boolean
    userId: string
    userName: string
    organizationId: string
    orgName: string
    currentRole: string
  }>({ open: false, userId: "", userName: "", organizationId: "", orgName: "", currentRole: "" })
  const [newRole, setNewRole] = useState<
    "admin" | "owner" | "game_manager" | "game_reporter" | "team_manager" | "editor"
  >("admin")

  // Edit email dialog
  const [editEmailDialog, setEditEmailDialog] = useState<{
    open: boolean
    userId: string
    userName: string
    currentEmail: string
  }>({
    open: false,
    userId: "",
    userName: "",
    currentEmail: "",
  })
  const [newEmail, setNewEmail] = useState("")
  const [editEmailError, setEditEmailError] = useState("")

  // Create user dialog
  const [createDialog, setCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", email: "", isPlatformAdmin: false, sendInvite: true })
  const [createErrors, setCreateErrors] = useState<{ name?: string; email?: string }>({})

  const utils = trpc.useUtils()

  const deleteMutation = trpc.users.deleteGlobal.useMutation({
    onSuccess: () => {
      utils.users.listAll.invalidate()
      utils.organization.listAll.invalidate()
      setDeleteDialog({ open: false, user: null })
      toast.success("User deleted")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const addToOrgMutation = trpc.users.addToOrganization.useMutation({
    onSuccess: () => {
      utils.users.listAll.invalidate()
      setAssignDialog({ open: false, userId: "", userName: "", existingOrgIds: [] })
      setAssignOrgId("")
      setAssignRole("admin")
      toast.success("User assigned to league")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const removeFromOrgMutation = trpc.users.removeFromOrganization.useMutation({
    onSuccess: () => {
      utils.users.listAll.invalidate()
      utils.organization.listAll.invalidate()
      setRemoveDialog({ open: false, userId: "", userName: "", organizationId: "", orgName: "" })
      toast.success("Removed from league")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const changeRoleMutation = trpc.users.changeOrganizationRole.useMutation({
    onSuccess: () => {
      utils.users.listAll.invalidate()
      setChangeRoleDialog({ open: false, userId: "", userName: "", organizationId: "", orgName: "", currentRole: "" })
      toast.success("Role updated")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const createUserMutation = trpc.users.createPlatformUser.useMutation({
    onSuccess: () => {
      utils.users.listAll.invalidate()
      setCreateDialog(false)
      setCreateForm({ name: "", email: "", isPlatformAdmin: false, sendInvite: true })
      setCreateErrors({})
      toast.success("User created")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const updateEmailMutation = trpc.users.updateEmail.useMutation({
    onSuccess: () => {
      utils.users.listAll.invalidate()
      setEditEmailDialog({ open: false, userId: "", userName: "", currentEmail: "" })
      setNewEmail("")
      setEditEmailError("")
      toast.success("Email updated")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const filtered = users?.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  function openAssignDialog(user: { id: string; name: string; organizations: { organizationId: string }[] }) {
    setAssignDialog({
      open: true,
      userId: user.id,
      userName: user.name,
      existingOrgIds: user.organizations.map((o) => o.organizationId),
    })
    setAssignOrgId("")
    setAssignRole("admin")
  }

  function validateCreateForm(): boolean {
    const next: { name?: string; email?: string } = {}
    if (!createForm.name.trim()) next.name = "Name is required"
    if (!createForm.email.trim()) next.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) next.email = "Invalid email"
    setCreateErrors(next)
    return Object.keys(next).length === 0
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!validateCreateForm()) return
    createUserMutation.mutate({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      role: createForm.isPlatformAdmin ? "admin" : null,
      sendInvite: createForm.sendInvite,
    })
  }

  const availableOrgs = allOrgs?.filter((o) => !assignDialog.existingOrgIds.includes(o.id)) ?? []

  function getPrimaryRole(org: { role: string; memberRoles: { role: string; teamId: string | null }[] }): string {
    const orgRoles = org.memberRoles.filter((r) => r.teamId === null)
    const priority = ["owner", "admin", "game_manager", "editor", "game_reporter", "team_manager"]
    for (const p of priority) {
      if (orgRoles.some((r) => r.role === p)) return p
    }
    return org.role
  }

  function roleColor(role: string) {
    switch (role) {
      case "owner":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "game_manager":
        return "bg-green-100 text-green-800 border-green-200"
      case "editor":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Global user management across all leagues</p>
        </div>
        <Button variant="accent" onClick={() => setCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border/50 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">{search ? "No users found" : "No users yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Try a different search term." : "Users will appear here once they sign up."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {filtered.map((user, i) => (
            <div
              key={user.id}
              className={`data-row flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                i < filtered.length - 1 ? "border-b border-border/40" : ""
              }`}
              style={{ "--row-index": i } as React.CSSProperties}
            >
              {/* Avatar */}
              {user.image ? (
                <img src={user.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
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
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name + Email */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  {user.role === "admin" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Shield size={10} />
                      Platform Admin
                    </Badge>
                  )}
                  {user.banned && (
                    <Badge variant="destructive" className="text-xs">
                      Banned
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Organization tags */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 flex-wrap max-w-xs">
                {user.organizations.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No league</span>
                ) : (
                  user.organizations.map(
                    (org: {
                      organizationId: string
                      organizationName: string
                      role: string
                      memberRoles: { role: string; teamId: string | null }[]
                    }) => {
                      const displayRole = getPrimaryRole(org)
                      return (
                        <span
                          key={org.organizationId}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${roleColor(displayRole)}`}
                        >
                          <Building2 size={10} />
                          <span className="max-w-[100px] truncate">{org.organizationName}</span>
                          <span className="opacity-60">({displayRole})</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setChangeRoleDialog({
                                open: true,
                                userId: user.id,
                                userName: user.name,
                                organizationId: org.organizationId,
                                orgName: org.organizationName,
                                currentRole: displayRole,
                              })
                              setNewRole(displayRole as typeof newRole)
                            }}
                            className="rounded hover:bg-black/10 p-0.5 transition-colors"
                            title="Change role"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRemoveDialog({
                                open: true,
                                userId: user.id,
                                userName: user.name,
                                organizationId: org.organizationId,
                                orgName: org.organizationName,
                              })
                            }}
                            className="rounded hover:bg-black/10 p-0.5 -mr-1 transition-colors"
                            title="Remove from league"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      )
                    },
                  )
                )}

                {/* Add to league button */}
                <button
                  type="button"
                  onClick={() => openAssignDialog(user)}
                  className="inline-flex items-center justify-center rounded-md border border-dashed border-border/60 px-1.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  title="Assign to league"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Created date */}
              <div className="text-right shrink-0 hidden md:block">
                <p className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("de-DE")}</p>
              </div>

              {/* Edit email button */}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs h-8 px-2 md:px-3 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditEmailDialog({ open: true, userId: user.id, userName: user.name, currentEmail: user.email })
                  setNewEmail(user.email)
                  setEditEmailError("")
                }}
                title="Change email"
                aria-label="Change email"
              >
                <Mail className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Email</span>
              </Button>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                onClick={() =>
                  setDeleteDialog({
                    open: true,
                    user: { id: user.id, name: user.name, orgCount: user.organizations.length },
                  })
                }
                title="Delete user"
                aria-label="Delete user"
              >
                <Trash2 className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Delete</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Count summary */}
      {filtered && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "user" : "users"}
          {search && users && filtered.length !== users.length ? ` (of ${users.length} total)` : ""}
        </p>
      )}

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDeleteDialog({ open: false, user: null })} />
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteDialog.user?.name}</strong>? This will remove
              their account, all sessions, and memberships
              {deleteDialog.user && deleteDialog.user.orgCount > 0
                ? ` across ${deleteDialog.user.orgCount} ${deleteDialog.user.orgCount === 1 ? "league" : "leagues"}`
                : ""}
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteDialog.user) deleteMutation.mutate({ id: deleteDialog.user.id })
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to League Dialog */}
      <Dialog
        open={assignDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialog({ open: false, userId: "", userName: "", existingOrgIds: [] })
            setAssignOrgId("")
            setAssignRole("admin")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setAssignDialog({ open: false, userId: "", userName: "", existingOrgIds: [] })} />
          <DialogHeader>
            <DialogTitle>Assign to League</DialogTitle>
            <DialogDescription>
              Add <strong>{assignDialog.userName}</strong> to a league.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6 pt-2">
            {availableOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">This user is already a member of all leagues.</p>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">League</label>
                  <select
                    value={assignOrgId}
                    onChange={(e) => setAssignOrgId(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-white py-2 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select a league...</option>
                    {availableOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
                  <div className="space-y-1.5">
                    {ORG_ROLES.map((r) => {
                      const meta = ROLE_META[r]
                      return (
                        <label
                          key={r}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                            assignRole === r ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="assignRole"
                            value={r}
                            checked={assignRole === r}
                            onChange={() => setAssignRole(r)}
                            className="sr-only"
                          />
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                            style={{ background: meta.bgColor, color: meta.color }}
                          >
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{meta.label}</p>
                            <p className="text-xs text-muted-foreground">{meta.description}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialog({ open: false, userId: "", userName: "", existingOrgIds: [] })}
            >
              Cancel
            </Button>
            {availableOrgs.length > 0 && (
              <Button
                variant="accent"
                disabled={!assignOrgId || addToOrgMutation.isPending}
                onClick={() => {
                  if (assignOrgId) {
                    addToOrgMutation.mutate({
                      userId: assignDialog.userId,
                      organizationId: assignOrgId,
                      role: assignRole,
                    })
                  }
                }}
              >
                {addToOrgMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from League Dialog */}
      <Dialog
        open={removeDialog.open}
        onOpenChange={(open) => {
          if (!open) setRemoveDialog({ open: false, userId: "", userName: "", organizationId: "", orgName: "" })
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose
            onClick={() => setRemoveDialog({ open: false, userId: "", userName: "", organizationId: "", orgName: "" })}
          />
          <DialogHeader>
            <DialogTitle>Remove from League</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeDialog.userName}</strong> from <strong>{removeDialog.orgName}</strong>? They will
              lose access to this league.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRemoveDialog({ open: false, userId: "", userName: "", organizationId: "", orgName: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeFromOrgMutation.isPending}
              onClick={() => {
                removeFromOrgMutation.mutate({
                  userId: removeDialog.userId,
                  organizationId: removeDialog.organizationId,
                })
              }}
            >
              {removeFromOrgMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog
        open={changeRoleDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setChangeRoleDialog({
              open: false,
              userId: "",
              userName: "",
              organizationId: "",
              orgName: "",
              currentRole: "",
            })
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose
            onClick={() =>
              setChangeRoleDialog({
                open: false,
                userId: "",
                userName: "",
                organizationId: "",
                orgName: "",
                currentRole: "",
              })
            }
          />
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change the role of <strong>{changeRoleDialog.userName}</strong> in{" "}
              <strong>{changeRoleDialog.orgName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
              <div className="space-y-1.5">
                {ORG_ROLES.map((r) => {
                  const meta = ROLE_META[r]
                  return (
                    <label
                      key={r}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        newRole === r ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="changeRole"
                        value={r}
                        checked={newRole === r}
                        onChange={() => setNewRole(r)}
                        className="sr-only"
                      />
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                        style={{ background: meta.bgColor, color: meta.color }}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setChangeRoleDialog({
                  open: false,
                  userId: "",
                  userName: "",
                  organizationId: "",
                  orgName: "",
                  currentRole: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={newRole === changeRoleDialog.currentRole || changeRoleMutation.isPending}
              onClick={() => {
                changeRoleMutation.mutate({
                  userId: changeRoleDialog.userId,
                  organizationId: changeRoleDialog.organizationId,
                  role: newRole,
                })
              }}
            >
              {changeRoleMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={createDialog}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialog(false)
            setCreateForm({ name: "", email: "", isPlatformAdmin: false, sendInvite: true })
            setCreateErrors({})
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setCreateDialog(false)} />
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 p-6 pt-2">
            <FormField label="Name" error={createErrors.name} required>
              <Input
                value={createForm.name}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                  if (createErrors.name) setCreateErrors((e) => ({ ...e, name: undefined }))
                }}
                placeholder="e.g. Max Mustermann"
              />
            </FormField>

            <FormField label="Email" error={createErrors.email} required>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                  if (createErrors.email) setCreateErrors((e) => ({ ...e, email: undefined }))
                }}
                placeholder="user@example.com"
              />
            </FormField>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.isPlatformAdmin}
                onChange={(e) => setCreateForm((f) => ({ ...f, isPlatformAdmin: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium">Platform Admin</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.sendInvite}
                onChange={(e) => setCreateForm((f) => ({ ...f, sendInvite: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium">Send invite email</span>
              <span className="text-xs text-muted-foreground">(magic link login)</span>
            </label>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog
        open={editEmailDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setEditEmailDialog({ open: false, userId: "", userName: "", currentEmail: "" })
            setNewEmail("")
            setEditEmailError("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose
            onClick={() => setEditEmailDialog({ open: false, userId: "", userName: "", currentEmail: "" })}
          />
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Change the email address for <strong>{editEmailDialog.userName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = newEmail.trim()
              if (!trimmed) {
                setEditEmailError("Email is required")
                return
              }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                setEditEmailError("Invalid email")
                return
              }
              if (trimmed === editEmailDialog.currentEmail) {
                setEditEmailError("Email is the same as current")
                return
              }
              setEditEmailError("")
              updateEmailMutation.mutate({ id: editEmailDialog.userId, email: trimmed })
            }}
            className="space-y-4 p-6 pt-2"
          >
            <FormField label="New Email" error={editEmailError} required>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  if (editEmailError) setEditEmailError("")
                }}
                placeholder="user@example.com"
              />
            </FormField>

            <DialogFooter className="p-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditEmailDialog({ open: false, userId: "", userName: "", currentEmail: "" })}
              >
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={updateEmailMutation.isPending}>
                {updateEmailMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
