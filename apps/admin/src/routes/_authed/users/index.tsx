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
  Label,
  toast,
} from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import {
  ClipboardCheck,
  Eye,
  Info,
  KeyRound,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { NoResults } from "~/components/noResults"
import { TeamCombobox } from "~/components/teamCombobox"
import { useUsersFilters, FILTER_ALL } from "~/stores/usePageFilters"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/users/")({
  component: UsersPage,
})

// ---------------------------------------------------------------------------
// Role definitions with descriptions and icons
// ---------------------------------------------------------------------------
type RoleKey = "super_admin" | "league_admin" | "team_manager" | "scorekeeper" | "viewer"

interface RoleMeta {
  color: string
  bgColor: string
  icon: React.ReactNode
  permissionKeys: string[]
}

const iconProps = { size: 14, strokeWidth: 2 } as const

const ROLE_META: Record<RoleKey, RoleMeta> = {
  super_admin: {
    color: "hsl(0 72% 51%)",
    bgColor: "hsl(0 72% 51% / 0.1)",
    icon: <ShieldAlert {...iconProps} />,
    permissionKeys: ["manageUsers", "assignRoles", "manageLeagueData", "manageGames", "manageSettings"],
  },
  league_admin: {
    color: "hsl(25 95% 53%)",
    bgColor: "hsl(25 95% 53% / 0.1)",
    icon: <ShieldCheck {...iconProps} />,
    permissionKeys: [
      "manageSeasons",
      "manageSchedules",
      "recordResults",
      "manageTeamsPlayers",
      "manageStandingsPenalties",
    ],
  },
  team_manager: {
    color: "hsl(221 83% 53%)",
    bgColor: "hsl(221 83% 53% / 0.1)",
    icon: <UserCog {...iconProps} />,
    permissionKeys: ["editTeamProfile", "manageTeamRoster", "manageContractsTransfers", "updateTeamInfo"],
  },
  scorekeeper: {
    color: "hsl(142 71% 45%)",
    bgColor: "hsl(142 71% 45% / 0.1)",
    icon: <ClipboardCheck {...iconProps} />,
    permissionKeys: ["recordResults", "recordGoalsAssists", "recordPenalties", "recordGoalieStats"],
  },
  viewer: {
    color: "hsl(215 16% 47%)",
    bgColor: "hsl(215 16% 47% / 0.1)",
    icon: <Eye {...iconProps} />,
    permissionKeys: ["viewSeasonsSchedules", "viewStandingsStats", "viewTeamsPlayers", "viewResultsHistory"],
  },
}

const ROLE_KEYS = Object.keys(ROLE_META) as RoleKey[]

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------
interface UserForm {
  name: string
  email: string
  password: string
}

const emptyForm: UserForm = { name: "", email: "", password: "" }

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function UsersPage() {
  const { t } = useTranslation("common")
  const { search, setSearch, roleFilter, setRoleFilter } = useUsersFilters()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{ id: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({})

  // Role assignment
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [roleUserId, setRoleUserId] = useState<string | null>(null)
  const [roleUserName, setRoleUserName] = useState("")
  const [selectedRole, setSelectedRole] = useState<RoleKey>("viewer")
  const [selectedTeamId, setSelectedTeamId] = useState("")

  // Password reset
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [passwordUserName, setPasswordUserName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  // Role info panel
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)

  const utils = trpc.useUtils()
  const [users] = trpc.users.list.useSuspenseQuery()
  const { data: teams } = trpc.users.listTeams.useQuery()

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      closeDialog()
      toast.success(t("usersPage.toast.created"))
    },
    onError: (err) => toast.error(t("usersPage.toast.createError"), { description: err.message }),
  })

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      closeDialog()
      toast.success(t("usersPage.toast.updated"))
    },
    onError: (err) => toast.error(t("usersPage.toast.saveError"), { description: err.message }),
  })

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingUser(null)
      toast.success(t("usersPage.toast.deleted"))
    },
    onError: (err) => toast.error(t("usersPage.toast.deleteError"), { description: err.message }),
  })

  const assignRoleMutation = trpc.users.assignRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      setSelectedRole("viewer")
      setSelectedTeamId("")
      toast.success(t("usersPage.toast.roleAssigned"))
    },
    onError: (err) => toast.error(t("usersPage.toast.error"), { description: err.message }),
  })

  const removeRoleMutation = trpc.users.removeRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      toast.success(t("usersPage.toast.roleRemoved"))
    },
    onError: (err) => toast.error(t("usersPage.toast.error"), { description: err.message }),
  })

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      setPasswordDialogOpen(false)
      setPasswordUserId(null)
      setNewPassword("")
      toast.success(t("usersPage.toast.passwordReset"))
    },
    onError: (err) => toast.error(t("usersPage.toast.error"), { description: err.message }),
  })

  const getRoleInfo = (key: RoleKey) => ({
    label: t(`usersPage.roles.${key}.label`),
    shortLabel: t(`usersPage.roles.${key}.shortLabel`),
    description: t(`usersPage.roles.${key}.description`),
    color: ROLE_META[key].color,
    bgColor: ROLE_META[key].bgColor,
    icon: ROLE_META[key].icon,
    permissions: ROLE_META[key].permissionKeys.map((permKey) => t(`usersPage.roles.${key}.permissions.${permKey}`)),
  })

  // Roles that actually have users assigned
  const rolesInUse = useMemo(() => {
    if (!users) return []
    const counts = new Map<RoleKey, number>()
    for (const u of users) {
      for (const r of u.roles) {
        const key = r.role as RoleKey
        if (ROLE_META[key]) {
          counts.set(key, (counts.get(key) || 0) + 1)
        }
      }
    }
    return ROLE_KEYS.filter((k) => counts.has(k)).map((k) => ({
      key: k,
      ...getRoleInfo(k),
      count: counts.get(k) || 0,
    }))
  }, [users, getRoleInfo])

  const noRolesCount = useMemo(() => {
    if (!users) return 0
    return users.filter((u) => u.roles.length === 0).length
  }, [users])

  const filtered = useMemo(() => {
    if (!users) return []
    let result = users

    // Role filter
    if (roleFilter === "__no_roles__") {
      result = result.filter((u) => u.roles.length === 0)
    } else if (roleFilter !== FILTER_ALL) {
      result = result.filter((u) => u.roles.some((r) => r.role === roleFilter))
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.roles.some((r) =>
            getRoleInfo(r.role as RoleKey)
              ?.label.toLowerCase()
              .includes(q),
          ),
      )
    }

    return result
  }, [users, search, roleFilter, getRoleInfo])

  function setField<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openCreate() {
    setEditingUser(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(user: { id: string; name: string; email: string }) {
    setEditingUser({ id: user.id })
    setForm({ name: user.name, email: user.email, password: "" })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(user: { id: string; name: string }) {
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }

  function openRoleDialog(user: { id: string; name: string }) {
    setRoleUserId(user.id)
    setRoleUserName(user.name)
    setSelectedRole("viewer")
    setSelectedTeamId("")
    setRoleDialogOpen(true)
  }

  function openPasswordDialog(user: { id: string; name: string }) {
    setPasswordUserId(user.id)
    setPasswordUserName(user.name)
    setNewPassword("")
    setPasswordError("")
    setPasswordDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingUser(null)
    setForm(emptyForm)
    setErrors({})
  }

  function validate(): boolean {
    const next: Partial<Record<keyof UserForm, string>> = {}
    if (!form.name.trim()) next.name = t("usersPage.validation.nameRequired")
    if (!form.email.trim()) next.email = t("usersPage.validation.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t("usersPage.validation.emailInvalid")
    if (!editingUser && !form.password) next.password = t("usersPage.validation.passwordRequired")
    else if (!editingUser && form.password.length < 6) next.password = t("usersPage.validation.passwordMin")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        name: form.name.trim(),
        email: form.email.trim(),
      })
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
    }
  }

  function handleAssignRole(e: React.FormEvent) {
    e.preventDefault()
    if (!roleUserId) return
    assignRoleMutation.mutate({
      userId: roleUserId,
      role: selectedRole,
      teamId: selectedRole === "team_manager" && selectedTeamId ? selectedTeamId : undefined,
    })
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordUserId) return
    if (newPassword.length < 6) {
      setPasswordError(t("usersPage.validation.passwordMin"))
      return
    }
    resetPasswordMutation.mutate({ id: passwordUserId, password: newPassword })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Find current user's roles for the role dialog
  const roleDialogUser = users?.find((u) => u.id === roleUserId)

  return (
    <>
      <DataPageLayout
        title={t("usersPage.title")}
        description={t("usersPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setInfoDialogOpen(true)}>
              <Info className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("usersPage.actions.rolesOverview")}
            </Button>
            <Button variant="accent" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("usersPage.actions.newUser")}
            </Button>
          </div>
        }
        filters={
          <>
            <FilterPill
              label={t("usersPage.filters.all")}
              active={roleFilter === FILTER_ALL}
              onClick={() => setRoleFilter(FILTER_ALL)}
            />
            {rolesInUse.map((r) => (
              <FilterPill
                key={r.key}
                label={`${r.label} (${r.count})`}
                active={roleFilter === r.key}
                onClick={() => setRoleFilter(r.key)}
                icon={
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                    style={{ background: r.bgColor, color: r.color }}
                  >
                    {r.icon}
                  </span>
                }
              />
            ))}
            {noRolesCount > 0 && (
              <FilterPill
                label={t("usersPage.filters.noRoleCount", { count: noRolesCount })}
                active={roleFilter === "__no_roles__"}
                onClick={() => setRoleFilter("__no_roles__")}
              />
            )}
          </>
        }
        search={{ value: search, onChange: setSearch, placeholder: t("usersPage.searchPlaceholder") }}
        count={
          users.length > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {roleFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {users.length}
                </span>{" "}
                {t("usersPage.count.users")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {filtered.length === 0 && !search && roleFilter === FILTER_ALL ? (
          <EmptyState
            icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("usersPage.empty.title")}
            description={t("usersPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("usersPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("usersPage.filters.fallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((user, i) => (
              <UserRow
                key={user.id}
                user={user}
                rowIndex={i}
                isLast={i === filtered.length - 1}
                onEdit={() => openEdit(user)}
                onDelete={() => openDelete({ id: user.id, name: user.name })}
                onManageRoles={() => openRoleDialog({ id: user.id, name: user.name })}
                onResetPassword={() => openPasswordDialog({ id: user.id, name: user.name })}
                getRoleInfo={getRoleInfo}
                t={t}
              />
            ))}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("usersPage.dialogs.editUserTitle") : t("usersPage.dialogs.newUserTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? t("usersPage.dialogs.editUserDescription") : t("usersPage.dialogs.newUserDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-2">
            <FormField label={t("usersPage.fields.name")} error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={t("usersPage.fields.namePlaceholder")}
              />
            </FormField>

            <FormField label={t("usersPage.fields.email")} error={errors.email} required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder={t("usersPage.fields.emailPlaceholder")}
              />
            </FormField>

            {!editingUser && (
              <FormField label={t("usersPage.fields.password")} error={errors.password} required>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder={t("usersPage.fields.passwordPlaceholder")}
                />
              </FormField>
            )}

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? t("saving") : editingUser ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("usersPage.deleteDialog.title")}
        description={t("usersPage.deleteDialog.description", { name: deletingUser?.name ?? "" })}
        confirmLabel={t("usersPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingUser) deleteMutation.mutate({ id: deletingUser.id })
        }}
      />

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setRoleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t("usersPage.dialogs.rolesTitle", { name: roleUserName })}</DialogTitle>
            <DialogDescription>{t("usersPage.dialogs.rolesDescription")}</DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-4">
            {/* Current roles */}
            {roleDialogUser && roleDialogUser.roles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("usersPage.roles.current")}</p>
                {roleDialogUser.roles.map((r) => {
                  const info = getRoleInfo(r.role as RoleKey)
                  if (!info) return null
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
                        style={{ background: info.bgColor, color: info.color }}
                      >
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{info.label}</p>
                        {r.team && (
                          <p className="text-xs text-muted-foreground">
                            {t("usersPage.roles.teamPrefix", { name: r.team.name })}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        disabled={removeRoleMutation.isPending}
                        onClick={() => removeRoleMutation.mutate({ roleId: r.id })}
                        aria-label={t("usersPage.actions.removeRole")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("usersPage.roles.noneAssigned")}</p>
            )}

            {/* Add role form */}
            <form onSubmit={handleAssignRole} className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">{t("usersPage.roles.assignNew")}</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("usersPage.fields.role")}</Label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as RoleKey)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {ROLE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {getRoleInfo(key).label} - {getRoleInfo(key).shortLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRole === "team_manager" && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t("usersPage.fields.teamOptional")}
                    </Label>
                    <TeamCombobox
                      teams={(teams ?? []).map((t) => ({
                        id: t.id,
                        name: t.name,
                        shortName: t.shortName,
                        city: t.city,
                        logoUrl: t.logoUrl,
                        primaryColor: t.primaryColor,
                      }))}
                      value={selectedTeamId}
                      onChange={setSelectedTeamId}
                      placeholder={t("usersPage.fields.noSpecificTeam")}
                    />
                  </div>
                )}
              </div>

              <Button type="submit" size="sm" variant="accent" disabled={assignRoleMutation.isPending}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("usersPage.actions.assignRole")}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => setPasswordDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t("usersPage.dialogs.resetPasswordTitle")}</DialogTitle>
            <DialogDescription>
              {t("usersPage.dialogs.resetPasswordDescription", { name: passwordUserName })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 p-6 pt-2">
            <FormField label={t("usersPage.fields.newPassword")} error={passwordError} required>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (passwordError) setPasswordError("")
                }}
                placeholder={t("usersPage.fields.passwordPlaceholder")}
              />
            </FormField>
            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? t("saving") : t("usersPage.actions.setPassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setInfoDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t("usersPage.dialogs.rolesInfoTitle")}</DialogTitle>
            <DialogDescription>{t("usersPage.dialogs.rolesInfoDescription")}</DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-6">
            {ROLE_KEYS.map((key) => {
              const info = getRoleInfo(key)
              return (
                <div key={key} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                      style={{ background: info.bgColor, color: info.color }}
                    >
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{info.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{info.description}</p>
                    </div>
                  </div>
                  <div className="ml-[52px]">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {t("usersPage.roles.permissionsTitle")}
                    </p>
                    <ul className="space-y-1.5">
                      {info.permissions.map((perm, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: info.color }}
                          />
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// UserRow — now uses data-row animation pattern
// ---------------------------------------------------------------------------
function UserRow({
  user,
  rowIndex,
  isLast,
  onEdit,
  onDelete,
  onManageRoles,
  onResetPassword,
  getRoleInfo,
  t,
}: {
  user: {
    id: string
    name: string
    email: string
    createdAt: Date
    roles: Array<{
      id: string
      role: string
      teamId: string | null
      team: { id: string; name: string; shortName: string } | null
    }>
  }
  rowIndex: number
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onManageRoles: () => void
  onResetPassword: () => void
  getRoleInfo: (key: RoleKey) => {
    label: string
    color: string
    bgColor: string
    icon: React.ReactNode
  }
  t: (key: string, options?: Record<string, string | number | undefined>) => string
}) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email.substring(0, 2).toUpperCase()

  const isSuperAdmin = user.roles.some((r) => r.role === "super_admin")

  return (
    <div
      className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
        !isLast ? "border-b border-border/40" : ""
      }`}
      style={{ "--row-index": rowIndex } as React.CSSProperties}
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isSuperAdmin
            ? "linear-gradient(135deg, hsl(0 72% 51% / 0.15), hsl(0 72% 51% / 0.05))"
            : "hsl(var(--muted))",
          color: isSuperAdmin ? "hsl(0 72% 51%)" : "hsl(var(--muted-foreground))",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h3 className="font-semibold text-sm truncate">{user.name}</h3>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Roles */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
        {user.roles.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">{t("usersPage.roles.noneShort")}</span>
        ) : (
          user.roles.map((r) => {
            const info = getRoleInfo(r.role as RoleKey)
            if (!info) return null
            return (
              <Badge
                key={r.id}
                variant="outline"
                className="text-[10px] gap-1 shrink-0"
                style={{
                  color: info.color,
                  borderColor: `${info.color}40`,
                  background: info.bgColor,
                }}
              >
                {info.icon}
                {info.label}
                {r.team && ` (${r.team.shortName})`}
              </Badge>
            )
          })
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onManageRoles}
          className="text-xs h-8 px-2 md:px-3"
          title={t("usersPage.actions.manageRoles")}
          aria-label={t("usersPage.actions.manageRoles")}
        >
          <ShieldCheck className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">{t("usersPage.actions.manageRoles")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetPassword}
          className="text-xs h-8 px-2 md:px-3"
          title={t("usersPage.actions.resetPassword")}
          aria-label={t("usersPage.actions.resetPassword")}
        >
          <KeyRound className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">{t("usersPage.actions.resetPassword")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-xs h-8 px-2 md:px-3"
          title={t("usersPage.actions.edit")}
          aria-label={t("usersPage.actions.edit")}
        >
          <Pencil className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">{t("usersPage.actions.edit")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
          title={t("usersPage.actions.delete")}
          aria-label={t("usersPage.actions.delete")}
        >
          <Trash2 className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">{t("usersPage.actions.delete")}</span>
        </Button>
      </div>
    </div>
  )
}
