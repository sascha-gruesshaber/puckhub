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
  Skeleton,
  toast,
} from "@puckhub/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { History, Pencil, Plus, Trash2, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { ImageUpload } from "~/components/imageUpload"
import { NoResults } from "~/components/noResults"
import { PlayerHoverCard } from "~/components/playerHoverCard"
import { FILTER_ALL, TeamFilterPills } from "~/components/teamFilterPills"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/players/")({
  component: PlayersPage,
})

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------
interface PlayerForm {
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  photoUrl: string
}

const emptyForm: PlayerForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "",
  photoUrl: "",
}

const FILTER_UNASSIGNED = "__unassigned__"

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function PlayersPage() {
  const { t } = useTranslation("common")
  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState(FILTER_ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<{ id: string } | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<PlayerForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof PlayerForm, string>>>({})

  const { season: workingSeason } = useWorkingSeason()
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.player.listWithCurrentTeam.useQuery()
  const { data: teams } = trpc.team.list.useQuery()

  const players = data?.players
  const currentSeason = data?.currentSeason

  // Build list of teams that actually have assigned players (for the filter)
  const teamsInUse = useMemo(() => {
    if (!players || !teams) return []
    const assignedTeamIds = new Set(players.filter((p) => p.currentTeam).map((p) => p.currentTeam?.id))
    return teams
      .filter((t) => assignedTeamIds.has(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        logoUrl: t.logoUrl,
        city: t.city,
        contactName: t.contactName,
        website: t.website,
        primaryColor: t.primaryColor,
      }))
  }, [players, teams])

  const createMutation = trpc.player.create.useMutation({
    onSuccess: () => {
      utils.player.listWithCurrentTeam.invalidate()
      closeDialog()
      toast.success(t("playersPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("playersPage.toast.createError"), { description: err.message })
    },
  })

  const updateMutation = trpc.player.update.useMutation({
    onSuccess: () => {
      utils.player.listWithCurrentTeam.invalidate()
      closeDialog()
      toast.success(t("playersPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("playersPage.toast.saveError"), { description: err.message })
    },
  })

  const deleteMutation = trpc.player.delete.useMutation({
    onSuccess: () => {
      utils.player.listWithCurrentTeam.invalidate()
      setDeleteDialogOpen(false)
      setDeletingPlayer(null)
      toast.success(t("playersPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("playersPage.toast.deleteError"), { description: err.message })
    },
  })

  const filtered = useMemo(() => {
    if (!players) return []

    let result = players

    // Team filter
    if (teamFilter === FILTER_UNASSIGNED) {
      result = result.filter((p) => !p.currentTeam)
    } else if (teamFilter !== FILTER_ALL) {
      result = result.filter((p) => p.currentTeam?.id === teamFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.nationality?.toLowerCase().includes(q),
      )
    }

    return result
  }, [players, search, teamFilter])

  const unassignedCount = useMemo(() => {
    if (!players) return 0
    return players.filter((p) => !p.currentTeam).length
  }, [players])

  // Group by team when "All" is active
  const grouped = useMemo(() => {
    if (teamFilter !== FILTER_ALL) return null
    if (!filtered.length) return null

    const map = new Map<
      string,
      { team: { id: string; name: string; shortName: string } | null; players: typeof filtered }
    >()

    for (const p of filtered) {
      const key = p.currentTeam?.id ?? "__none__"
      if (!map.has(key)) {
        map.set(key, {
          team: p.currentTeam
            ? { id: p.currentTeam.id, name: p.currentTeam.name, shortName: p.currentTeam.shortName }
            : null,
          players: [],
        })
      }
      map.get(key)?.players.push(p)
    }

    // Sort: teams with names first (alphabetical), then unassigned at end
    const entries = [...map.entries()].sort((a, b) => {
      if (!a[1].team && b[1].team) return 1
      if (a[1].team && !b[1].team) return -1
      if (a[1].team && b[1].team) return a[1].team.name.localeCompare(b[1].team.name)
      return 0
    })

    return entries
  }, [filtered, teamFilter])

  function setField<K extends keyof PlayerForm>(key: K, value: PlayerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openCreate() {
    setEditingPlayer(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(player: NonNullable<typeof players>[number]) {
    setEditingPlayer({ id: player.id })
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      dateOfBirth: player.dateOfBirth || "",
      nationality: player.nationality || "",
      photoUrl: player.photoUrl || "",
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(player: { id: string; firstName: string; lastName: string }) {
    setDeletingPlayer({ id: player.id, name: `${player.firstName} ${player.lastName}` })
    setDeleteDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingPlayer(null)
    setForm(emptyForm)
    setErrors({})
  }

  function validate(): boolean {
    const next: Partial<Record<keyof PlayerForm, string>> = {}
    if (!form.firstName.trim()) next.firstName = t("playersPage.validation.firstNameRequired")
    if (!form.lastName.trim()) next.lastName = t("playersPage.validation.lastNameRequired")
    if (form.dateOfBirth && Number.isNaN(Date.parse(form.dateOfBirth))) {
      next.dateOfBirth = t("playersPage.validation.dateInvalid")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (editingPlayer) {
      updateMutation.mutate({
        id: editingPlayer.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        nationality: form.nationality.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
      })
    } else {
      createMutation.mutate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        nationality: form.nationality.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  function calcAge(dateOfBirth: string | null) {
    if (!dateOfBirth) return null
    const dob = new Date(dateOfBirth)
    const today = new Date()
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    return a
  }

  function renderPlayerRow(player: NonNullable<typeof players>[number], rowIndex: number, isLast: boolean) {
    const initials = `${player.firstName[0] || ""}${player.lastName[0] || ""}`.toUpperCase()
    const age = calcAge(player.dateOfBirth)

    return (
      <div
        key={player.id}
        className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
          !isLast ? "border-b border-border/40" : ""
        }`}
        style={{ "--row-index": rowIndex } as React.CSSProperties}
      >
        {/* Photo + Name with hover card */}
        <PlayerHoverCard
          player={player}
          team={
            player.currentTeam
              ? {
                  id: player.currentTeam.id,
                  name: player.currentTeam.name,
                  shortName: player.currentTeam.shortName,
                  logoUrl: player.currentTeam.logoUrl ?? null,
                }
              : null
          }
          position={player.currentTeam?.position}
          jerseyNumber={player.currentTeam?.jerseyNumber}
          onEdit={() => openEdit(player)}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={`${player.firstName} ${player.lastName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{initials}</span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm truncate">
                <span className="text-muted-foreground">{player.firstName}</span>{" "}
                <span className="font-semibold text-foreground">{player.lastName}</span>
              </span>
              {player.currentTeam?.jerseyNumber != null && (
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  #{player.currentTeam.jerseyNumber}
                </span>
              )}
            </div>
          </div>
        </PlayerHoverCard>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Position */}
        <div className="w-24 shrink-0 hidden sm:block">
          {player.currentTeam ? (
            <Badge variant="secondary" className="text-xs font-normal">
              {t(`playersPage.positions.${player.currentTeam.position}`)}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">–</span>
          )}
        </div>

        {/* Team badge (shown when not grouped) */}
        {teamFilter !== FILTER_ALL && (
          <div className="w-20 shrink-0 hidden md:block">
            {player.currentTeam ? (
              <TeamHoverCard
                team={{
                  id: player.currentTeam.id,
                  name: player.currentTeam.name,
                  shortName: player.currentTeam.shortName,
                  logoUrl: player.currentTeam.logoUrl ?? null,
                }}
                seasonId={workingSeason?.id}
              >
                <Badge variant="outline" className="text-xs font-normal cursor-default">
                  {player.currentTeam.shortName}
                </Badge>
              </TeamHoverCard>
            ) : (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                {t("playersPage.labels.withoutTeamShort")}
              </Badge>
            )}
          </div>
        )}

        {/* Nationality */}
        <div className="w-16 shrink-0 hidden lg:block">
          {player.nationality ? (
            <span className="inline-block bg-muted text-xs rounded px-1.5 py-0.5 font-medium">
              {player.nationality}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">–</span>
          )}
        </div>

        {/* Age */}
        <div className="w-12 shrink-0 hidden lg:block text-sm text-muted-foreground text-right">
          {age !== null ? `${age}` : "–"}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to="/players/$playerId/history"
            params={{ playerId: player.id }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium h-8 px-2 md:px-3 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
            <span className="hidden md:inline">{t("playersPage.actions.history")}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => openEdit(player)} className="text-xs h-8 px-2 md:px-3">
            <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
            <span className="hidden md:inline">{t("playersPage.actions.edit")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDelete(player)}
            className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
            <span className="hidden md:inline">{t("playersPage.actions.delete")}</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <DataPageLayout
        title={t("playersPage.title")}
        description={t("playersPage.description")}
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("playersPage.actions.new")}
          </Button>
        }
        filters={
          <TeamFilterPills
            teams={teamsInUse}
            activeFilter={teamFilter}
            onFilterChange={setTeamFilter}
            showAll
            customFilters={[
              {
                id: FILTER_UNASSIGNED,
                label: t("playersPage.filters.withoutTeam"),
                count: unassignedCount,
              },
            ]}
            translationPrefix="playersPage.filters"
            seasonId={workingSeason?.id}
          />
        }
        search={{ value: search, onChange: setSearch, placeholder: t("playersPage.searchPlaceholder") }}
        count={
          !isLoading && players && players.length > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {teamFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {players.length}
                </span>{" "}
                {t("playersPage.count.players")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-4 py-3.5 ${i < 4 ? "border-b border-border/40" : ""}`}
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded hidden sm:block" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && !search && teamFilter === FILTER_ALL ? (
          <EmptyState
            icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("playersPage.empty.noPlayersTitle")}
            description={t("playersPage.empty.noPlayersDescription")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("playersPage.empty.createFirst")}
              </Button>
            }
          />
        ) : filtered.length === 0 && teamFilter === FILTER_UNASSIGNED ? (
          <EmptyState
            icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("playersPage.empty.allAssignedTitle")}
            description={
              currentSeason?.name
                ? t("playersPage.empty.allAssignedDescriptionWithSeason", { season: currentSeason.name })
                : t("playersPage.empty.allAssignedDescription")
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("playersPage.filters.fallback")} />
        ) : grouped ? (
          // Grouped by team
          <div>
            {(() => {
              let globalIndex = 0
              let sectionIndex = 0
              return grouped.map(([key, { team, players: groupPlayers }]) => {
                const currentSectionIndex = sectionIndex++
                return (
                  <div
                    key={key}
                    className={`data-section ${currentSectionIndex > 0 ? "mt-10" : ""}`}
                    style={{ "--section-index": currentSectionIndex } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-3 mb-3 pl-3 border-l-3 border-l-primary/40">
                      <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                        {team?.name ?? t("playersPage.labels.withoutTeam")}
                      </h3>
                      <div className="flex-1" />
                      <Badge variant="secondary" className="text-xs">
                        {groupPlayers.length}
                      </Badge>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
                      {groupPlayers.map((p, pi) => {
                        const row = renderPlayerRow(p, globalIndex++, pi === groupPlayers.length - 1)
                        return row
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        ) : (
          // Flat list (specific team or unassigned)
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((player, i) => renderPlayerRow(player, i, i === filtered.length - 1))}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingPlayer ? t("playersPage.dialogs.editTitle") : t("playersPage.dialogs.newTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingPlayer ? t("playersPage.dialogs.editDescription") : t("playersPage.dialogs.newDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
            {/* Photo */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">{t("playersPage.fields.photo")}</Label>
              <ImageUpload
                value={form.photoUrl || null}
                onChange={(url) => setField("photoUrl", url || "")}
                type="photo"
                label={t("playersPage.fields.uploadPhoto")}
              />
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("playersPage.fields.firstName")} error={errors.firstName} required>
                <Input
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  placeholder={t("playersPage.fields.firstNamePlaceholder")}
                />
              </FormField>
              <FormField label={t("playersPage.fields.lastName")} error={errors.lastName} required>
                <Input
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  placeholder={t("playersPage.fields.lastNamePlaceholder")}
                />
              </FormField>
            </div>

            {/* Date of birth + Nationality */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("playersPage.fields.dateOfBirth")} error={errors.dateOfBirth}>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
              </FormField>
              <FormField label={t("playersPage.fields.nationality")}>
                <Input
                  value={form.nationality}
                  onChange={(e) => setField("nationality", e.target.value)}
                  placeholder={t("playersPage.fields.nationalityPlaceholder")}
                />
              </FormField>
            </div>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? t("saving") : editingPlayer ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("playersPage.deleteDialog.title")}
        description={t("playersPage.deleteDialog.description", { name: deletingPlayer?.name ?? "" })}
        confirmLabel={t("playersPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingPlayer) deleteMutation.mutate({ id: deletingPlayer.id })
        }}
      />
    </>
  )
}
