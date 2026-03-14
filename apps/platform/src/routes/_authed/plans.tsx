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
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/plans")({
  component: PlansPage,
})

interface PlanForm {
  name: string
  slug: string
  description: string
  sortOrder: number
  isActive: boolean
  priceMonthly: number
  priceYearly: number
  maxTeams: number | null
  maxPlayers: number | null
  maxDivisionsPerSeason: number | null
  maxSeasons: number | null
  maxAdmins: number | null
  maxNewsArticles: number | null
  maxPages: number | null
  maxSponsors: number | null
  maxDocuments: number | null
  storageQuotaMb: number | null
  featureCustomDomain: boolean
  featureWebsiteBuilder: boolean
  featureSponsorMgmt: boolean
  featureTrikotDesigner: boolean
  featureExportImport: boolean
  featureGameReports: boolean
  featurePlayerStats: boolean
  featureScheduler: boolean
  featureScheduledNews: boolean
  featureAdvancedRoles: boolean
  featureAdvancedStats: boolean
  featureAiRecaps: boolean
  aiMonthlyTokenLimit: number | null
}

const emptyForm: PlanForm = {
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
  isActive: true,
  priceMonthly: 0,
  priceYearly: 0,
  maxTeams: null,
  maxPlayers: null,
  maxDivisionsPerSeason: null,
  maxSeasons: null,
  maxAdmins: null,
  maxNewsArticles: null,
  maxPages: null,
  maxSponsors: null,
  maxDocuments: null,
  storageQuotaMb: null,
  featureCustomDomain: false,
  featureWebsiteBuilder: false,
  featureSponsorMgmt: false,
  featureTrikotDesigner: false,
  featureExportImport: false,
  featureGameReports: true,
  featurePlayerStats: true,
  featureScheduler: false,
  featureScheduledNews: false,
  featureAdvancedRoles: false,
  featureAdvancedStats: false,
  featureAiRecaps: false,
  aiMonthlyTokenLimit: null,
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

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " EUR"
}

function LimitInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const isUnlimited = value === null
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <Input
          type="number"
          min={0}
          value={isUnlimited ? "" : value}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === "" ? null : Number.parseInt(v, 10))
          }}
          placeholder="Unlimited"
          disabled={isUnlimited}
          className="h-8 text-sm"
        />
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer pt-4">
        <input
          type="checkbox"
          checked={isUnlimited}
          onChange={(e) => onChange(e.target.checked ? null : 0)}
          className="accent-primary"
        />
        <span className="whitespace-nowrap">No limit</span>
      </label>
    </div>
  )
}

function FeatureToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {label}
    </label>
  )
}

function PlansPage() {
  const { data: plans, isLoading } = trpc.plan.list.useQuery()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState<{ id: string; name: string } | null>(null)

  const utils = trpc.useUtils()

  const createMutation = trpc.plan.create.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate()
      closeDialog()
      toast.success("Plan created")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const updateMutation = trpc.plan.update.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate()
      closeDialog()
      toast.success("Plan updated")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  const deleteMutation = trpc.plan.delete.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingPlan(null)
      toast.success("Plan deleted")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(plan: any) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxTeams: plan.maxTeams,
      maxPlayers: plan.maxPlayers,
      maxDivisionsPerSeason: plan.maxDivisionsPerSeason,
      maxSeasons: plan.maxSeasons,
      maxAdmins: plan.maxAdmins,
      maxNewsArticles: plan.maxNewsArticles,
      maxPages: plan.maxPages,
      maxSponsors: plan.maxSponsors,
      maxDocuments: plan.maxDocuments,
      storageQuotaMb: plan.storageQuotaMb,
      featureCustomDomain: plan.featureCustomDomain,
      featureWebsiteBuilder: plan.featureWebsiteBuilder,
      featureSponsorMgmt: plan.featureSponsorMgmt,
      featureTrikotDesigner: plan.featureTrikotDesigner,
      featureExportImport: plan.featureExportImport,
      featureGameReports: plan.featureGameReports,
      featurePlayerStats: plan.featurePlayerStats,
      featureScheduler: plan.featureScheduler,
      featureScheduledNews: plan.featureScheduledNews,
      featureAdvancedRoles: plan.featureAdvancedRoles,
      featureAdvancedStats: plan.featureAdvancedStats,
      featureAiRecaps: plan.featureAiRecaps,
      aiMonthlyTokenLimit: plan.aiMonthlyTokenLimit,
    })
    setDialogOpen(true)
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: !editingId || prev.slug === slugify(prev.name) ? slugify(value) : prev.slug,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      ...form,
      description: form.description || null,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage subscription plans and pricing</p>
        </div>
        <Button variant="accent" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
          <CreditCard size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">No plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create plans to manage subscription tiers.</p>
          <Button variant="accent" className="mt-4" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                plan.isActive ? "border-border/50" : "border-border/30 opacity-60"
              }`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    {!plan.isActive && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Inactive</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{plan._count.subscriptions} orgs</span>
                </div>

                <p className="text-2xl font-bold text-foreground mb-1">
                  {plan.priceMonthly === 0 ? "Free" : formatPrice(plan.priceMonthly)}
                </p>
                {plan.priceMonthly > 0 && (
                  <p className="text-xs text-muted-foreground mb-4">
                    / month &middot; {formatPrice(plan.priceYearly)} / year
                  </p>
                )}

                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p>Teams: {plan.maxTeams ?? "Unlimited"}</p>
                  <p>Players: {plan.maxPlayers ?? "Unlimited"}</p>
                  <p>Divisions/Season: {plan.maxDivisionsPerSeason ?? "Unlimited"}</p>
                  <p>Seasons: {plan.maxSeasons ?? "Unlimited"}</p>
                  <p>Storage: {plan.storageQuotaMb ? `${plan.storageQuotaMb} MB` : "Unlimited"}</p>
                </div>
              </div>

              <div className="border-t border-border/40 px-5 py-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(plan)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  disabled={plan._count.subscriptions > 0}
                  title={plan._count.subscriptions > 0 ? "Cannot delete plan with active subscriptions" : "Delete plan"}
                  onClick={() => {
                    setDeletingPlan({ id: plan.id, name: plan.name })
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Create Plan"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the plan's limits and features." : "Define a new subscription plan."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 pt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name" required>
                <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Pro" />
              </FormField>
              <FormField label="Slug" required>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="e.g. pro"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description"
              />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Monthly (cents)">
                <Input
                  type="number"
                  min={0}
                  value={form.priceMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, priceMonthly: Number.parseInt(e.target.value) || 0 }))}
                />
              </FormField>
              <FormField label="Yearly (cents)">
                <Input
                  type="number"
                  min={0}
                  value={form.priceYearly}
                  onChange={(e) => setForm((p) => ({ ...p, priceYearly: Number.parseInt(e.target.value) || 0 }))}
                />
              </FormField>
              <FormField label="Sort Order">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number.parseInt(e.target.value) || 0 }))}
                />
              </FormField>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="accent-primary"
              />
              Active
            </label>

            {/* Structural Limits */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Structural Limits</h4>
              <div className="grid grid-cols-2 gap-3">
                <LimitInput label="Teams" value={form.maxTeams} onChange={(v) => setForm((p) => ({ ...p, maxTeams: v }))} />
                <LimitInput label="Players" value={form.maxPlayers} onChange={(v) => setForm((p) => ({ ...p, maxPlayers: v }))} />
                <LimitInput label="Divisions / Season" value={form.maxDivisionsPerSeason} onChange={(v) => setForm((p) => ({ ...p, maxDivisionsPerSeason: v }))} />
                <LimitInput label="Seasons" value={form.maxSeasons} onChange={(v) => setForm((p) => ({ ...p, maxSeasons: v }))} />
                <LimitInput label="Admin Users" value={form.maxAdmins} onChange={(v) => setForm((p) => ({ ...p, maxAdmins: v }))} />
              </div>
            </div>

            {/* Content Limits */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Content Limits</h4>
              <div className="grid grid-cols-2 gap-3">
                <LimitInput label="News Articles" value={form.maxNewsArticles} onChange={(v) => setForm((p) => ({ ...p, maxNewsArticles: v }))} />
                <LimitInput label="CMS Pages" value={form.maxPages} onChange={(v) => setForm((p) => ({ ...p, maxPages: v }))} />
                <LimitInput label="Sponsors" value={form.maxSponsors} onChange={(v) => setForm((p) => ({ ...p, maxSponsors: v }))} />
                <LimitInput label="Documents" value={form.maxDocuments} onChange={(v) => setForm((p) => ({ ...p, maxDocuments: v }))} />
                <LimitInput label="Storage (MB)" value={form.storageQuotaMb} onChange={(v) => setForm((p) => ({ ...p, storageQuotaMb: v }))} />
              </div>
            </div>

            {/* Feature Flags */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Features</h4>
              <div className="grid grid-cols-2 gap-2">
                <FeatureToggle label="Game Reports" checked={form.featureGameReports} onChange={(v) => setForm((p) => ({ ...p, featureGameReports: v }))} />
                <FeatureToggle label="Player Statistics" checked={form.featurePlayerStats} onChange={(v) => setForm((p) => ({ ...p, featurePlayerStats: v }))} />
                <FeatureToggle label="Website Builder" checked={form.featureWebsiteBuilder} onChange={(v) => setForm((p) => ({ ...p, featureWebsiteBuilder: v }))} />
                <FeatureToggle label="Sponsor Management" checked={form.featureSponsorMgmt} onChange={(v) => setForm((p) => ({ ...p, featureSponsorMgmt: v }))} />
                <FeatureToggle label="Custom Domain" checked={form.featureCustomDomain} onChange={(v) => setForm((p) => ({ ...p, featureCustomDomain: v }))} />
                <FeatureToggle label="Jersey Designer" checked={form.featureTrikotDesigner} onChange={(v) => setForm((p) => ({ ...p, featureTrikotDesigner: v }))} />
                <FeatureToggle label="Export / Import" checked={form.featureExportImport} onChange={(v) => setForm((p) => ({ ...p, featureExportImport: v }))} />
                <FeatureToggle label="Auto-Scheduler" checked={form.featureScheduler} onChange={(v) => setForm((p) => ({ ...p, featureScheduler: v }))} />
                <FeatureToggle label="Scheduled News" checked={form.featureScheduledNews} onChange={(v) => setForm((p) => ({ ...p, featureScheduledNews: v }))} />
                <FeatureToggle label="Advanced Roles" checked={form.featureAdvancedRoles} onChange={(v) => setForm((p) => ({ ...p, featureAdvancedRoles: v }))} />
                <FeatureToggle label="Advanced Statistics" checked={form.featureAdvancedStats} onChange={(v) => setForm((p) => ({ ...p, featureAdvancedStats: v }))} />
                <FeatureToggle label="AI Recaps" checked={form.featureAiRecaps} onChange={(v) => setForm((p) => ({ ...p, featureAiRecaps: v }))} />
              </div>
            </div>

            {/* AI Limits */}
            {form.featureAiRecaps && (
              <div>
                <h4 className="text-sm font-semibold mb-3">AI Limits</h4>
                <div className="grid grid-cols-2 gap-3">
                  <LimitInput label="Monthly Token Budget" value={form.aiMonthlyTokenLimit} onChange={(v) => setForm((p) => ({ ...p, aiMonthlyTokenLimit: v }))} />
                </div>
              </div>
            )}

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the plan <strong>{deletingPlan?.name}</strong>? This action cannot be
              undone.
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
                if (deletingPlan) deleteMutation.mutate({ id: deletingPlan.id })
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
