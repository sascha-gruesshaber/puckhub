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
import { CreditCard, Pencil } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/plans")({
  component: PlansPage,
})

interface PlanForm {
  sortOrder: number
  isActive: boolean
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
  featureGameReports: boolean
  featurePlayerStats: boolean
  featureScheduler: boolean
  featureScheduledNews: boolean
  featureAdvancedRoles: boolean
  featureAdvancedStats: boolean
  featureAiRecaps: boolean
  featurePublicReports: boolean
  aiMonthlyTokenLimit: number | null
}

const emptyForm: PlanForm = {
  sortOrder: 0,
  isActive: true,
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
  featureGameReports: true,
  featurePlayerStats: true,
  featureScheduler: false,
  featureScheduledNews: false,
  featureAdvancedRoles: false,
  featureAdvancedStats: false,
  featureAiRecaps: false,
  featurePublicReports: false,
  aiMonthlyTokenLimit: null,
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
  const [editingName, setEditingName] = useState("")
  const [form, setForm] = useState<PlanForm>(emptyForm)

  const utils = trpc.useUtils()

  const updateMutation = trpc.plan.update.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate()
      closeDialog()
      toast.success("Plan updated")
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setEditingName("")
    setForm(emptyForm)
  }

  function openEdit(plan: any) {
    setEditingId(plan.id)
    setEditingName(plan.name)
    setForm({
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
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
      featureGameReports: plan.featureGameReports,
      featurePlayerStats: plan.featurePlayerStats,
      featureScheduler: plan.featureScheduler,
      featureScheduledNews: plan.featureScheduledNews,
      featureAdvancedRoles: plan.featureAdvancedRoles,
      featureAdvancedStats: plan.featureAdvancedStats,
      featureAiRecaps: plan.featureAiRecaps,
      featurePublicReports: plan.featurePublicReports,
      aiMonthlyTokenLimit: plan.aiMonthlyTokenLimit,
    })
    setDialogOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    updateMutation.mutate({ id: editingId, ...form })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage subscription plan limits and features</p>
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
          <p className="font-medium text-foreground">No plans found</p>
          <p className="mt-1 text-sm text-muted-foreground">Run the seed to create the default plans.</p>
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
                    <span className="text-xs text-muted-foreground font-mono">{plan.slug}</span>
                    {!plan.isActive && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Inactive</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{plan._count.subscriptions} orgs</span>
                </div>

                <p className="text-2xl font-bold text-foreground mb-1">
                  {plan.priceYearly === 0 ? "Free" : `${formatPrice(plan.priceYearly)} / year`}
                </p>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p>Teams: {plan.maxTeams ?? "Unlimited"}</p>
                  <p>Players: {plan.maxPlayers ?? "Unlimited"}</p>
                  <p>Divisions/Season: {plan.maxDivisionsPerSeason ?? "Unlimited"}</p>
                  <p>Seasons: {plan.maxSeasons ?? "Unlimited"}</p>
                  <p>Storage: {plan.storageQuotaMb ? `${plan.storageQuotaMb} MB` : "Unlimited"}</p>
                </div>
              </div>

              <div className="border-t border-border/40 px-5 py-3 flex justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(plan)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingName}</DialogTitle>
            <DialogDescription>Update the plan's pricing, limits, and features.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Yearly price (cents)">
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
                <LimitInput
                  label="Teams"
                  value={form.maxTeams}
                  onChange={(v) => setForm((p) => ({ ...p, maxTeams: v }))}
                />
                <LimitInput
                  label="Players"
                  value={form.maxPlayers}
                  onChange={(v) => setForm((p) => ({ ...p, maxPlayers: v }))}
                />
                <LimitInput
                  label="Divisions / Season"
                  value={form.maxDivisionsPerSeason}
                  onChange={(v) => setForm((p) => ({ ...p, maxDivisionsPerSeason: v }))}
                />
                <LimitInput
                  label="Seasons"
                  value={form.maxSeasons}
                  onChange={(v) => setForm((p) => ({ ...p, maxSeasons: v }))}
                />
                <LimitInput
                  label="Admin Users"
                  value={form.maxAdmins}
                  onChange={(v) => setForm((p) => ({ ...p, maxAdmins: v }))}
                />
              </div>
            </div>

            {/* Content Limits */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Content Limits</h4>
              <div className="grid grid-cols-2 gap-3">
                <LimitInput
                  label="News Articles"
                  value={form.maxNewsArticles}
                  onChange={(v) => setForm((p) => ({ ...p, maxNewsArticles: v }))}
                />
                <LimitInput
                  label="CMS Pages"
                  value={form.maxPages}
                  onChange={(v) => setForm((p) => ({ ...p, maxPages: v }))}
                />
                <LimitInput
                  label="Sponsors"
                  value={form.maxSponsors}
                  onChange={(v) => setForm((p) => ({ ...p, maxSponsors: v }))}
                />
                <LimitInput
                  label="Documents"
                  value={form.maxDocuments}
                  onChange={(v) => setForm((p) => ({ ...p, maxDocuments: v }))}
                />
                <LimitInput
                  label="Storage (MB)"
                  value={form.storageQuotaMb}
                  onChange={(v) => setForm((p) => ({ ...p, storageQuotaMb: v }))}
                />
              </div>
            </div>

            {/* Feature Flags */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Features</h4>
              <div className="grid grid-cols-2 gap-2">
                <FeatureToggle
                  label="Game Reports"
                  checked={form.featureGameReports}
                  onChange={(v) => setForm((p) => ({ ...p, featureGameReports: v }))}
                />
                <FeatureToggle
                  label="Player Statistics"
                  checked={form.featurePlayerStats}
                  onChange={(v) => setForm((p) => ({ ...p, featurePlayerStats: v }))}
                />
                <FeatureToggle
                  label="Website Builder"
                  checked={form.featureWebsiteBuilder}
                  onChange={(v) => setForm((p) => ({ ...p, featureWebsiteBuilder: v }))}
                />
                <FeatureToggle
                  label="Sponsor Management"
                  checked={form.featureSponsorMgmt}
                  onChange={(v) => setForm((p) => ({ ...p, featureSponsorMgmt: v }))}
                />
                <FeatureToggle
                  label="Custom Domain"
                  checked={form.featureCustomDomain}
                  onChange={(v) => setForm((p) => ({ ...p, featureCustomDomain: v }))}
                />
                <FeatureToggle
                  label="Jersey Designer"
                  checked={form.featureTrikotDesigner}
                  onChange={(v) => setForm((p) => ({ ...p, featureTrikotDesigner: v }))}
                />
                <FeatureToggle
                  label="Auto-Scheduler"
                  checked={form.featureScheduler}
                  onChange={(v) => setForm((p) => ({ ...p, featureScheduler: v }))}
                />
                <FeatureToggle
                  label="Scheduled News"
                  checked={form.featureScheduledNews}
                  onChange={(v) => setForm((p) => ({ ...p, featureScheduledNews: v }))}
                />
                <FeatureToggle
                  label="Advanced Roles"
                  checked={form.featureAdvancedRoles}
                  onChange={(v) => setForm((p) => ({ ...p, featureAdvancedRoles: v }))}
                />
                <FeatureToggle
                  label="Advanced Statistics"
                  checked={form.featureAdvancedStats}
                  onChange={(v) => setForm((p) => ({ ...p, featureAdvancedStats: v }))}
                />
                <FeatureToggle
                  label="AI Recaps"
                  checked={form.featureAiRecaps}
                  onChange={(v) => setForm((p) => ({ ...p, featureAiRecaps: v }))}
                />
                <FeatureToggle
                  label="Public Game Reports"
                  checked={form.featurePublicReports}
                  onChange={(v) => setForm((p) => ({ ...p, featurePublicReports: v }))}
                />
              </div>
            </div>

            {/* AI Limits */}
            {form.featureAiRecaps && (
              <div>
                <h4 className="text-sm font-semibold mb-3">AI Limits</h4>
                <div className="grid grid-cols-2 gap-3">
                  <LimitInput
                    label="Monthly Token Budget"
                    value={form.aiMonthlyTokenLimit}
                    onChange={(v) => setForm((p) => ({ ...p, aiMonthlyTokenLimit: v }))}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
