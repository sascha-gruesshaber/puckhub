import {
  Badge,
  Button,
  FormField,
  Input,
  Label,
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
import { ExternalLink, Handshake, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FeatureGate } from "~/components/featureGate"
import { FilterBar } from "~/components/filterBar"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { FilterDropdown } from "~/components/filterDropdown"
import { ImageUpload } from "~/components/imageUpload"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { TeamCombobox } from "~/components/teamCombobox"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/sponsors/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; team?: string; edit?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
    ...(typeof s.edit === "string" && s.edit ? { edit: s.edit } : {}),
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
  usePermissionGuard("sponsors")
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { isAtLimit, usageText } = usePlanLimits()
  const atSponsorLimit = isAtLimit("maxSponsors")
  const { search: searchParam, team, edit: editId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const teamFilter = useMemo(() => (team ? team.split(",") : []), [team])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setTeamFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, team: v.join(",") || undefined }), replace: true }),
    [navigate],
  )

  // Sheet state driven by URL
  const isNew = editId === "new"
  const sheetOpen = !!editId

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [form, setForm] = useState<SponsorForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof SponsorForm, string>>>({})

  const { season: workingSeason } = useWorkingSeason()
  const utils = trpc.useUtils()
  const { data: sponsors, isLoading } = trpc.sponsor.list.useQuery()
  const { data: teams } = trpc.team.list.useQuery()
  const { data: seasonTeams } = trpc.team.list.useQuery(
    { seasonId: workingSeason?.id },
    { enabled: !!workingSeason?.id },
  )

  // Find the sponsor being edited from the cached list
  const editingSponsor = useMemo(() => {
    if (!editId || isNew || !sponsors) return null
    return sponsors.find((s) => s.id === editId) ?? null
  }, [editId, isNew, sponsors])

  // Populate form when sheet opens or sponsor changes
  useEffect(() => {
    if (isNew) {
      setForm(emptyForm)
      setErrors({})
    } else if (editingSponsor) {
      setForm({
        name: editingSponsor.name,
        logoUrl: editingSponsor.logoUrl || "",
        websiteUrl: editingSponsor.websiteUrl || "",
        hoverText: editingSponsor.hoverText || "",
        teamId: editingSponsor.teamId || "",
        sortOrder: editingSponsor.sortOrder,
        isActive: editingSponsor.isActive,
      })
      setErrors({})
    }
  }, [isNew, editingSponsor])

  // Build team filter options from season teams that have sponsors assigned
  const teamOptions: FilterDropdownOption[] = useMemo(() => {
    if (!sponsors || !seasonTeams) return []
    const seasonTeamIds = new Set(seasonTeams.map((t) => t.id))
    const assignedTeamIds = new Set(
      sponsors.filter((s) => s.teamId && seasonTeamIds.has(s.teamId)).map((s) => s.teamId),
    )
    const opts: FilterDropdownOption[] = seasonTeams
      .filter((t) => assignedTeamIds.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((t) => ({
        value: t.shortName,
        label: t.shortName,
        icon: t.logoUrl ? <img src={t.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain" /> : undefined,
      }))
    const siteWideCount = sponsors.filter((s) => !s.teamId).length
    if (siteWideCount > 0) {
      opts.push({ value: FILTER_SITEWIDE, label: t("sponsorsPage.filters.siteWide") })
    }
    return opts
  }, [sponsors, seasonTeams, t])

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, edit: undefined }), replace: true })
  }

  const createMutation = trpc.sponsor.create.useMutation({
    onSuccess: () => {
      utils.sponsor.list.invalidate()
      closeSheet()
      toast.success(t("sponsorsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("sponsorsPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const updateMutation = trpc.sponsor.update.useMutation({
    onSuccess: () => {
      utils.sponsor.list.invalidate()
      closeSheet()
      toast.success(t("sponsorsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("sponsorsPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const deleteMutation = trpc.sponsor.delete.useMutation({
    onSuccess: () => {
      utils.sponsor.list.invalidate()
      setDeleteDialogOpen(false)
      closeSheet()
      toast.success(t("sponsorsPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("sponsorsPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const filtered = useMemo(() => {
    if (!sponsors) return []

    let result = sponsors

    // Team filter
    if (teamFilter.length > 0) {
      result = result.filter((s) => {
        if (teamFilter.includes(FILTER_SITEWIDE) && !s.teamId) return true
        return s.team ? teamFilter.includes(s.team.shortName) : false
      })
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

  function setField<K extends keyof SponsorForm>(key: K, value: SponsorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openSheet(id: string) {
    navigate({ search: (prev) => ({ ...prev, edit: id }) })
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

  const isDirty = isNew
    ? form.name !== "" || form.logoUrl !== "" || form.websiteUrl !== "" || form.hoverText !== "" || form.teamId !== ""
    : editingSponsor
      ? form.name !== editingSponsor.name ||
        form.logoUrl !== (editingSponsor.logoUrl || "") ||
        form.websiteUrl !== (editingSponsor.websiteUrl || "") ||
        form.hoverText !== (editingSponsor.hoverText || "") ||
        form.teamId !== (editingSponsor.teamId || "") ||
        form.sortOrder !== editingSponsor.sortOrder ||
        form.isActive !== editingSponsor.isActive
      : false

  const isSaving = createMutation.isPending || updateMutation.isPending

  function renderSponsorRow(sponsor: NonNullable<typeof sponsors>[number], globalIndex: number, isLast: boolean) {
    const initials = sponsor.name.substring(0, 2).toUpperCase()

    return (
      <button
        key={sponsor.id}
        type="button"
        onClick={() => openSheet(sponsor.id)}
        className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors cursor-pointer w-full text-left ${
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
          {sponsor.hoverText && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sponsor.hoverText}</p>}
        </div>
        {/* Website */}
        <div className="w-40 shrink-0 hidden lg:block">
          {sponsor.websiteUrl ? (
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{sponsor.websiteUrl.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">–</span>
          )}
        </div>
      </button>
    )
  }

  const hasInactive = grouped.inactive.length > 0
  const hasActive = grouped.active.length > 0
  const showGroupHeaders = hasActive && hasInactive

  return (
    <FeatureGate feature="featureSponsorMgmt">
      <DataPageLayout
        title={t("sponsorsPage.title")}
        description={t("sponsorsPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageText("maxSponsors")}</Badge>
            <Button
              variant="accent"
              onClick={() => openSheet("new")}
              disabled={atSponsorLimit}
              title={atSponsorLimit ? t("plan.limitReached", { defaultValue: "Plan limit reached" }) : undefined}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("sponsorsPage.actions.new")}
            </Button>
          </div>
        }
        filters={
          <FilterBar
            label={t("filters")}
            search={{ value: search, onChange: setSearch, placeholder: t("sponsorsPage.searchPlaceholder") }}
          >
            {isLoading ? (
              <FilterPillsSkeleton count={1} />
            ) : teamOptions.length > 0 ? (
              <FilterDropdown
                label={t("sponsorsPage.filters.allTeams")}
                options={teamOptions}
                value={teamFilter}
                onChange={setTeamFilter}
              />
            ) : null}
          </FilterBar>
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : filtered.length === 0 && !search && teamFilter.length === 0 ? (
          <EmptyState
            icon={<Handshake className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("sponsorsPage.empty.title")}
            description={t("sponsorsPage.empty.description")}
            action={
              <Button variant="accent" onClick={() => openSheet("new")} disabled={atSponsorLimit}>
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
                  {grouped.active.map((sponsor, i) => renderSponsorRow(sponsor, i, i === grouped.active.length - 1))}
                </div>
              </div>
            )}
            {/* Inactive group */}
            {hasInactive && (
              <div
                className={`data-section ${hasActive ? `mt-10` : ``}`}
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

      {/* Create/Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        dirty={isDirty}
        onDirtyClose={() => setConfirmCloseOpen(true)}
      >
        <SheetContent>
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{isNew ? t("sponsorsPage.dialogs.newTitle") : t("sponsorsPage.dialogs.editTitle")}</SheetTitle>
            <SheetDescription>
              {isNew ? t("sponsorsPage.dialogs.newDescription") : t("sponsorsPage.dialogs.editDescription")}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
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
            </SheetBody>

            <SheetFooter>
              {/* Delete button — left side, only in edit mode */}
              {editingSponsor && (
                <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {t("sponsorsPage.actions.delete")}
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
              <Button type="submit" variant="accent" disabled={isSaving}>
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
        title={t("sponsorsPage.deleteDialog.title")}
        description={t("sponsorsPage.deleteDialog.description", { name: editingSponsor?.name ?? "" })}
        confirmLabel={t("sponsorsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (editingSponsor) deleteMutation.mutate({ id: editingSponsor.id })
        }}
      />
    </FeatureGate>
  )
}
