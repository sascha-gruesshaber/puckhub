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
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { NoResults } from "~/components/noResults"
import { TeamCombobox } from "~/components/teamCombobox"
import { TeamFilterPills } from "~/components/teamFilterPills"
import { useVenuesFilters, FILTER_ALL } from "~/stores/usePageFilters"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/venues/")({
  component: VenuesPage,
})

interface VenueForm {
  name: string
  city: string
  address: string
  defaultTeamId: string
}

const emptyForm: VenueForm = {
  name: "",
  city: "",
  address: "",
  defaultTeamId: "",
}

function VenuesPage() {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()
  const { search, setSearch, teamFilter, setTeamFilter } = useVenuesFilters()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteVenueId, setDeleteVenueId] = useState<string | null>(null)
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null)
  const [form, setForm] = useState<VenueForm>(emptyForm)

  const [venues] = trpc.venue.list.useSuspenseQuery()
  const { data: teams } = trpc.team.list.useQuery()

  const teamsInUse = useMemo(() => {
    if (!venues || !teams) return []
    const assignedTeamIds = new Set(venues.filter((venue) => venue.defaultTeam).map((venue) => venue.defaultTeam?.id))
    return teams
      .filter((team) => assignedTeamIds.has(team.id))
      .map((team) => ({
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        logoUrl: team.logoUrl,
        city: team.city,
        contactName: team.contactName,
        website: team.website,
        primaryColor: team.primaryColor,
      }))
  }, [venues, teams])

  const filtered = useMemo(() => {
    if (!venues) return []

    let result = venues

    if (teamFilter !== FILTER_ALL) {
      result = result.filter((venue) => venue.defaultTeam?.id === teamFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (venue) =>
          venue.name.toLowerCase().includes(q) ||
          (venue.city ?? "").toLowerCase().includes(q) ||
          (venue.address ?? "").toLowerCase().includes(q) ||
          (venue.defaultTeam?.name ?? "").toLowerCase().includes(q) ||
          (venue.defaultTeam?.shortName ?? "").toLowerCase().includes(q),
      )
    }

    return result
  }, [venues, search, teamFilter])

  const createVenue = trpc.venue.create.useMutation({
    onSuccess: () => {
      utils.venue.list.invalidate()
      utils.team.list.invalidate()
      setDialogOpen(false)
      setForm(emptyForm)
      toast.success(t("venuesPage.toast.created"))
    },
    onError: (e) => toast.error(t("venuesPage.toast.error"), { description: e.message }),
  })

  const updateVenue = trpc.venue.update.useMutation({
    onSuccess: () => {
      utils.venue.list.invalidate()
      utils.team.list.invalidate()
      setDialogOpen(false)
      setEditingVenueId(null)
      setForm(emptyForm)
      toast.success(t("venuesPage.toast.updated"))
    },
    onError: (e) => toast.error(t("venuesPage.toast.error"), { description: e.message }),
  })

  const deleteVenue = trpc.venue.delete.useMutation({
    onSuccess: () => {
      utils.venue.list.invalidate()
      utils.team.list.invalidate()
      setDeleteVenueId(null)
      toast.success(t("venuesPage.toast.deleted"))
    },
    onError: (e) => toast.error(t("venuesPage.toast.error"), { description: e.message }),
  })

  function openCreate() {
    setEditingVenueId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(venue: NonNullable<typeof venues>[number]) {
    setEditingVenueId(venue.id)
    setForm({
      name: venue.name,
      city: venue.city ?? "",
      address: venue.address ?? "",
      defaultTeamId: venue.defaultTeam?.id ?? "",
    })
    setDialogOpen(true)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    const payload = {
      name: form.name.trim(),
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      defaultTeamId: form.defaultTeamId || null,
    }

    if (editingVenueId) {
      updateVenue.mutate({ id: editingVenueId, ...payload })
      return
    }

    createVenue.mutate(payload)
  }

  return (
    <>
      <DataPageLayout
        title={t("venuesPage.title")}
        description={t("venuesPage.description")}
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("venuesPage.actions.new")}
          </Button>
        }
        search={{ value: search, onChange: setSearch, placeholder: t("venuesPage.searchPlaceholder") }}
        filters={
          <TeamFilterPills
            teams={teamsInUse}
            activeFilter={teamFilter}
            onFilterChange={setTeamFilter}
            showAll
            translationPrefix="venuesPage.filters"
            seasonId={null}
          />
        }
        count={
          <div className="text-sm text-muted-foreground">
              {teamFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
              {venues.length} {t("venuesPage.count")}
            </div>
        }
      >
        {venues.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-8 w-8" />}
            title={t("venuesPage.empty.title")}
            description={t("venuesPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t("venuesPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("venuesPage.filters.fallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((venue, index) => (
              <div
                key={venue.id}
                className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${index < filtered.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{venue.name}</span>
                    {venue.defaultTeam && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {venue.defaultTeam.shortName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[venue.city, venue.address].filter(Boolean).join(" | ") || "-"}
                  </p>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2 md:px-3"
                    onClick={() => openEdit(venue)}
                  >
                    <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("venuesPage.actions.edit")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                    onClick={() => setDeleteVenueId(venue.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("venuesPage.actions.delete")}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClick={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingVenueId ? t("venuesPage.dialogs.editTitle") : t("venuesPage.dialogs.newTitle")}
            </DialogTitle>
            <DialogDescription>{t("venuesPage.dialogs.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-6 p-6 pt-2">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("venuesPage.form.sections.details", { defaultValue: "Venue details" })}
              </Label>
              <div className="space-y-4 mt-2">
                <FormField label={t("venuesPage.form.fields.name", { defaultValue: "Venue name" })} required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t("venuesPage.fields.name")}
                  />
                </FormField>
                <FormField label={t("venuesPage.form.fields.city", { defaultValue: "City" })}>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder={t("venuesPage.fields.city")}
                  />
                </FormField>
                <FormField label={t("venuesPage.form.fields.address", { defaultValue: "Address" })}>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder={t("venuesPage.fields.address")}
                  />
                </FormField>
              </div>
            </div>

            <hr className="border-border/60" />

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("venuesPage.form.sections.assignment", { defaultValue: "Home assignment" })}
              </Label>
              <div className="mt-2">
                <FormField label={t("venuesPage.form.fields.defaultTeam", { defaultValue: "Default home team" })}>
                  <TeamCombobox
                    teams={(teams ?? []).map((t) => ({
                      id: t.id,
                      name: t.name,
                      shortName: t.shortName,
                      city: t.city,
                      logoUrl: t.logoUrl,
                      primaryColor: t.primaryColor,
                    }))}
                    value={form.defaultTeamId}
                    onChange={(teamId) => setForm((prev) => ({ ...prev, defaultTeamId: teamId }))}
                    placeholder={t("venuesPage.fields.noDefaultTeam")}
                  />
                </FormField>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={createVenue.isPending || updateVenue.isPending}>
                {editingVenueId ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteVenueId}
        onOpenChange={(open) => !open && setDeleteVenueId(null)}
        title={t("venuesPage.dialogs.deleteTitle")}
        description={t("venuesPage.dialogs.deleteDescription")}
        confirmLabel={t("venuesPage.actions.delete")}
        variant="destructive"
        isPending={deleteVenue.isPending}
        onConfirm={() => {
          if (deleteVenueId) deleteVenue.mutate({ id: deleteVenueId })
        }}
      />
    </>
  )
}
