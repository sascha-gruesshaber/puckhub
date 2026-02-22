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
import { Building2, Check, Copy, ExternalLink, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/organizations/")({
  component: OrganizationsPage,
})

interface OrgForm {
  name: string
  ownerEmail: string
  ownerName: string
  leagueName: string
  leagueShortName: string
}

const emptyForm: OrgForm = { name: "", ownerEmail: "", ownerName: "", leagueName: "", leagueShortName: "" }

function OrganizationsPage() {
  const { data: orgs, isLoading } = trpc.organization.listAll.useQuery()
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
      window.open("http://localhost:3000", "_blank")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  function setField<K extends keyof OrgForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleNameChange(value: string) {
    setField("name", value)
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
      ownerEmail: form.ownerEmail.trim(),
      ownerName: form.ownerName.trim(),
      leagueSettings: {
        leagueName: form.leagueName.trim(),
        leagueShortName: form.leagueShortName.trim(),
      },
    })
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(credentialsDialog.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leagues</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all leagues</p>
        </div>
        <Button variant="accent" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New League
        </Button>
      </div>

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
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-muted-foreground">
                  {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveMutation.mutate({ organizationId: org.id })}
                disabled={setActiveMutation.isPending}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Manage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:border-destructive/50"
                onClick={() => {
                  setDeletingOrg({ id: org.id, name: org.name })
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
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
    </div>
  )
}
