import {
  Badge,
  Button,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
} from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Crown, KeyRound, Plus, Shield, Trash2, User, Users } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "@/auth-client"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterBar } from "~/components/filterBar"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { FilterDropdown } from "~/components/filterDropdown"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { useOrganization } from "~/contexts/organizationContext"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/users/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; role?: string; edit?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.role === "string" && s.role ? { role: s.role } : {}),
    ...(typeof s.edit === "string" && s.edit ? { edit: s.edit } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.users.list.ensureData()
  },
  component: UsersPage,
})

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
type OrgRole = "owner" | "admin" | "game_manager" | "game_reporter" | "team_manager" | "editor"

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
  game_manager: {
    color: "hsl(142 72% 42%)",
    bgColor: "hsl(142 72% 42% / 0.1)",
    icon: <Users {...iconProps} />,
  },
  game_reporter: {
    color: "hsl(198 93% 45%)",
    bgColor: "hsl(198 93% 45% / 0.1)",
    icon: <KeyRound {...iconProps} />,
  },
  team_manager: {
    color: "hsl(262 83% 58%)",
    bgColor: "hsl(262 83% 58% / 0.1)",
    icon: <Shield {...iconProps} />,
  },
  editor: {
    color: "hsl(330 81% 60%)",
    bgColor: "hsl(330 81% 60% / 0.1)",
    icon: <User {...iconProps} />,
  },
}

const ORG_ROLES: OrgRole[] = ["owner", "admin", "game_manager", "game_reporter", "team_manager", "editor"]

/** Roles that can be scoped to a specific team */
const TEAM_SCOPEABLE_ROLES: OrgRole[] = ["game_manager", "game_reporter", "team_manager"]

interface MemberRoleEntry {
  id: string
  role: OrgRole
  teamId: string | null
}

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------
interface UserForm {
  name: string
  email: string
  role: OrgRole
}

const emptyForm: UserForm = { name: "", email: "", role: "admin" }

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function UsersPage() {
  usePermissionGuard("users")
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { isAtLimit, usageText } = usePlanLimits()
  const atAdminLimit = isAtLimit("maxAdmins")
  const { organization } = useOrganization()
  const isDemoOrg = organization?.id === "demo-league"
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const { search: searchParam, role, edit: editId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const roleFilter = useMemo(() => (role ? role.split(",") : []), [role])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setRoleFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, role: v.join(",") || undefined }), replace: true }),
    [navigate],
  )

  // Sheet state driven by URL
  const isNew = editId === "new"
  const sheetOpen = !!editId

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({})

  // Role management state
  const [addRoleValue, setAddRoleValue] = useState<OrgRole>("game_manager")
  const [addRoleTeamId, setAddRoleTeamId] = useState<string | null>(null)
  const [localRoles, setLocalRoles] = useState<MemberRoleEntry[]>([])

  const utils = trpc.useUtils()
  const { data: users, isLoading } = trpc.users.list.useQuery()
  const { data: teams } = trpc.team.list.useQuery()

  // Find the user being edited
  const editingUser = useMemo(() => {
    if (!editId || isNew || !users) return null
    return users.find((u) => u.id === editId) ?? null
  }, [editId, isNew, users])

  const isSelf = editingUser?.id === currentUserId

  // Populate form when sheet opens
  useEffect(() => {
    if (isNew) {
      setForm(emptyForm)
      setErrors({})
      setLocalRoles([])
      setAddRoleValue("game_manager")
      setAddRoleTeamId(null)
    } else if (editingUser) {
      setForm({ name: editingUser.name, email: editingUser.email, role: "admin" })
      setErrors({})
      setLocalRoles(((editingUser as any).memberRoles as MemberRoleEntry[]) ?? [])
      setAddRoleValue("game_manager")
      setAddRoleTeamId(null)
    }
  }, [isNew, editingUser])

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, edit: undefined }), replace: true })
  }

  function openSheet(id: string) {
    navigate({ search: (prev) => ({ ...prev, edit: id }) })
  }

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      closeSheet()
      toast.success(t("usersPage.toast.created"))
    },
    onError: (err) =>
      toast.error(t("usersPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      closeSheet()
      toast.success(t("usersPage.toast.updated"))
    },
    onError: (err) =>
      toast.error(t("usersPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      setDeleteDialogOpen(false)
      closeSheet()
      toast.success(t("usersPage.toast.deleted"))
    },
    onError: (err) =>
      toast.error(t("usersPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const addRoleMutation = trpc.organization.addMemberRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      if (editingUser) {
        utils.organization.getMemberRoles.invalidate({ memberId: (editingUser as any).memberId })
      }
      toast.success(t("usersPage.toast.roleAdded"))
    },
    onError: (err) => toast.error(t("usersPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const removeRoleMutation = trpc.organization.removeMemberRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      if (editingUser) {
        utils.organization.getMemberRoles.invalidate({ memberId: (editingUser as any).memberId })
      }
      toast.success(t("usersPage.toast.roleRemoved"))
    },
    onError: (err) => toast.error(t("usersPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const getRoleLabel = (key: OrgRole) => t(`usersPage.orgRoles.${key}.label`)
  const getRoleDescription = (key: OrgRole) => t(`usersPage.orgRoles.${key}.description`)

  // Count by role (from memberRoles)
  const roleCounts = useMemo(() => {
    if (!users) return new Map<OrgRole, number>()
    const counts = new Map<OrgRole, number>()
    for (const u of users) {
      const roles = (u as any).memberRoles as MemberRoleEntry[] | undefined
      if (roles) {
        const seen = new Set<OrgRole>()
        for (const r of roles) {
          if (!seen.has(r.role)) {
            seen.add(r.role)
            counts.set(r.role, (counts.get(r.role) || 0) + 1)
          }
        }
      }
    }
    return counts
  }, [users])

  const roleOptions: FilterDropdownOption[] = useMemo(
    () =>
      ORG_ROLES.filter((r) => roleCounts.has(r)).map((r) => ({
        value: r,
        label: `${getRoleLabel(r)} (${roleCounts.get(r) || 0})`,
        icon: (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
            style={{ background: ROLE_META[r].bgColor, color: ROLE_META[r].color }}
          >
            {ROLE_META[r].icon}
          </span>
        ),
      })),
    // biome-ignore lint/correctness/useExhaustiveDependencies: getRoleLabel depends only on t which is already stable
    [roleCounts, getRoleLabel],
  )

  const filtered = useMemo(() => {
    if (!users) return []
    let result = users

    // Role filter (check memberRoles)
    if (roleFilter.length > 0) {
      result = result.filter((u) => {
        const roles = (u as any).memberRoles as MemberRoleEntry[] | undefined
        return roles?.some((r) => roleFilter.includes(r.role)) ?? false
      })
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }

    return result
  }, [users, search, roleFilter])

  function setField<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof UserForm, string>> = {}
    if (!form.name.trim()) next.name = t("usersPage.validation.nameRequired")
    if (!form.email.trim()) next.email = t("usersPage.validation.emailRequired")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t("usersPage.validation.emailInvalid")
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
        role: form.role,
      })
    }
  }

  function handleAddRole(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    const memberId = (editingUser as any).memberId
    if (!memberId) return
    addRoleMutation.mutate(
      {
        memberId,
        role: addRoleValue,
        teamId: TEAM_SCOPEABLE_ROLES.includes(addRoleValue) ? (addRoleTeamId ?? undefined) : undefined,
      },
      {
        onSuccess: () => {
          const newEntry: MemberRoleEntry = {
            id: crypto.randomUUID(),
            role: addRoleValue,
            teamId: TEAM_SCOPEABLE_ROLES.includes(addRoleValue) ? addRoleTeamId : null,
          }
          setLocalRoles((prev) => [...prev, newEntry])
          setAddRoleValue("game_manager")
          setAddRoleTeamId(null)
        },
      },
    )
  }

  function handleRemoveRole(memberRoleId: string) {
    removeRoleMutation.mutate(
      { memberRoleId },
      {
        onSuccess: () => {
          setLocalRoles((prev) => prev.filter((r) => r.id !== memberRoleId))
        },
      },
    )
  }

  const isDirty = isNew
    ? form.name !== "" || form.email !== ""
    : editingUser
      ? form.name !== editingUser.name || form.email !== editingUser.email
      : false

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataPageLayout
        title={t("usersPage.title")}
        description={t("usersPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageText("maxAdmins")}</Badge>
            <Button
              variant="accent"
              onClick={() => openSheet("new")}
              data-testid="users-new"
              disabled={atAdminLimit || isDemoOrg}
              title={
                isDemoOrg
                  ? t("usersPage.demoRestricted", { defaultValue: "User management is disabled for the demo league." })
                  : atAdminLimit
                    ? t("plan.limitReached", { defaultValue: "Plan limit reached" })
                    : undefined
              }
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("usersPage.actions.newMember")}
            </Button>
          </div>
        }
        filters={
          <FilterBar
            label={t("filters")}
            search={{ value: search, onChange: setSearch, placeholder: t("usersPage.searchPlaceholder") }}
          >
            {isLoading ? (
              <FilterPillsSkeleton count={1} />
            ) : (
              <FilterDropdown
                label={t("usersPage.filters.all")}
                options={roleOptions}
                value={roleFilter}
                onChange={setRoleFilter}
              />
            )}
          </FilterBar>
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : filtered.length === 0 && !search && roleFilter.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("usersPage.empty.title")}
            description={t("usersPage.empty.description")}
            action={
              <Button variant="accent" onClick={() => openSheet("new")} disabled={atAdminLimit || isDemoOrg}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("usersPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("usersPage.filters.fallback")} />
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((user, i) => {
              const memberRoles = ((user as any).memberRoles ?? []) as MemberRoleEntry[]
              const isOwner = memberRoles.some((r) => r.role === "owner")
              const initials = user.name
                ? user.name
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2)
                : user.email.substring(0, 2).toUpperCase()

              return (
                // biome-ignore lint/a11y/noNoninteractiveElementInteractions: role is conditionally set to "button"; onClick is guarded by isDemoOrg check
                // biome-ignore lint/a11y/noStaticElementInteractions: role is conditionally set to "button"; onClick is guarded by isDemoOrg check
                <div
                  key={user.id}
                  data-testid="user-row"
                  onClick={() => !isDemoOrg && openSheet(user.id)}
                  className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                    !isDemoOrg ? "cursor-pointer" : ""
                  } ${i < filtered.length - 1 ? "border-b border-border/40" : ""}`}
                  style={{ "--row-index": i } as React.CSSProperties}
                  role={!isDemoOrg ? "button" : undefined}
                  tabIndex={!isDemoOrg ? 0 : undefined}
                  onKeyDown={
                    !isDemoOrg
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openSheet(user.id)
                          }
                        }
                      : undefined
                  }
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

                  {/* Role Badges */}
                  <div className="flex items-center gap-1 flex-wrap shrink-0 max-w-[280px] justify-end">
                    {memberRoles.length === 0 ? (
                      <Badge variant="outline" className="text-[10px] gap-1 shrink-0 text-muted-foreground">
                        {t("usersPage.roles.noRoles")}
                      </Badge>
                    ) : (
                      memberRoles.map((entry) => {
                        const meta = ROLE_META[entry.role] ?? ROLE_META.admin
                        const roleLabel = t(`usersPage.orgRoles.${entry.role}.label`)
                        return (
                          <Badge
                            key={entry.id}
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
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit User Sheet with Roles */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        dirty={isDirty}
        onDirtyClose={() => setConfirmCloseOpen(true)}
      >
        <SheetContent size="lg">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>
              {isNew ? t("usersPage.dialogs.newMemberTitle") : t("usersPage.dialogs.editUserTitle")}
            </SheetTitle>
            <SheetDescription>
              {isNew ? t("usersPage.dialogs.newMemberDescription") : t("usersPage.dialogs.editUserDescription")}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              {/* Name + Email */}
              <FormField label={t("usersPage.fields.name")} error={errors.name} required>
                <Input
                  data-testid="users-form-name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder={t("usersPage.fields.namePlaceholder")}
                />
              </FormField>

              <FormField label={t("usersPage.fields.email")} error={errors.email} required>
                <Input
                  data-testid="users-form-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder={t("usersPage.fields.emailPlaceholder")}
                />
              </FormField>

              {/* Role selector for create mode */}
              {isNew && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("usersPage.fields.role")}</Label>
                  <div className="space-y-2">
                    {ORG_ROLES.map((r) => {
                      const meta = ROLE_META[r]
                      return (
                        <label
                          key={r}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            form.role === r ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="createRole"
                            value={r}
                            checked={form.role === r}
                            onChange={() => setField("role", r)}
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
                </div>
              )}

              {/* Role management for edit mode */}
              {editingUser && (
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">{t("usersPage.roles.currentRoles")}</h3>

                  {/* Current roles */}
                  {localRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">{t("usersPage.roles.noRoles")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {localRoles.map((entry) => {
                        const meta = ROLE_META[entry.role] ?? ROLE_META.admin
                        const teamName = entry.teamId
                          ? (teams?.find((t2: any) => t2.id === entry.teamId)?.name ?? entry.teamId)
                          : null
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2"
                          >
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded shrink-0"
                              style={{ background: meta.bgColor, color: meta.color }}
                            >
                              {meta.icon}
                            </div>
                            <span className="text-sm font-medium flex-1 min-w-0 truncate">
                              {getRoleLabel(entry.role)}
                              {teamName && <span className="text-muted-foreground font-normal"> — {teamName}</span>}
                              {TEAM_SCOPEABLE_ROLES.includes(entry.role) && !entry.teamId && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  — {t("usersPage.roles.allTeams")}
                                </span>
                              )}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveRole(entry.id)}
                              disabled={removeRoleMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Add role */}
                  <div className="border-t border-border/40 pt-4">
                    <Label className="text-xs text-muted-foreground mb-2 block">{t("usersPage.roles.addRole")}</Label>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        {ORG_ROLES.map((r) => {
                          const meta = ROLE_META[r]
                          return (
                            <label
                              key={r}
                              className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                                addRoleValue === r ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="addRole"
                                value={r}
                                checked={addRoleValue === r}
                                onChange={() => {
                                  setAddRoleValue(r)
                                  setAddRoleTeamId(null)
                                }}
                                className="sr-only"
                              />
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
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

                      {TEAM_SCOPEABLE_ROLES.includes(addRoleValue) && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            {t("usersPage.roles.teamScope")}
                          </Label>
                          <Select
                            value={addRoleTeamId ?? "__all__"}
                            onValueChange={(v) => setAddRoleTeamId(v === "__all__" ? null : v)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">{t("usersPage.roles.allTeams")}</SelectItem>
                              {teams?.map((team: any) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        disabled={addRoleMutation.isPending}
                        onClick={handleAddRole as unknown as React.MouseEventHandler}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {addRoleMutation.isPending ? t("saving") : t("usersPage.roles.addRole")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </SheetBody>

            <SheetFooter>
              {editingUser && !isSelf && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="user-remove"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {t("usersPage.actions.remove")}
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isDirty) setConfirmCloseOpen(true)
                  else closeSheet()
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving} data-testid="users-form-submit">
                {isSaving ? t("saving") : isNew ? t("create") : t("save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
        description={t("unsavedChanges.description", {
          defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?",
        })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmCloseOpen(false)
          closeSheet()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("usersPage.deleteDialog.title")}
        description={t("usersPage.deleteDialog.description", { name: editingUser?.name ?? "" })}
        confirmLabel={t("usersPage.actions.remove")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        confirmTestId="user-remove-confirm"
        onConfirm={() => {
          if (editingUser) deleteMutation.mutate({ id: editingUser.id })
        }}
      />
    </>
  )
}
