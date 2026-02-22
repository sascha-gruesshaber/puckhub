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
  toast,
} from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Building2, Plus, Search, Shield, Trash2, Users, X } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/users")({
  component: UsersPage,
})

function UsersPage() {
  const { data: users, isLoading } = trpc.users.listAll.useQuery()
  const { data: allOrgs } = trpc.organization.listAll.useQuery()
  const [search, setSearch] = useState("")

  // Delete user dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: { id: string; name: string; orgCount: number } | null }>({
    open: false,
    user: null,
  })

  // Assign to league dialog
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; userId: string; userName: string; existingOrgIds: string[] }>({
    open: false,
    userId: "",
    userName: "",
    existingOrgIds: [],
  })
  const [assignOrgId, setAssignOrgId] = useState("")
  const [assignRole, setAssignRole] = useState<"admin" | "owner" | "game_manager" | "game_reporter" | "team_manager" | "editor">(
    "admin",
  )

  // Remove from org dialog
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean
    userId: string
    userName: string
    organizationId: string
    orgName: string
  }>({ open: false, userId: "", userName: "", organizationId: "", orgName: "" })

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

  const availableOrgs = allOrgs?.filter((o) => !assignDialog.existingOrgIds.includes(o.id)) ?? []

  function roleColor(role: string) {
    switch (role) {
      case "owner":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global user management across all leagues</p>
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
                  user.organizations.map((org: { organizationId: string; organizationName: string; role: string }) => (
                    <span
                      key={org.organizationId}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${roleColor(org.role)}`}
                    >
                      <Building2 size={10} />
                      <span className="max-w-[100px] truncate">{org.organizationName}</span>
                      <span className="opacity-60">({org.role})</span>
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
                        className="ml-0.5 rounded hover:bg-black/10 p-0.5 -mr-1 transition-colors"
                        title="Remove from league"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
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

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() =>
                  setDeleteDialog({
                    open: true,
                    user: { id: user.id, name: user.name, orgCount: user.organizations.length },
                  })
                }
                title="Delete user"
              >
                <Trash2 size={14} />
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
                  <select
                    value={assignRole}
                    onChange={(e) =>
                      setAssignRole(e.target.value as "admin" | "owner" | "game_manager" | "game_reporter" | "team_manager" | "editor")
                    }
                    className="w-full rounded-lg border border-border/50 bg-white py-2 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                    <option value="game_manager">Game Manager</option>
                    <option value="game_reporter">Game Reporter</option>
                    <option value="team_manager">Team Manager</option>
                    <option value="editor">Editor</option>
                  </select>
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
    </div>
  )
}
