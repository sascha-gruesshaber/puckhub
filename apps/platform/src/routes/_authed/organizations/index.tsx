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
import { Building2, Plus } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/organizations/")({
  component: OrganizationsPage,
})

interface OrgForm {
  name: string
  slug: string
  ownerEmail: string
  leagueName: string
  leagueShortName: string
}

const emptyForm: OrgForm = { name: "", slug: "", ownerEmail: "", leagueName: "", leagueShortName: "" }

function OrganizationsPage() {
  const { data: orgs, isLoading } = trpc.organization.listAll.useQuery()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<OrgForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof OrgForm, string>>>({})

  const utils = trpc.useUtils()
  const createMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      utils.organization.listAll.invalidate()
      setDialogOpen(false)
      setForm(emptyForm)
      toast.success("Organization created")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  function setField<K extends keyof OrgForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleNameChange(value: string) {
    setField("name", value)
    // Auto-generate slug from name
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
    setField("slug", slug)
    // Also prefill league name
    if (!form.leagueName || form.leagueName === form.name) {
      setField("leagueName", value)
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof OrgForm, string>> = {}
    if (!form.name.trim()) next.name = "Name is required"
    if (!form.slug.trim()) next.slug = "Slug is required"
    else if (!/^[a-z0-9-]+$/.test(form.slug)) next.slug = "Only lowercase letters, numbers, and hyphens"
    if (!form.ownerEmail.trim()) next.ownerEmail = "Owner email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) next.ownerEmail = "Invalid email"
    if (!form.leagueName.trim()) next.leagueName = "League name is required"
    if (!form.leagueShortName.trim()) next.leagueShortName = "Short name is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    // We need the owner's user ID — for now we use the email to look up
    // The API will handle finding/creating the user
    createMutation.mutate({
      name: form.name.trim(),
      slug: form.slug.trim(),
      ownerUserId: form.ownerEmail.trim(), // The router expects userId; we'll need to resolve this
      leagueSettings: {
        leagueName: form.leagueName.trim(),
        leagueShortName: form.leagueShortName.trim(),
      },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all league organizations</p>
        </div>
        <Button variant="accent" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Organization
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
          <p className="font-medium text-foreground">No organizations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create the first organization to get started.</p>
          <Button variant="accent" className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {orgs.map((org, i) => (
            <div
              key={org.id}
              className={`flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                i < orgs.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              {org.logo ? (
                <img src={org.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", fontSize: 16, fontWeight: 700 }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{org.name}</p>
                <p className="text-xs text-muted-foreground">/{org.slug}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">{org.memberCount}</p>
                <p className="text-xs text-muted-foreground">members</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Organization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Create a new league organization with an initial owner.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-2">
            <FormField label="Organization Name" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Oberliga Baden-Württemberg"
              />
            </FormField>

            <FormField label="Slug" error={errors.slug} required>
              <Input
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="e.g. obwl"
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
    </div>
  )
}
