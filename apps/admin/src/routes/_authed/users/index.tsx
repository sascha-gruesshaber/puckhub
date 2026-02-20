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
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Crown,
  KeyRound,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { NoResults } from "~/components/noResults"
import { CountSkeleton } from "~/components/skeletons/countSkeleton"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { useTranslation } from "~/i18n/use-translation"
import { FILTER_ALL } from "~/lib/search-params"

export const Route = createFileRoute("/_authed/users/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; role?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.role === "string" && s.role ? { role: s.role } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.users.list.ensureData()
  },
  component: UsersPage,
})

// ---------------------------------------------------------------------------
// Role definitions (Better Auth org roles)
// ---------------------------------------------------------------------------
type OrgRole = "owner" | "admin" | "member"

interface RoleMeta {
  color: string
  bgColor: string
  icon: React.ReactNode
}

const iconProps = { size: 14, strokeWidth: 2 } as const

const ROLE_META: Record<OrgRole, RoleMeta> = {
  owner: {
    color: "hsl(45 93% 47%)",
    bgColor: "hsl(45 93% 47% / 0.1)",
    icon: <Crown {...iconProps} />,
  },
  admin: {
    color: "hsl(25 95% 53%)",
    bgColor: "hsl(25 95% 53% / 0.1)",
    icon: <Shield {...iconProps} />,
  },
  member: {
    color: "hsl(221 83% 53%)",
    bgColor: "hsl(221 83% 53% / 0.1)",
    icon: <User {...iconProps} />,
  },
}

const ORG_ROLES: OrgRole[] = ["owner", "admin", "member"]

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------
interface UserForm {
  name: string
  email: string
  password: string
  role: OrgRole
}

const emptyForm: UserForm = { name: "", email: "", password: "", role: "member" }

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function UsersPage() {
  const { t } = useTranslation("common")
  const { search: searchParam, role } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const roleFilter = role ?? FILTER_ALL
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setRoleFilter = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, role: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{ id: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({})

  // Role change
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [roleUserId, setRoleUserId] = useState<string | null>(null)
  const [roleUserName, setRoleUserName] = useState("")
  const [selectedRole, setSelectedRole] = useState<OrgRole>("member")

  // Password reset
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [passwordUserName, setPasswordUserName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const utils = trpc.useUtils()
  const { data: users, isLoading } = trpc.users.list.useQuery()

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

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      setRoleDialogOpen(false)
      toast.success(t("usersPage.toast.roleUpdated"))
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

  const getRoleLabel = (key: OrgRole) => t(`usersPage.orgRoles.${key}.label`)
  const getRoleDescription = (key: OrgRole) => t(`usersPage.orgRoles.${key}.description`)

  // Count by role
  const roleCounts = useMemo(() => {
    if (!users) return new Map<OrgRole, number>()
    const counts = new Map<OrgRole, number>()
    for (const u of users) {
      const r = u.role as OrgRole
      counts.set(r, (counts.get(r) || 0) + 1)
    }
    return counts
  }, [users])

  const filtered = useMemo(() => {
    if (!users) return []
    let result = users

    // Role filter
    if (roleFilter !== FILTER_ALL) {
      result = result.filter((u) => u.role === roleFilter)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    }

    return result
  }, [users, search, roleFilter])

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
    setForm({ name: user.name, email: user.email, password: "", role: "member" })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(user: { id: string; name: string }) {
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }

  function openRoleDialog(user: { id: string; name: string; role: string }) {
    setRoleUserId(user.id)
    setRoleUserName(user.name)
    setSelectedRole(user.role as OrgRole)
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
        role: (form.role === "owner" ? "admin" : form.role) as "admin" | "member",
      })
    }
  }

  function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!roleUserId) return
    updateRoleMutation.mutate({ userId: roleUserId, role: selectedRole })
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

  return (
    <>
      <DataPageLayout
        title={t("usersPage.title")}
        description={t("usersPage.description")}
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("usersPage.actions.newMember")}
          </Button>
        }
        filters={
          isLoading ? (
            <FilterPillsSkeleton count={4} />
          ) : (
            <>
              <FilterPill
                label={t("usersPage.filters.all")}
                active={roleFilter === FILTER_ALL}
                onClick={() => setRoleFilter(FILTER_ALL)}
              />
              {ORG_ROLES.filter((r) => roleCounts.has(r)).map((r) => (
                <FilterPill
                  key={r}
                  label={`${getRoleLabel(r)} (${roleCounts.get(r) || 0})`}
                  active={roleFilter === r}
                  onClick={() => setRoleFilter(r)}
                  icon={
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                      style={{ background: ROLE_META[r].bgColor, color: ROLE_META[r].color }}
                    >
                      {ROLE_META[r].icon}
                    </span>
                  }
                />
              ))}
            </>
          )
        }
        search={{ value: search, onChange: setSearch, placeholder: t("usersPage.searchPlaceholder") }}
        count={
          isLoading ? (
            <CountSkeleton />
          ) : (users?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {roleFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {users?.length ?? 0}
                </span>{" "}
                {t("usersPage.count.members")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : filtered.length === 0 && !search && roleFilter === FILTER_ALL ? (
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
              <MemberRow
                key={user.id}
                user={user}
                rowIndex={i}
                isLast={i === filtered.length - 1}
                onEdit={() => openEdit(user)}
                onDelete={() => openDelete({ id: user.id, name: user.name })}
                onChangeRole={() => openRoleDialog({ id: user.id, name: user.name, role: user.role })}
                onResetPassword={() => openPasswordDialog({ id: user.id, name: user.name })}
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
              {editingUser ? t("usersPage.dialogs.editUserTitle") : t("usersPage.dialogs.newMemberTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? t("usersPage.dialogs.editUserDescription") : t("usersPage.dialogs.newMemberDescription")}
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
              <>
                <FormField label={t("usersPage.fields.password")} error={errors.password} required>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder={t("usersPage.fields.passwordPlaceholder")}
                  />
                </FormField>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("usersPage.fields.role")}</Label>
                  <select
                    value={form.role}
                    onChange={(e) => setField("role", e.target.value as OrgRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="member">{t("usersPage.orgRoles.member.label")}</option>
                    <option value="admin">{t("usersPage.orgRoles.admin.label")}</option>
                  </select>
                </div>
              </>
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
        confirmLabel={t("usersPage.actions.remove")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingUser) deleteMutation.mutate({ id: deletingUser.id })
        }}
      />

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => setRoleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t("usersPage.dialogs.changeRoleTitle", { name: roleUserName })}</DialogTitle>
            <DialogDescription>{t("usersPage.dialogs.changeRoleDescription")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateRole} className="space-y-4 p-6 pt-2">
            <div className="space-y-2">
              {ORG_ROLES.map((r) => {
                const meta = ROLE_META[r]
                return (
                  <label
                    key={r}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedRole === r ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={selectedRole === r}
                      onChange={() => setSelectedRole(r)}
                      className="sr-only"
                    />
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
                      style={{ background: meta.bgColor, color: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{getRoleLabel(r)}</p>
                      <p className="text-xs text-muted-foreground">{getRoleDescription(r)}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
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
    </>
  )
}

// ---------------------------------------------------------------------------
// MemberRow
// ---------------------------------------------------------------------------
function MemberRow({
  user,
  rowIndex,
  isLast,
  onEdit,
  onDelete,
  onChangeRole,
  onResetPassword,
  t,
}: {
  user: {
    id: string
    name: string
    email: string
    role: string
    memberId: string
    createdAt: Date
  }
  rowIndex: number
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onChangeRole: () => void
  onResetPassword: () => void
  t: (key: string, options?: Record<string, string | number | undefined>) => string
}) {
  const role = user.role as OrgRole
  const meta = ROLE_META[role] ?? ROLE_META.member
  const roleLabel = t(`usersPage.orgRoles.${role}.label`)

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : user.email.substring(0, 2).toUpperCase()

  const isOwner = role === "owner"

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
          background: isOwner
            ? "linear-gradient(135deg, hsl(45 93% 47% / 0.15), hsl(45 93% 47% / 0.05))"
            : "hsl(var(--muted))",
          color: isOwner ? "hsl(45 93% 47%)" : "hsl(var(--muted-foreground))",
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

      {/* Role Badge */}
      <Badge
        variant="outline"
        className="text-[10px] gap-1 shrink-0"
        style={{
          color: meta.color,
          borderColor: `${meta.color}40`,
          background: meta.bgColor,
        }}
      >
        {meta.icon}
        {roleLabel}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onChangeRole}
          className="text-xs h-8 px-2 md:px-3"
          title={t("usersPage.actions.changeRole")}
          aria-label={t("usersPage.actions.changeRole")}
        >
          <Shield className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">{t("usersPage.actions.changeRole")}</span>
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
          title={t("usersPage.actions.remove")}
          aria-label={t("usersPage.actions.remove")}
        >
          <Trash2 className="h-3.5 w-3.5 md:mr-1.5" />
          <span className="hidden md:inline">{t("usersPage.actions.remove")}</span>
        </Button>
      </div>
    </div>
  )
}
