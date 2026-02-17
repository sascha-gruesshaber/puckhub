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
import { ExternalLink, Handshake, Pencil, Plus, Trash2 } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { CountSkeleton } from "~/components/skeletons/countSkeleton"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { NoResults } from "~/components/noResults"
import { ImageUpload } from "~/components/imageUpload"
import { TeamCombobox } from "~/components/teamCombobox"
import { TeamFilterPills } from "~/components/teamFilterPills"
import { FILTER_ALL } from "~/lib/search-params"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/sponsors/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; team?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.sponsor.list.ensureData()
  },
  component: SponsorsPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SponsorForm {
  name: string
  logoUrl: string
  websiteUrl: string
  hoverText: string
  teamId: string
  sortOrder: number
  isActive: boolean
}

const emptyForm: SponsorForm = {
  name: "",
  logoUrl: "",
  websiteUrl: "",
  hoverText: "",
  teamId: "",
  sortOrder: 0,
  isActive: true,
}

const FILTER_SITEWIDE = "__sitewide__"

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function SponsorsPage() {
  const { t } = useTranslation("common")
  const { search: searchParam, team } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const teamFilter = team ?? FILTER_ALL
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setTeamFilter = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, team: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<{ id: string } | null>(null)
  const [deletingSponsor, setDeletingSponsor] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<SponsorForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof SponsorForm, string>>>({})

  const utils = trpc.useUtils()
  const { data: sponsors, isLoading } = trpc.sponsor.list.useQuery()
  const { data: teams } = trpc.team.list.useQuery()

  // Build list of teams that actually have sponsors assigned
  const teamsWithSponsors = useMemo(() => {
    if (!sponsors || !teams) return []
    const assignedTeamIds = new Set(sponsors.filter((s) => s.teamId).map((s) => s.teamId))
    return teams
      .filter((t) => assignedTeamIds.has(t.id))
      .map((t) => ({
        id: t.shortName,
        name: t.name,
        shortName: t.shortName,
        logoUrl: t.logoUrl,
        city: t.city,
        primaryColor: t.primaryColor,
      }))
  }, [sponsors, teams])

  const siteWideCount = useMemo(() => {
    if (!sponsors) return 0
    return sponsors.filter((s) => !s.teamId).length
  }, [sponsors])

  const createMutation = trpc.sponsor.create.useMutation({
    onSuccess: () => {
      utils.sponsor.list.invalidate()
      closeDialog()
      toast.success(t("sponsorsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("sponsorsPage.toast.createError"), { description: err.message })
    },
  })

  const updateMutation = trpc.sponsor.update.useMutation({
    onSuccess: () => {
      utils.sponsor.list.invalidate()
      closeDialog()
      toast.success(t("sponsorsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("sponsorsPage.toast.saveError"), { description: err.message })
    },
  })

  const deleteMutation = trpc.sponsor.delete.useMutation({
    onSuccess: () => {
      utils.sponsor.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingSponsor(null)
      toast.success(t("sponsorsPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("sponsorsPage.toast.deleteError"), { description: err.message })
    },
  })

  const filtered = useMemo(() => {
    if (!sponsors) return []

    let result = sponsors

    // Team filter
    if (teamFilter === FILTER_SITEWIDE) {
      result = result.filter((s) => !s.teamId)
    } else if (teamFilter !== FILTER_ALL) {
      // teamFilter is a team shortName
      result = result.filter((s) => s.team?.shortName === teamFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.hoverText?.toLowerCase().includes(q) ||
          s.team?.name.toLowerCase().includes(q),
      )
    }

    return result
  }, [sponsors, search, teamFilter])

  // Group filtered sponsors by active/inactive
  const grouped = useMemo(() => {
    const active = filtered.filter((s) => s.isActive)
    const inactive = filtered.filter((s) => !s.isActive)
    return { active, inactive }
  }, [filtered])

  const stats = useMemo(() => {
    if (!sponsors) return { total: 0, active: 0 }
    return {
      total: sponsors.length,
      active: sponsors.filter((s) => s.isActive).length,
    }
  }, [sponsors])

  function setField<K extends keyof SponsorForm>(key: K, value: SponsorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openCreate() {
    setEditingSponsor(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(sponsor: NonNullable<typeof sponsors>[number]) {
    setEditingSponsor({ id: sponsor.id })
    setForm({
      name: sponsor.name,
      logoUrl: sponsor.logoUrl || "",
      websiteUrl: sponsor.websiteUrl || "",
      hoverText: sponsor.hoverText || "",
      teamId: sponsor.teamId || "",
      sortOrder: sponsor.sortOrder,
      isActive: sponsor.isActive,
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(sponsor: { id: string; name: string }) {
    setDeletingSponsor(sponsor)
    setDeleteDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingSponsor(null)
    setForm(emptyForm)
    setErrors({})
  }

  function validate(): boolean {
    const next: Partial<Record<keyof SponsorForm, string>> = {}
    if (!form.name.trim()) next.name = t("sponsorsPage.validation.nameRequired")
    if (form.websiteUrl && !/^https?:\/\/.+/.test(form.websiteUrl)) {
      next.websiteUrl = t("sponsorsPage.validation.websiteInvalid")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (editingSponsor) {
      updateMutation.mutate({
        id: editingSponsor.id,
        name: form.name.trim(),
        logoUrl: form.logoUrl || null,
        websiteUrl: form.websiteUrl.trim() || null,
        hoverText: form.hoverText.trim() || null,
        teamId: form.teamId || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      })
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        logoUrl: form.logoUrl || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
        hoverText: form.hoverText.trim() || undefined,
        teamId: form.teamId || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  function renderSponsorRow(sponsor: NonNullable<typeof sponsors>[number], globalIndex: number, isLast: boolean) {
    const initials = sponsor.name.substring(0, 2).toUpperCase()

    return (
      <div
        key={sponsor.id}
        className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
          !isLast ? "border-b border-border/40" : ""
        }`}
        style={{ "--row-index": globalIndex } as React.CSSProperties}
      >
        {/* Position / Sort order */}
        <div className="w-8 shrink-0 text-center">
          <span className="text-xs font-medium text-muted-foreground">#{sponsor.sortOrder}</span>
        </div>

        {/* Logo */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg"
          style={{
            background: sponsor.logoUrl ? "transparent" : "hsl(var(--muted))",
          }}
        >
          {sponsor.logoUrl ? (
            <img src={sponsor.logoUrl} alt={sponsor.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-sm font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>
              {initials}
            </span>
          )}
        </div>

        {/* Name + hover text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{sponsor.name}</span>
            {sponsor.team && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {sponsor.team.shortName}
              </Badge>
            )}
          </div>
          {sponsor.hoverText && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sponsor.hoverText}</p>
          )}
        </div>

        {/* Website */}
        <div className="w-40 shrink-0 hidden lg:block">
          {sponsor.websiteUrl ? (
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{sponsor.websiteUrl.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">–</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(sponsor)}
            className="text-xs h-8 px-2 md:px-3"
          >
            <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
            <span className="hidden md:inline">{t("sponsorsPage.actions.edit")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDelete({ id: sponsor.id, name: sponsor.name })}
            className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
            <span className="hidden md:inline">{t("sponsorsPage.actions.delete")}</span>
          </Button>
        </div>
      </div>
    )
  }

  const hasInactive = grouped.inactive.length > 0
  const hasActive = grouped.active.length > 0
  const showGroupHeaders = hasActive && hasInactive

  return (
    <>
      <DataPageLayout
        title={t("sponsorsPage.title")}
        description={t("sponsorsPage.description")}
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("sponsorsPage.actions.new")}
          </Button>
        }
        filters={
          isLoading ? (
            <FilterPillsSkeleton />
          ) : (
            <TeamFilterPills
              teams={teamsWithSponsors}
              activeFilter={teamFilter}
              onFilterChange={setTeamFilter}
              showAll
              customFilters={
                siteWideCount > 0
                  ? [{ id: FILTER_SITEWIDE, label: t("sponsorsPage.filters.siteWide"), count: siteWideCount }]
                  : []
              }
              translationPrefix="sponsorsPage.filters"
              seasonId={null}
            />
          )
        }
        search={{ value: search, onChange: setSearch, placeholder: t("sponsorsPage.searchPlaceholder") }}
        count={
          isLoading ? (
            <CountSkeleton />
          ) : (sponsors?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {teamFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {stats.total}
                </span>{" "}
                {t("sponsorsPage.count.total")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.active}</span> {t("sponsorsPage.count.active")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : filtered.length === 0 && !search && teamFilter === FILTER_ALL ? (
          <EmptyState
            icon={<Handshake className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("sponsorsPage.empty.title")}
            description={t("sponsorsPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("sponsorsPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("sponsorsPage.filters.fallback")} />
        ) : showGroupHeaders ? (
          // Grouped view: Active + Inactive sections
          <div>
            {/* Active group */}
            {hasActive && (
              <div className="data-section" style={{ "--section-index": 0 } as React.CSSProperties}>
                <div className="flex items-center gap-3 mb-3 pl-3 border-l-3 border-l-primary/40">
                  <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                    {t("sponsorsPage.groups.active")}
                  </h3>
                  <div className="flex-1" />
                  <Badge variant="secondary" className="text-xs">
                    {grouped.active.length}
                  </Badge>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
                  {grouped.active.map((sponsor, i) =>
                    renderSponsorRow(sponsor, i, i === grouped.active.length - 1),
                  )}
                </div>
              </div>
            )}

            {/* Inactive group */}
            {hasInactive && (
              <div
                className={`data-section ${hasActive ? "mt-10" : ""}`}
                style={{ "--section-index": 1 } as React.CSSProperties}
              >
                <div className="flex items-center gap-3 mb-3 pl-3 border-l-3 border-l-muted-foreground/30">
                  <h3 className="text-base font-bold tracking-wide uppercase text-muted-foreground">
                    {t("sponsorsPage.groups.inactive")}
                  </h3>
                  <div className="flex-1" />
                  <Badge variant="secondary" className="text-xs">
                    {grouped.inactive.length}
                  </Badge>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
                  {grouped.inactive.map((sponsor, i) =>
                    renderSponsorRow(sponsor, grouped.active.length + i, i === grouped.inactive.length - 1),
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Flat list (only one status present, or specific filter)
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((sponsor, i) => renderSponsorRow(sponsor, i, i === filtered.length - 1))}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingSponsor ? t("sponsorsPage.dialogs.editTitle") : t("sponsorsPage.dialogs.newTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingSponsor ? t("sponsorsPage.dialogs.editDescription") : t("sponsorsPage.dialogs.newDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
            {/* Logo */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">{t("sponsorsPage.fields.logo")}</Label>
              <ImageUpload
                value={form.logoUrl || null}
                onChange={(url) => setField("logoUrl", url || "")}
                type="logo"
                label={t("sponsorsPage.fields.uploadLogo")}
              />
            </div>

            {/* Name */}
            <FormField label={t("sponsorsPage.fields.name")} error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={t("sponsorsPage.fields.namePlaceholder")}
              />
            </FormField>

            {/* Website URL */}
            <FormField label={t("sponsorsPage.fields.websiteUrl")} error={errors.websiteUrl}>
              <Input
                value={form.websiteUrl}
                onChange={(e) => setField("websiteUrl", e.target.value)}
                placeholder={t("sponsorsPage.fields.websitePlaceholder")}
              />
            </FormField>

            {/* Hover Text */}
            <FormField label={t("sponsorsPage.fields.hoverText")}>
              <Input
                value={form.hoverText}
                onChange={(e) => setField("hoverText", e.target.value)}
                placeholder={t("sponsorsPage.fields.hoverTextPlaceholder")}
              />
            </FormField>

            {/* Team association */}
            <FormField label={t("sponsorsPage.fields.teamAssignment")}>
              <TeamCombobox
                teams={(teams ?? []).map((t) => ({
                  id: t.id,
                  name: t.name,
                  shortName: t.shortName,
                  city: t.city,
                  logoUrl: t.logoUrl,
                  primaryColor: t.primaryColor,
                }))}
                value={form.teamId}
                onChange={(teamId) => setField("teamId", teamId)}
                placeholder={t("sponsorsPage.fields.siteWidePlaceholder")}
              />
            </FormField>

            {/* Sort order + Active */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("sponsorsPage.fields.sortOrder")}>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setField("sortOrder", parseInt(e.target.value, 10) || 0)}
                  min={0}
                />
              </FormField>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-[hsl(var(--accent))]"
                  />
                  <span className="text-sm font-medium">{t("sponsorsPage.fields.active")}</span>
                </label>
              </div>
            </div>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? t("saving") : editingSponsor ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("sponsorsPage.deleteDialog.title")}
        description={t("sponsorsPage.deleteDialog.description", { name: deletingSponsor?.name ?? "" })}
        confirmLabel={t("sponsorsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingSponsor) deleteMutation.mutate({ id: deletingSponsor.id })
        }}
      />
    </>
  )
}
