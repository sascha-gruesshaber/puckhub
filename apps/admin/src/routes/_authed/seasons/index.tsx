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
  toast,
} from "@puckhub/ui"
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { AlertTriangle, Calendar, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { NoResults } from "~/components/noResults"
import { useSeasonsFilters } from "~/stores/usePageFilters"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/seasons/")({
  component: SeasonsPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SeasonForm {
  name: string
  seasonStart: string
  seasonEnd: string
}

function toDateInputValue(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10)
}

function getSuggestedSeasonName(seasonStart: string, seasonEnd: string) {
  if (!seasonStart || !seasonEnd) return ""
  const startYear = new Date(`${seasonStart}T00:00:00.000Z`).getUTCFullYear()
  const endYear = new Date(`${seasonEnd}T00:00:00.000Z`).getUTCFullYear()
  return `Season ${String(startYear).slice(-2)}/${String(endYear).slice(-2)}`
}

function createEmptyForm(): SeasonForm {
  const startYear = new Date().getUTCFullYear()
  const seasonStart = `${startYear}-09-01`
  const seasonEnd = `${startYear + 1}-04-30`
  return {
    name: getSuggestedSeasonName(seasonStart, seasonEnd),
    seasonStart,
    seasonEnd,
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function SeasonsPage() {
  const { t, i18n } = useTranslation("common")
  const navigate = useNavigate()
  const searchStr = useRouterState({ select: (s) => s.location.searchStr })
  const { search, setSearch } = useSeasonsFilters()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<{ id: string } | null>(null)
  const [deletingSeason, setDeletingSeason] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<SeasonForm>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof SeasonForm, string>>>({})

  // Auto-open create dialog when navigated with ?create=true
  useEffect(() => {
    const params = new URLSearchParams(searchStr)
    if (params.get("create") === "true") {
      openCreate()
      // Clear the search param so refreshing doesn't re-open
      navigate({ to: "/seasons", replace: true })
    }
  }, [
    searchStr, // Clear the search param so refreshing doesn't re-open
    navigate,
    openCreate,
  ])

  const utils = trpc.useUtils()
  const [seasons] = trpc.season.list.useSuspenseQuery()
  const { data: currentSeason } = trpc.season.getCurrent.useQuery()
  const { data: structureCounts } = trpc.season.structureCounts.useQuery()

  const createMutation = trpc.season.create.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate()
      utils.season.getCurrent.invalidate()
      closeDialog()
      toast.success(t("seasonsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("seasonsPage.toast.createError"), { description: err.message })
    },
  })

  const updateMutation = trpc.season.update.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate()
      utils.season.getCurrent.invalidate()
      closeDialog()
      toast.success(t("seasonsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("seasonsPage.toast.saveError"), { description: err.message })
    },
  })

  const deleteMutation = trpc.season.delete.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingSeason(null)
      toast.success(t("seasonsPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("seasonsPage.toast.deleteError"), { description: err.message })
    },
  })

  const filtered = useMemo(() => {
    if (!seasons) return []
    if (!search.trim()) return seasons
    const q = search.toLowerCase()
    return seasons.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        `${new Date(s.seasonStart).getUTCFullYear()} ${new Date(s.seasonEnd).getUTCFullYear()}`.includes(q),
    )
  }, [seasons, search])

  const stats = useMemo(() => {
    if (!seasons) return { total: 0, currentName: null as string | null }
    return {
      total: seasons.length,
      currentName: currentSeason?.name ?? null,
    }
  }, [seasons, currentSeason])

  function setField<K extends keyof SeasonForm>(key: K, value: SeasonForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openCreate() {
    setEditingSeason(null)
    setForm(createEmptyForm())
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(season: NonNullable<typeof seasons>[number]) {
    setEditingSeason({ id: season.id })
    setForm({
      name: season.name,
      seasonStart: toDateInputValue(season.seasonStart),
      seasonEnd: toDateInputValue(season.seasonEnd),
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(season: { id: string; name: string }) {
    setDeletingSeason(season)
    setDeleteDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingSeason(null)
    setForm(createEmptyForm())
    setErrors({})
  }

  function validate(): boolean {
    const next: Partial<Record<keyof SeasonForm, string>> = {}
    if (!form.seasonStart) {
      next.seasonStart = t("seasonsPage.validation.seasonStartRequired")
    }
    if (!form.seasonEnd) {
      next.seasonEnd = t("seasonsPage.validation.seasonEndRequired")
    }
    if (form.seasonStart && form.seasonEnd) {
      const start = new Date(`${form.seasonStart}T00:00:00.000Z`)
      const end = new Date(`${form.seasonEnd}T23:59:59.999Z`)
      if (start.getTime() > end.getTime()) {
        next.seasonEnd = t("seasonsPage.validation.invalidDateRange")
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const suggestedName = getSuggestedSeasonName(form.seasonStart, form.seasonEnd)
    const name = form.name.trim() || suggestedName

    if (editingSeason) {
      updateMutation.mutate({
        id: editingSeason.id,
        name,
        seasonStart: form.seasonStart,
        seasonEnd: form.seasonEnd,
      })
    } else {
      createMutation.mutate({
        name,
        seasonStart: form.seasonStart,
        seasonEnd: form.seasonEnd,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataPageLayout
        title={t("seasonsPage.title")}
        description={t("seasonsPage.description")}
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("seasonsPage.actions.new")}
          </Button>
        }
        search={{ value: search, onChange: setSearch, placeholder: t("seasonsPage.searchPlaceholder") }}
        count={
          seasons.length > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.total}</span> {t("seasonsPage.count.total")}
              </span>
              {stats.currentName && (
                <>
                  <span className="text-border">|</span>
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    <span className="font-semibold text-foreground">{stats.currentName}</span>
                  </span>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {filtered.length === 0 && !search ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("seasonsPage.empty.title")}
            description={t("seasonsPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("seasonsPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("seasonsPage.filterFallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((season, i) => {
              const divisionCount = structureCounts?.[season.id] ?? 0
              const created = season.createdAt instanceof Date ? season.createdAt : new Date(season.createdAt)
              const startYear = new Date(season.seasonStart).getUTCFullYear()
              const endYear = new Date(season.seasonEnd).getUTCFullYear()
              const isCurrent = currentSeason?.id === season.id
              const formattedDate = created.toLocaleDateString(i18n.language, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })

              return (
                <div
                  key={season.id}
                  className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                    i < filtered.length - 1 ? "border-b border-border/40" : ""
                  }`}
                  style={{ "--row-index": i } as React.CSSProperties}
                >
                  {/* Season badge */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                    style={{
                      background: isCurrent
                        ? "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))"
                        : "hsl(var(--muted))",
                      color: isCurrent ? "#fff" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {String(startYear).slice(-2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{season.name}</span>
                      {isCurrent && (
                        <Badge variant="accent" className="shrink-0 text-[10px]">
                          {t("seasonsPage.badges.active")}
                        </Badge>
                      )}
                      {divisionCount === 0 && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {t("seasonsPage.badges.noStructure")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("seasonsPage.meta.range", {
                        start: String(startYear).slice(-2),
                        end: String(endYear).slice(-2),
                      })}
                      {" • "}
                      {t("seasonsPage.meta.createdAt", { date: formattedDate })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(season)}
                      className="text-xs h-8 px-2 md:px-3"
                    >
                      <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                      <span className="hidden md:inline">{t("seasonsPage.actions.edit")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDelete({ id: season.id, name: season.name })}
                      className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                      <span className="hidden md:inline">{t("seasonsPage.actions.delete")}</span>
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
        <DialogContent className="max-w-md">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingSeason ? t("seasonsPage.dialogs.editTitle") : t("seasonsPage.dialogs.newTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingSeason ? t("seasonsPage.dialogs.editDescription") : t("seasonsPage.dialogs.newDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
            <FormField label={t("seasonsPage.fields.name")} error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={
                  getSuggestedSeasonName(form.seasonStart, form.seasonEnd) || t("seasonsPage.fields.namePlaceholder")
                }
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("seasonsPage.fields.seasonStart")} error={errors.seasonStart} required>
                <Input type="date" value={form.seasonStart} onChange={(e) => setField("seasonStart", e.target.value)} />
              </FormField>

              <FormField label={t("seasonsPage.fields.seasonEnd")} error={errors.seasonEnd} required>
                <Input type="date" value={form.seasonEnd} onChange={(e) => setField("seasonEnd", e.target.value)} />
              </FormField>
            </div>

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? t("saving") : editingSeason ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("seasonsPage.deleteDialog.title")}
        description={t("seasonsPage.deleteDialog.description", { name: deletingSeason?.name ?? "" })}
        confirmLabel={t("seasonsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingSeason) deleteMutation.mutate({ id: deletingSeason.id })
        }}
      />
    </>
  )
}
