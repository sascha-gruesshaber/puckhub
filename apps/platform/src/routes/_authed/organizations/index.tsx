import {
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
import { Building2, Check, Copy, CreditCard, Download, ExternalLink, Globe, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { getBaseDomain } from "@/env"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/organizations/")({
  component: OrganizationsPage,
})

interface OrgForm {
  name: string
  slug: string
  ownerEmail: string
  ownerName: string
  leagueName: string
  leagueShortName: string
  planId: string
  locale: string
}

const emptyForm: OrgForm = { name: "", slug: "", ownerEmail: "", ownerName: "", leagueName: "", leagueShortName: "", planId: "", locale: "de-DE" }

interface EditForm {
  name: string
  slug: string
  planId: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function OrganizationsPage() {
  const { data: orgs, isLoading } = trpc.organization.listAll.useQuery()
  const { data: plans } = trpc.plan.list.useQuery()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<OrgForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof OrgForm, string>>>({})

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingOrg, setDeletingOrg] = useState<{ id: string; name: string } | null>(null)

  // Credentials dialog state
  const [credentialsDialog, setCredentialsDialog] = useState<{
    open: boolean
    email: string
    password: string
  }>({ open: false, email: "", password: "" })
  const [copied, setCopied] = useState(false)

  // Export state
  const [exportingOrgId, setExportingOrgId] = useState<string | null>(null)

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importData, setImportData] = useState<any>(null)
  const [importFileName, setImportFileName] = useState("")
  const [importName, setImportName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<{ id: string; name: string; slug: string; currentPlanId: string } | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: "", slug: "", planId: "" })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditForm, string>>>({})

  const utils = trpc.useUtils()
  const createMutation = trpc.organization.create.useMutation({
    onSuccess: (data) => {
      utils.organization.listAll.invalidate()
      setDialogOpen(false)
      setForm(emptyForm)
      if (data.isNewUser && data.generatedPassword) {
        setCredentialsDialog({
          open: true,
          email: form.ownerEmail,
          password: data.generatedPassword,
        })
      } else {
        toast.success("League created")
      }
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const deleteMutation = trpc.organization.delete.useMutation({
    onSuccess: () => {
      utils.organization.listAll.invalidate()
      utils.users.listAll.invalidate()
      setDeleteDialogOpen(false)
      setDeletingOrg(null)
      toast.success("League deleted")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const setActiveMutation = trpc.organization.setActiveForAdmin.useMutation({
    onSuccess: () => {
      window.open(`${window.location.protocol}//admin.${getBaseDomain()}`, "_blank")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const importMutation = trpc.leagueTransfer.importLeague.useMutation({
    onSuccess: (result) => {
      utils.organization.listAll.invalidate()
      setImportDialogOpen(false)
      setImportData(null)
      setImportFileName("")
      setImportName("")
      toast.success("League imported", {
        description: `"${result.organizationName}" imported successfully`,
      })
    },
    onError: (err) => toast.error("Import failed", { description: err.message }),
  })

  const platformUpdateMutation = trpc.organization.platformUpdate.useMutation({
    onSuccess: () => {
      utils.organization.listAll.invalidate()
      toast.success("League updated")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const assignPlanMutation = trpc.subscription.assignPlan.useMutation({
    onSuccess: () => {
      utils.organization.listAll.invalidate()
      toast.success("Plan updated")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  function setField<K extends keyof OrgForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleNameChange(value: string) {
    setField("name", value)
    // Auto-fill slug
    if (!form.slug || form.slug === slugify(form.name)) {
      setForm((prev) => ({ ...prev, slug: slugify(value) }))
    }
    // Auto-fill league name
    if (!form.leagueName || form.leagueName === form.name) {
      setField("leagueName", value)
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof OrgForm, string>> = {}
    if (!form.name.trim()) next.name = "Name is required"
    if (!form.ownerEmail.trim()) next.ownerEmail = "Owner email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) next.ownerEmail = "Invalid email"
    if (!form.ownerName.trim()) next.ownerName = "Owner name is required"
    if (!form.leagueName.trim()) next.leagueName = "League name is required"
    if (!form.leagueShortName.trim()) next.leagueShortName = "Short name is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    createMutation.mutate({
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      ownerEmail: form.ownerEmail.trim(),
      ownerName: form.ownerName.trim(),
      planId: form.planId || undefined,
      leagueSettings: {
        leagueName: form.leagueName.trim(),
        leagueShortName: form.leagueShortName.trim(),
        locale: form.locale,
      },
    })
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(credentialsDialog.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleExport(orgId: string, orgName: string) {
    setExportingOrgId(orgId)
    try {
      const data = await utils.leagueTransfer.exportLeague.fetch({ organizationId: orgId })
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const date = new Date().toISOString().slice(0, 10)
      const safeName = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      a.href = url
      a.download = `puckhub-${safeName}-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded", { description: `${orgName} exported successfully` })
    } catch (err: any) {
      toast.error("Export failed", { description: err.message })
    } finally {
      setExportingOrgId(null)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        setImportData(parsed)
        setImportName(parsed.organization?.name ?? "")
        setImportDialogOpen(true)
      } catch {
        toast.error("Invalid file", { description: "The selected file is not valid JSON" })
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be selected again
    e.target.value = ""
  }

  function handleImportConfirm() {
    if (!importData) return
    const trimmed = importName.trim()
    const originalName = importData.organization?.name ?? ""
    importMutation.mutate({
      data: importData,
      ...(trimmed && trimmed !== originalName ? { name: trimmed } : {}),
    })
  }

  function openEditDialog(org: any) {
    const currentPlanId = org.subscription?.plan?.id ?? ""
    setEditingOrg({ id: org.id, name: org.name, slug: org.slug, currentPlanId })
    setEditForm({ name: org.name, slug: org.slug, planId: currentPlanId })
    setEditErrors({})
    setEditDialogOpen(true)
  }

  function validateEdit(): boolean {
    const next: Partial<Record<keyof EditForm, string>> = {}
    if (!editForm.name.trim()) next.name = "Name is required"
    if (!editForm.slug.trim()) next.slug = "Subdomain is required"
    else if (!/^[a-z0-9-]+$/.test(editForm.slug)) next.slug = "Only lowercase letters, numbers and hyphens"
    setEditErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingOrg || !validateEdit()) return

    const isSaving = platformUpdateMutation.isPending || assignPlanMutation.isPending

    if (isSaving) return

    const nameChanged = editForm.name.trim() !== editingOrg.name
    const slugChanged = editForm.slug.trim() !== editingOrg.slug
    const planChanged = editForm.planId !== editingOrg.currentPlanId

    // Update org details if changed
    if (nameChanged || slugChanged) {
      platformUpdateMutation.mutate(
        {
          id: editingOrg.id,
          ...(nameChanged ? { name: editForm.name.trim() } : {}),
          ...(slugChanged ? { slug: editForm.slug.trim() } : {}),
        },
        {
          onSuccess: () => {
            // If plan also needs changing, do it after org update succeeds
            if (planChanged && editForm.planId) {
              assignPlanMutation.mutate(
                { organizationId: editingOrg.id, planId: editForm.planId },
                { onSuccess: () => setEditDialogOpen(false) },
              )
            } else {
              setEditDialogOpen(false)
            }
          },
        },
      )
    } else if (planChanged && editForm.planId) {
      assignPlanMutation.mutate(
        { organizationId: editingOrg.id, planId: editForm.planId },
        { onSuccess: () => setEditDialogOpen(false) },
      )
    } else {
      // Nothing changed
      setEditDialogOpen(false)
    }
  }

  // Compute import summary for display
  const importSummary = importData
    ? {
        name: importData.organization?.name ?? "Unknown",
        seasons: importData.seasons?.length ?? 0,
        teams: importData.teams?.length ?? 0,
        players: importData.players?.length ?? 0,
        games: importData.games?.length ?? 0,
      }
    : null

  const editIsSaving = platformUpdateMutation.isPending || assignPlanMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leagues</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all leagues</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import League
          </Button>
          <Button variant="accent" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New League
          </Button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      ) : !orgs || orgs.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
          <Building2 size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">No leagues yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create the first league to get started.</p>
          <Button variant="accent" className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create League
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {orgs.map((org, i) => (
            <div
              key={org.id}
              className={`data-row flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                i < orgs.length - 1 ? "border-b border-border/40" : ""
              }`}
              style={{ "--row-index": i } as React.CSSProperties}
            >
              {org.logo ? (
                <img src={org.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
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
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{org.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {org.slug && (
                    <a
                      href={`${window.location.protocol}//${org.slug}.${getBaseDomain()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      {org.slug}.{getBaseDomain()}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {(org as any).subscription?.plan && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    {(org as any).subscription.plan.name}
                  </span>
                )}
                <p className="text-sm text-muted-foreground">
                  {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 md:px-3"
                onClick={() => openEditDialog(org)}
                title="Edit league"
                aria-label="Edit league"
              >
                <Pencil className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 md:px-3"
                onClick={() => setActiveMutation.mutate({ organizationId: org.id })}
                disabled={setActiveMutation.isPending}
                title="Login to league"
                aria-label="Login to league"
              >
                <ExternalLink className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Login to league</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 md:px-3"
                onClick={() => handleExport(org.id, org.name)}
                disabled={exportingOrgId === org.id}
                title="Export league"
                aria-label="Export league"
              >
                {exportingOrgId === org.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin md:mr-1.5" />
                ) : (
                  <Download className="h-3.5 w-3.5 md:mr-1.5" />
                )}
                <span className="hidden md:inline">{exportingOrgId === org.id ? "Exporting..." : "Export"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                onClick={() => {
                  setDeletingOrg({ id: org.id, name: org.name })
                  setDeleteDialogOpen(true)
                }}
                title="Delete league"
                aria-label="Delete league"
              >
                <Trash2 className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Delete</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create League Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Create League</DialogTitle>
            <DialogDescription>Create a new league with an initial owner.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-2">
            <FormField label="League Name" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Oberliga Baden-Württemberg"
              />
            </FormField>

            <FormField label="Subdomain">
              <Input
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="auto-generated from name"
              />
              {form.slug && (
                <p className="text-xs text-muted-foreground mt-1">
                  URL: <span className="font-mono">{form.slug}.{getBaseDomain()}</span>
                </p>
              )}
            </FormField>

            {plans && plans.length > 0 && (
              <FormField label="Plan">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.planId}
                  onChange={(e) => setForm((p) => ({ ...p, planId: e.target.value }))}
                >
                  <option value="">Free (default)</option>
                  {plans.filter((p) => p.isActive).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Language">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.locale}
                onChange={(e) => setField("locale", e.target.value)}
              >
                <option value="de-DE">Deutsch</option>
                <option value="en-US">English</option>
              </select>
            </FormField>

            <FormField label="Owner Name" error={errors.ownerName} required>
              <Input
                value={form.ownerName}
                onChange={(e) => setField("ownerName", e.target.value)}
                placeholder="e.g. Max Mustermann"
              />
            </FormField>

            <FormField label="Owner Email" error={errors.ownerEmail} required>
              <Input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => setField("ownerEmail", e.target.value)}
                placeholder="admin@league.de"
              />
            </FormField>

            <FormField label="League Name" error={errors.leagueName} required>
              <Input
                value={form.leagueName}
                onChange={(e) => setField("leagueName", e.target.value)}
                placeholder="e.g. Oberliga Baden-Württemberg"
              />
            </FormField>

            <FormField label="League Short Name" error={errors.leagueShortName} required>
              <Input
                value={form.leagueShortName}
                onChange={(e) => setField("leagueShortName", e.target.value)}
                placeholder="e.g. OBWL"
              />
            </FormField>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog
        open={credentialsDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCredentialsDialog({ open: false, email: "", password: "" })
            setCopied(false)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>League Created</DialogTitle>
            <DialogDescription>
              A new user account has been created for the owner. Save these credentials — the password cannot be
              retrieved later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6 pt-2">
            <FormField label="Email">
              <Input value={credentialsDialog.email} readOnly />
            </FormField>

            <FormField label="Password">
              <div className="flex gap-2">
                <Input value={credentialsDialog.password} readOnly className="font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword} title="Copy password">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="accent"
              onClick={() => {
                setCredentialsDialog({ open: false, email: "", password: "" })
                setCopied(false)
                toast.success("League created")
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete League Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete League</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingOrg?.name}</strong>? This will permanently remove the
              league and all its data including seasons, teams, players, games, and statistics. Users who are only
              members of this league will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingOrg) deleteMutation.mutate({ id: deletingOrg.id })
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import League Dialog */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open && !importMutation.isPending) {
            setImportDialogOpen(false)
            setImportData(null)
            setImportFileName("")
            setImportName("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose
            onClick={() => {
              if (!importMutation.isPending) {
                setImportDialogOpen(false)
                setImportData(null)
                setImportFileName("")
                setImportName("")
              }
            }}
          />
          <DialogHeader>
            <DialogTitle>Import League</DialogTitle>
            <DialogDescription>
              Import a league from an export file. This will create a new league with all data from the backup.
            </DialogDescription>
          </DialogHeader>

          {importSummary && (
            <div className="p-6 pt-2 space-y-4">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">File: {importFileName}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Seasons: {importSummary.seasons}</span>
                  <span>Teams: {importSummary.teams}</span>
                  <span>Players: {importSummary.players}</span>
                  <span>Games: {importSummary.games}</span>
                </div>
              </div>

              <FormField label="League Name">
                <Input
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="League name"
                />
              </FormField>

              <DialogFooter className="p-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={importMutation.isPending}
                  onClick={() => {
                    setImportDialogOpen(false)
                    setImportData(null)
                    setImportFileName("")
                    setImportName("")
                  }}
                >
                  Cancel
                </Button>
                <Button variant="accent" disabled={importMutation.isPending} onClick={handleImportConfirm}>
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit League Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !editIsSaving && setEditDialogOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => !editIsSaving && setEditDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>
              Update league details and subscription plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 p-6 pt-2">
            <FormField label="Name" error={editErrors.name} required>
              <Input
                value={editForm.name}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                  if (editErrors.name) setEditErrors((p) => ({ ...p, name: undefined }))
                }}
              />
            </FormField>

            <FormField label="Subdomain" error={editErrors.slug} required>
              <Input
                value={editForm.slug}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
                  if (editErrors.slug) setEditErrors((p) => ({ ...p, slug: undefined }))
                }}
              />
              {editForm.slug && (
                <p className="text-xs text-muted-foreground mt-1">
                  URL: <span className="font-mono">{editForm.slug}.{getBaseDomain()}</span>
                </p>
              )}
            </FormField>

            {plans && plans.length > 0 && (
              <FormField label="Plan">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editForm.planId}
                  onChange={(e) => setEditForm((p) => ({ ...p, planId: e.target.value }))}
                >
                  <option value="">No plan</option>
                  {plans.filter((p) => p.isActive).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editIsSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={editIsSaving}>
                {editIsSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
