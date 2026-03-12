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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { History, Pencil, Plus, Shield, Shirt, Trash2, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { RemoveDialog } from "~/components/removeDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { FilterBar } from "~/components/filterBar"
import { EmptyState } from "~/components/emptyState"
import { FilterDropdown } from "~/components/filterDropdown"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { ImageUpload } from "~/components/imageUpload"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { TrikotPreview } from "~/components/trikotPreview"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/teams/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; division?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.division === "string" && s.division ? { division: s.division } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.team.list.ensureData()
  },
  component: TeamsPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TeamForm {
  name: string
  shortName: string
  city: string
  homeVenue: string
  logoUrl: string
  teamPhotoUrl: string
  contactName: string
  contactEmail: string
  contactPhone: string
  website: string
}

const emptyForm: TeamForm = {
  name: "",
  shortName: "",
  city: "",
  homeVenue: "",
  logoUrl: "",
  teamPhotoUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function TeamsPage() {
  usePermissionGuard("teams")
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { isAtLimit, usageText } = usePlanLimits()
  const atTeamLimit = isAtLimit("maxTeams")
  const { search: searchParam, division } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const divisionFilter = useMemo(() => (division ? division.split(",") : []), [division])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setDivisionFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, division: v.join(",") || undefined }), replace: true }),
    [navigate],
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ id: string } | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<{ id: string; name: string; isInSeason: boolean } | null>(null)
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TeamForm, string>>>({})

  // Trikot assignment state
  const [trikotDialogOpen, setTrikotDialogOpen] = useState(false)
  const [trikotTeamId, setTrikotTeamId] = useState<string | null>(null)
  const [assignTrikotId, setAssignTrikotId] = useState("")
  const [assignTrikotName, setAssignTrikotName] = useState("")
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; name: string } | null>(null)

  const FILTER_UNASSIGNED = "__unassigned__"

  const utils = trpc.useUtils()
  const { data: allTeams, isLoading } = trpc.team.list.useQuery()
  const { data: allTrikots } = trpc.trikot.list.useQuery()
  const { data: teamAssignments } = trpc.teamTrikot.listByTeam.useQuery(
    { teamId: trikotTeamId! },
    { enabled: !!trikotTeamId },
  )

  // Division filter data from working season
  const { season } = useWorkingSeason()
  const { data: structure } = trpc.season.getFullStructure.useQuery({ id: season?.id ?? "" }, { enabled: !!season?.id })

  // Extract divisions and team-to-division mapping (a team can be in multiple divisions)
  const { divisions, teamDivisionMap, seasonTeamIds } = useMemo(() => {
    if (!structure?.divisions)
      return { divisions: [], teamDivisionMap: new Map<string, Set<string>>(), seasonTeamIds: new Set<string>() }
    const divs = structure.divisions.map((d) => ({ id: d.id, name: d.name }))
    const map = new Map<string, Set<string>>()
    if (structure.teamAssignments) {
      for (const ta of structure.teamAssignments) {
        const existing = map.get(ta.team.id)
        if (existing) {
          existing.add(ta.divisionId)
        } else {
          map.set(ta.team.id, new Set([ta.divisionId]))
        }
      }
    }
    return { divisions: divs, teamDivisionMap: map, seasonTeamIds: new Set(map.keys()) }
  }, [structure])

  const unassignedCount = useMemo(() => {
    if (!allTeams) return 0
    return allTeams.filter((t) => !seasonTeamIds.has(t.id)).length
  }, [allTeams, seasonTeamIds])

  const createMutation = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      closeDialog()
      toast.success(t("teamsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const updateMutation = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      closeDialog()
      toast.success(t("teamsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const removeFromSeasonMutation = trpc.team.removeFromSeason.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      utils.season.getFullStructure.invalidate()
      setDeleteDialogOpen(false)
      setDeletingTeam(null)
      toast.success(t("teamsPage.toast.removedFromSeason"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.removeFromSeasonError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const deleteMutation = trpc.team.delete.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingTeam(null)
      toast.success(t("teamsPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const assignTrikotMutation = trpc.teamTrikot.assign.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTeam.invalidate({ teamId: trikotTeamId! })
      setAssignTrikotId("")
      setAssignTrikotName("")
      toast.success(t("teamsPage.trikots.toast.assigned"))
    },
    onError: (err) => toast.error(t("teamsPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const updateAssignmentMutation = trpc.teamTrikot.update.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTeam.invalidate({ teamId: trikotTeamId! })
      setEditingAssignment(null)
      toast.success(t("teamsPage.trikots.toast.assignmentUpdated"))
    },
    onError: (err) => toast.error(t("teamsPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const removeAssignmentMutation = trpc.teamTrikot.remove.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTeam.invalidate({ teamId: trikotTeamId! })
      toast.success(t("teamsPage.trikots.toast.assignmentRemoved"))
    },
    onError: (err) => toast.error(t("teamsPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  function openTrikotDialog(teamId: string) {
    setTrikotTeamId(teamId)
    setAssignTrikotId("")
    setAssignTrikotName("")
    setEditingAssignment(null)
    setTrikotDialogOpen(true)
  }

  function handleAssignTrikot(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTrikotId || !assignTrikotName.trim() || !trikotTeamId) return
    assignTrikotMutation.mutate({
      teamId: trikotTeamId,
      trikotId: assignTrikotId,
      name: assignTrikotName.trim(),
    })
  }

  function handleUpdateAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAssignment || !editingAssignment.name.trim()) return
    updateAssignmentMutation.mutate({
      id: editingAssignment.id,
      name: editingAssignment.name.trim(),
    })
  }

  const divisionOptions: FilterDropdownOption[] = useMemo(() => {
    const opts: FilterDropdownOption[] = divisions.map((d) => ({ value: d.id, label: d.name }))
    if (unassignedCount > 0) {
      opts.push({ value: FILTER_UNASSIGNED, label: t("teamsPage.filters.unassigned") })
    }
    return opts
  }, [divisions, unassignedCount, t])

  const filtered = useMemo(() => {
    if (!allTeams) return []

    let result = allTeams

    // Division / season filter
    if (divisionFilter.length > 0) {
      result = result.filter((t) => {
        if (divisionFilter.includes(FILTER_UNASSIGNED) && !seasonTeamIds.has(t.id)) return true
        const teamDivs = teamDivisionMap.get(t.id)
        return teamDivs ? divisionFilter.some((dId) => teamDivs.has(dId)) : false
      })
    } else {
      // "All active" — only teams in the current season
      result = result.filter((t) => seasonTeamIds.has(t.id))
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortName.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q),
      )
    }

    return result
  }, [allTeams, search, divisionFilter, teamDivisionMap, seasonTeamIds])

  function setField<K extends keyof TeamForm>(key: K, value: TeamForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openCreate() {
    setEditingTeam(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(team: NonNullable<typeof allTeams>[number]) {
    setEditingTeam({ id: team.id })
    setForm({
      name: team.name,
      shortName: team.shortName,
      city: team.city || "",
      homeVenue: team.homeVenue || "",
      logoUrl: team.logoUrl || "",
      teamPhotoUrl: team.teamPhotoUrl || "",
      contactName: team.contactName || "",
      contactEmail: team.contactEmail || "",
      contactPhone: team.contactPhone || "",
      website: team.website || "",
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(team: { id: string; name: string }) {
    setDeletingTeam({ ...team, isInSeason: seasonTeamIds.has(team.id) })
    setDeleteDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingTeam(null)
    setForm(emptyForm)
    setErrors({})
  }

  function validate(): boolean {
    const next: Partial<Record<keyof TeamForm, string>> = {}
    if (!form.name.trim()) next.name = t("teamsPage.validation.nameRequired")
    if (!form.shortName.trim()) next.shortName = t("teamsPage.validation.shortNameRequired")
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      next.contactEmail = t("teamsPage.validation.emailInvalid")
    }
    if (form.website && !/^https?:\/\/.+/.test(form.website)) {
      next.website = t("teamsPage.validation.websiteInvalid")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (editingTeam) {
      updateMutation.mutate({
        id: editingTeam.id,
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        city: form.city.trim() || null,
        homeVenue: form.homeVenue.trim() || null,
        logoUrl: form.logoUrl || null,
        teamPhotoUrl: form.teamPhotoUrl || null,
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        website: form.website.trim() || null,
      })
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        city: form.city.trim() || undefined,
        homeVenue: form.homeVenue.trim() || undefined,
        logoUrl: form.logoUrl || undefined,
        teamPhotoUrl: form.teamPhotoUrl || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        website: form.website.trim() || undefined,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataPageLayout
        title={t("teamsPage.title")}
        description={t("teamsPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageText("maxTeams")}</Badge>
            <Button variant="accent" onClick={openCreate} disabled={atTeamLimit} title={atTeamLimit ? t("plan.limitReached", { defaultValue: "Plan limit reached" }) : undefined}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("teamsPage.actions.new")}
            </Button>
          </div>
        }
        filters={
          <FilterBar
            label={t("statsPage.filters.label")}
            search={{ value: search, onChange: setSearch, placeholder: t("teamsPage.searchPlaceholder") }}
          >
            {isLoading ? (
              <FilterPillsSkeleton count={1} />
            ) : divisionOptions.length > 0 ? (
              <FilterDropdown
                label={t("teamsPage.filters.all")}
                options={divisionOptions}
                value={divisionFilter}
                onChange={setDivisionFilter}
              />
            ) : null}
          </FilterBar>
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : (allTeams?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.title")}
            description={t("teamsPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate} disabled={atTeamLimit}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("teamsPage.empty.action")}
              </Button>
            }
          />
        ) : !season ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.noSeasonTitle")}
            description={t("teamsPage.empty.noSeasonDescription")}
          />
        ) : filtered.length === 0 && !search && divisionFilter.length === 0 && seasonTeamIds.size === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.noAssignmentsTitle")}
            description={t("teamsPage.empty.noAssignmentsDescription")}
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("teamsPage.filters.fallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((team, i) => {
              const initials = team.shortName.substring(0, 2).toUpperCase()
              const firstTrikot = team.teamTrikots[0]?.trikot ?? null

              return (
                <div
                  key={team.id}
                  className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                    i < filtered.length - 1 ? "border-b border-border/40" : ""
                  }`}
                  style={{ "--row-index": i } as React.CSSProperties}
                >
                  {/* Logo + Info with hover card */}
                  <TeamHoverCard
                    teamId={team.id}
                    name={team.name}
                    shortName={team.shortName}
                    logoUrl={team.logoUrl}
                    seasonId={season?.id}
                    onEdit={() => openEdit(team)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                        style={{
                          background: team.logoUrl
                            ? "transparent"
                            : firstTrikot
                              ? `${firstTrikot.primaryColor}18`
                              : "hsl(var(--muted))",
                        }}
                      >
                        {team.logoUrl ? (
                          <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain" />
                        ) : (
                          <span
                            className="text-sm font-bold"
                            style={{ color: firstTrikot?.primaryColor ?? "hsl(var(--muted-foreground))" }}
                          >
                            {initials}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{team.name}</span>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {team.shortName}
                          </Badge>
                        </div>
                        {team.city && <p className="text-xs text-muted-foreground mt-0.5">{team.city}</p>}
                      </div>
                    </div>
                  </TeamHoverCard>

                  {/* Flex spacer */}
                  <div className="flex-1 min-w-0" />

                  {/* Contact name */}
                  <div className="w-36 shrink-0 hidden lg:block">
                    {team.contactName ? (
                      <span className="text-sm text-muted-foreground truncate block">{team.contactName}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to="/teams/$teamId/history" params={{ teamId: team.id }}>
                      <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                        <History className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                        <span className="hidden md:inline">{t("teamsPage.actions.history")}</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTrikotDialog(team.id)}
                      className="text-xs h-8 px-2 md:px-3"
                    >
                      <Shirt className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                      <span className="hidden md:inline">{t("teamsPage.actions.trikots")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(team)}
                      className="text-xs h-8 px-2 md:px-3"
                    >
                      <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                      <span className="hidden md:inline">{t("teamsPage.actions.edit")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDelete({ id: team.id, name: team.name })}
                      className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                      <span className="hidden md:inline">{t("teamsPage.actions.delete")}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? t("teamsPage.dialogs.editTitle") : t("teamsPage.dialogs.newTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingTeam ? t("teamsPage.dialogs.editDescription") : t("teamsPage.dialogs.newDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
            {/* Images */}
            <div className="flex gap-6 items-start">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">{t("teamsPage.fields.logo")}</Label>
                <ImageUpload
                  value={form.logoUrl || null}
                  onChange={(url) => setField("logoUrl", url || "")}
                  type="logo"
                  label={t("teamsPage.fields.uploadLogo")}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-2 block">{t("teamsPage.fields.teamPhoto")}</Label>
                <ImageUpload
                  value={form.teamPhotoUrl || null}
                  onChange={(url) => setField("teamPhotoUrl", url || "")}
                  type="photo"
                  label={t("teamsPage.fields.uploadPhoto")}
                />
              </div>
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("teamsPage.fields.name")} error={errors.name} required>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder={t("teamsPage.fields.namePlaceholder")}
                />
              </FormField>
              <FormField label={t("teamsPage.fields.shortName")} error={errors.shortName} required>
                <Input
                  value={form.shortName}
                  onChange={(e) => setField("shortName", e.target.value)}
                  placeholder={t("teamsPage.fields.shortNamePlaceholder")}
                />
              </FormField>
            </div>

            {/* City + Home Venue */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("teamsPage.fields.city")}>
                <Input
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder={t("teamsPage.fields.cityPlaceholder")}
                />
              </FormField>
              <FormField label={t("teamsPage.fields.homeVenue", { defaultValue: "Heimspielstätte" })}>
                <Input
                  value={form.homeVenue}
                  onChange={(e) => setField("homeVenue", e.target.value)}
                  placeholder={t("teamsPage.fields.homeVenuePlaceholder", { defaultValue: "z.B. Eisstadion Musterstadt" })}
                />
              </FormField>
            </div>

            {/* Contact section */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3 text-muted-foreground">{t("teamsPage.fields.contactSection")}</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("teamsPage.fields.contactName")}>
                  <Input
                    value={form.contactName}
                    onChange={(e) => setField("contactName", e.target.value)}
                    placeholder={t("teamsPage.fields.contactNamePlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.contactEmail")} error={errors.contactEmail}>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setField("contactEmail", e.target.value)}
                    placeholder={t("teamsPage.fields.contactEmailPlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.contactPhone")}>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) => setField("contactPhone", e.target.value)}
                    placeholder={t("teamsPage.fields.contactPhonePlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.website")} error={errors.website}>
                  <Input
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                    placeholder={t("teamsPage.fields.websitePlaceholder")}
                  />
                </FormField>
              </div>
            </div>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? t("teamsPage.actions.saving") : editingTeam ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove / Deactivate / Delete Dialog */}
      {deletingTeam && (
        <RemoveDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t("teamsPage.removeDialog.title", { name: deletingTeam.name })}
          subtitle={t("teamsPage.removeDialog.subtitle")}
          deactivate={{
            title: t("teamsPage.removeDialog.deactivate.title"),
            description: t("teamsPage.removeDialog.deactivate.description"),
            preserved: [
              t("teamsPage.removeDialog.deactivate.preserved.data"),
              t("teamsPage.removeDialog.deactivate.preserved.reassign"),
              t("teamsPage.removeDialog.deactivate.preserved.contracts"),
            ],
            buttonLabel: t("teamsPage.removeDialog.deactivate.button"),
            available: deletingTeam.isInSeason,
            unavailableReason: t("teamsPage.removeDialog.deactivate.unavailable"),
          }}
          onDeactivate={() => {
            if (season) {
              removeFromSeasonMutation.mutate({ teamId: deletingTeam.id, seasonId: season.id })
            }
          }}
          isDeactivating={removeFromSeasonMutation.isPending}
          permanentDelete={{
            title: t("teamsPage.removeDialog.delete.title"),
            description: t("teamsPage.removeDialog.delete.description"),
            consequences: [
              t("teamsPage.removeDialog.delete.consequences.contracts"),
              t("teamsPage.removeDialog.delete.consequences.standings"),
              t("teamsPage.removeDialog.delete.consequences.stats"),
              t("teamsPage.removeDialog.delete.consequences.trikots"),
            ],
            buttonLabel: t("teamsPage.removeDialog.delete.button"),
            confirmTitle: t("teamsPage.removeDialog.delete.confirmTitle", { name: deletingTeam.name }),
            confirmWarning: t("teamsPage.removeDialog.delete.confirmWarning"),
            confirmButton: t("teamsPage.removeDialog.delete.confirmButton"),
          }}
          onDelete={() => deleteMutation.mutate({ id: deletingTeam.id })}
          isDeleting={deleteMutation.isPending}
          labels={{
            recommended: t("teamsPage.removeDialog.recommended"),
            or: t("teamsPage.removeDialog.or"),
            back: t("teamsPage.removeDialog.back"),
            cancel: t("cancel"),
          }}
        />
      )}

      {/* Team Trikot Assignments Dialog */}
      <Dialog open={trikotDialogOpen} onOpenChange={setTrikotDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setTrikotDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {t("teamsPage.trikots.title", { team: allTeams?.find((team) => team.id === trikotTeamId)?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("teamsPage.trikots.description")}</DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-4">
            {teamAssignments && teamAssignments.length > 0 ? (
              <div className="space-y-2">
                {teamAssignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {editingAssignment?.id === a.id ? (
                      <form onSubmit={handleUpdateAssignment} className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingAssignment.name}
                          onChange={(e) => setEditingAssignment({ ...editingAssignment, name: e.target.value })}
                          className="flex-1 h-8 text-sm"
                        />
                        <Button type="submit" size="sm" variant="accent" disabled={updateAssignmentMutation.isPending}>
                          {t("teamsPage.trikots.actions.saveAssignment")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingAssignment(null)}
                          title={t("teamsPage.trikots.actions.cancelEdit")}
                          aria-label={t("teamsPage.trikots.actions.cancelEdit")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <TrikotPreview
                          svg={a.trikot.template.svg}
                          primaryColor={a.trikot.primaryColor}
                          secondaryColor={a.trikot.secondaryColor}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.trikot.name}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingAssignment({ id: a.id, name: a.name })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          disabled={removeAssignmentMutation.isPending}
                          onClick={() => removeAssignmentMutation.mutate({ id: a.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("teamsPage.trikots.empty")}</p>
            )}

            {/* Add assignment */}
            <form onSubmit={handleAssignTrikot} className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">{t("teamsPage.trikots.newAssignment")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {t("teamsPage.trikots.fields.trikot")}
                  </Label>
                  <select
                    value={assignTrikotId}
                    onChange={(e) => setAssignTrikotId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t("teamsPage.trikots.fields.trikotPlaceholder")}</option>
                    {allTrikots?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {t("teamsPage.trikots.fields.assignmentName")}
                  </Label>
                  <Input
                    value={assignTrikotName}
                    onChange={(e) => setAssignTrikotName(e.target.value)}
                    placeholder={t("teamsPage.trikots.fields.assignmentNamePlaceholder")}
                    className="h-10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                variant="accent"
                disabled={!assignTrikotId || !assignTrikotName.trim() || assignTrikotMutation.isPending}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("teamsPage.trikots.actions.assign")}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
