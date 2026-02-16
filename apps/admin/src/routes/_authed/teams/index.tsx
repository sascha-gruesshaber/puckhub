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
import { createFileRoute } from "@tanstack/react-router"
import { Calendar, Pencil, Plus, Shield, Shirt, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { ImageUpload } from "~/components/imageUpload"
import { NoResults } from "~/components/noResults"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTeamsFilters, FILTER_ALL } from "~/stores/usePageFilters"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/teams/")({
  component: TeamsPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TeamForm {
  name: string
  shortName: string
  city: string
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
  const { t } = useTranslation("common")
  const { search, setSearch, divisionFilter, setDivisionFilter } = useTeamsFilters()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ id: string } | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TeamForm, string>>>({})

  // Trikot assignment state
  const [trikotDialogOpen, setTrikotDialogOpen] = useState(false)
  const [trikotTeamId, setTrikotTeamId] = useState<string | null>(null)
  const [assignTrikotId, setAssignTrikotId] = useState("")
  const [assignTrikotName, setAssignTrikotName] = useState("")
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; name: string } | null>(null)

  const utils = trpc.useUtils()
  const [teams] = trpc.team.list.useSuspenseQuery()
  const { data: allTrikots } = trpc.trikot.list.useQuery()
  const { data: teamAssignments } = trpc.teamTrikot.listByTeam.useQuery(
    { teamId: trikotTeamId! },
    { enabled: !!trikotTeamId },
  )

  // Division filter data from working season
  const { season } = useWorkingSeason()
  const { data: structure } = trpc.season.getFullStructure.useQuery({ id: season?.id ?? "" }, { enabled: !!season?.id })

  // Query games to determine which teams have upcoming games
  const { data: games } = trpc.game.listForSeason.useQuery({ seasonId: season?.id ?? "" }, { enabled: !!season?.id })

  // Extract divisions and team-to-division mapping
  const { divisions, teamDivisionMap } = useMemo(() => {
    if (!structure?.divisions) return { divisions: [], teamDivisionMap: new Map<string, string>() }
    const divs = structure.divisions.map((d) => ({ id: d.id, name: d.name }))
    const map = new Map<string, string>()
    if (structure.teamAssignments) {
      for (const ta of structure.teamAssignments) {
        map.set(ta.team.id, ta.divisionId)
      }
    }
    return { divisions: divs, teamDivisionMap: map }
  }, [structure])

  // Determine which teams have upcoming games (scheduled or in_progress)
  const teamsWithUpcomingGames = useMemo(() => {
    if (!games) return new Set<string>()
    return new Set(
      games
        .filter((g) => g.status === "scheduled" || g.status === "in_progress")
        .flatMap((g) => [g.homeTeamId, g.awayTeamId]),
    )
  }, [games])

  const createMutation = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      closeDialog()
      toast.success(t("teamsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.createError"), { description: err.message })
    },
  })

  const updateMutation = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      closeDialog()
      toast.success(t("teamsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.saveError"), { description: err.message })
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
      toast.error(t("teamsPage.toast.deleteError"), { description: err.message })
    },
  })

  const assignTrikotMutation = trpc.teamTrikot.assign.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTeam.invalidate({ teamId: trikotTeamId! })
      setAssignTrikotId("")
      setAssignTrikotName("")
      toast.success(t("teamsPage.trikots.toast.assigned"))
    },
    onError: (err) => toast.error(t("teamsPage.toast.error"), { description: err.message }),
  })

  const updateAssignmentMutation = trpc.teamTrikot.update.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTeam.invalidate({ teamId: trikotTeamId! })
      setEditingAssignment(null)
      toast.success(t("teamsPage.trikots.toast.assignmentUpdated"))
    },
    onError: (err) => toast.error(t("teamsPage.toast.error"), { description: err.message }),
  })

  const removeAssignmentMutation = trpc.teamTrikot.remove.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTeam.invalidate({ teamId: trikotTeamId! })
      toast.success(t("teamsPage.trikots.toast.assignmentRemoved"))
    },
    onError: (err) => toast.error(t("teamsPage.toast.error"), { description: err.message }),
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

  const filtered = useMemo(() => {
    if (!teams) return []

    let result = teams

    // Division filter
    if (divisionFilter !== FILTER_ALL) {
      result = result.filter((t) => teamDivisionMap.get(t.id) === divisionFilter)
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
  }, [teams, search, divisionFilter, teamDivisionMap])

  const stats = useMemo(() => {
    if (!teams) return { total: 0, cities: 0, withLogos: 0 }
    const cities = new Set(teams.map((t) => t.city).filter(Boolean))
    return {
      total: teams.length,
      cities: cities.size,
      withLogos: teams.filter((t) => t.logoUrl).length,
    }
  }, [teams])

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

  function openEdit(team: NonNullable<typeof teams>[number]) {
    setEditingTeam({ id: team.id })
    setForm({
      name: team.name,
      shortName: team.shortName,
      city: team.city || "",
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
    setDeletingTeam(team)
    setDeleteDialogOpen(true)
  }

  function handleTeamCalendarCopy(teamId: string) {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"
    const params = new URLSearchParams()
    params.set("seasonId", season?.id ?? "")
    params.set("teamId", teamId)
    const url = `${apiUrl}/api/calendar/export.ics?${params.toString()}`

    navigator.clipboard.writeText(url)
    toast.success(t("teamsPage.calendarUrlCopied"))
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
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("teamsPage.actions.new")}
          </Button>
        }
        filters={
          divisions.length > 0 ? (
            <>
              <FilterPill
                label={t("teamsPage.filters.all")}
                active={divisionFilter === FILTER_ALL}
                onClick={() => setDivisionFilter(FILTER_ALL)}
              />
              {divisions.map((d) => (
                <FilterPill
                  key={d.id}
                  label={d.name}
                  active={divisionFilter === d.id}
                  onClick={() => setDivisionFilter(d.id)}
                />
              ))}
            </>
          ) : undefined
        }
        search={{ value: search, onChange: setSearch, placeholder: t("teamsPage.searchPlaceholder") }}
        count={
          teams.length > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {divisionFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {stats.total}
                </span>{" "}
                {t("teamsPage.count.teams")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.cities}</span> {t("teamsPage.count.cities")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {filtered.length === 0 && !search && divisionFilter === FILTER_ALL ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.title")}
            description={t("teamsPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("teamsPage.empty.action")}
              </Button>
            }
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
                    team={{
                      ...team,
                      primaryColor: firstTrikot?.primaryColor ?? null,
                    }}
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
                    {teamsWithUpcomingGames.has(team.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTeamCalendarCopy(team.id)}
                        title={t("teamsPage.actions.copyCalendarUrl")}
                        className="h-8 w-8"
                      >
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
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

            {/* City */}
            <FormField label={t("teamsPage.fields.city")}>
              <Input
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder={t("teamsPage.fields.cityPlaceholder")}
              />
            </FormField>

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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("teamsPage.deleteDialog.title")}
        description={t("teamsPage.deleteDialog.description", { name: deletingTeam?.name ?? "" })}
        confirmLabel={t("teamsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingTeam) deleteMutation.mutate({ id: deletingTeam.id })
        }}
      />

      {/* Team Trikot Assignments Dialog */}
      <Dialog open={trikotDialogOpen} onOpenChange={setTrikotDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setTrikotDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {t("teamsPage.trikots.title", { team: teams?.find((team) => team.id === trikotTeamId)?.name ?? "" })}
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
