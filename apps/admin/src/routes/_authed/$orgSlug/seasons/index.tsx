import {
  Badge,
  Button,
  FormField,
  Input,
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
import { AlertTriangle, Calendar, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterBar } from "~/components/filterBar"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/seasons/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; edit?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.edit === "string" && s.edit ? { edit: s.edit } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.season.list.ensureData()
  },
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
  usePermissionGuard("seasonStructure")
  const { t, i18n } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { isAtLimit, usageText } = usePlanLimits()
  const atSeasonLimit = isAtLimit("maxSeasons")
  const { search: searchParam, edit: editId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )

  // Sheet state driven by URL
  const isNew = editId === "new"
  const sheetOpen = !!editId

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [form, setForm] = useState<SeasonForm>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof SeasonForm, string>>>({})

  const utils = trpc.useUtils()
  const { data: seasons, isLoading } = trpc.season.list.useQuery()
  const { data: currentSeason } = trpc.season.getCurrent.useQuery()
  const { data: structureCounts } = trpc.season.structureCounts.useQuery()

  // Find the season being edited
  const editingSeason = useMemo(() => {
    if (!editId || isNew || !seasons) return null
    return seasons.find((s) => s.id === editId) ?? null
  }, [editId, isNew, seasons])

  // Populate form when sheet opens
  useEffect(() => {
    if (isNew) {
      setForm(createEmptyForm())
      setErrors({})
    } else if (editingSeason) {
      setForm({
        name: editingSeason.name,
        seasonStart: toDateInputValue(editingSeason.seasonStart),
        seasonEnd: toDateInputValue(editingSeason.seasonEnd),
      })
      setErrors({})
    }
  }, [isNew, editingSeason])

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, edit: undefined }), replace: true })
  }

  function openSheet(id: string) {
    navigate({ search: (prev) => ({ ...prev, edit: id }) })
  }

  const createMutation = trpc.season.create.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate()
      utils.season.getCurrent.invalidate()
      closeSheet()
      toast.success(t("seasonsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("seasonsPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const updateMutation = trpc.season.update.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate()
      utils.season.getCurrent.invalidate()
      closeSheet()
      toast.success(t("seasonsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("seasonsPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const deleteMutation = trpc.season.delete.useMutation({
    onSuccess: () => {
      utils.season.list.invalidate()
      setDeleteDialogOpen(false)
      closeSheet()
      toast.success(t("seasonsPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("seasonsPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
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

  function setField<K extends keyof SeasonForm>(key: K, value: SeasonForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
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

  const isDirty = isNew
    ? form.name !== createEmptyForm().name ||
      form.seasonStart !== createEmptyForm().seasonStart ||
      form.seasonEnd !== createEmptyForm().seasonEnd
    : editingSeason
      ? form.name !== editingSeason.name ||
        form.seasonStart !== toDateInputValue(editingSeason.seasonStart) ||
        form.seasonEnd !== toDateInputValue(editingSeason.seasonEnd)
      : false

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataPageLayout
        title={t("seasonsPage.title")}
        description={t("seasonsPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageText("maxSeasons")}</Badge>
            <Button
              variant="accent"
              onClick={() => openSheet("new")}
              disabled={atSeasonLimit}
              title={atSeasonLimit ? t("plan.limitReached", { defaultValue: "Plan limit reached" }) : undefined}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("seasonsPage.actions.new")}
            </Button>
          </div>
        }
        filters={
          <FilterBar search={{ value: search, onChange: setSearch, placeholder: t("seasonsPage.searchPlaceholder") }} />
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={3} />
        ) : filtered.length === 0 && !search ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("seasonsPage.empty.title")}
            description={t("seasonsPage.empty.description")}
            action={
              <Button variant="accent" onClick={() => openSheet("new")} disabled={atSeasonLimit}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("seasonsPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("seasonsPage.filterFallback")} />
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
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
                <button
                  key={season.id}
                  type="button"
                  onClick={() => openSheet(season.id)}
                  className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors cursor-pointer w-full text-left ${
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
                </button>
              )
            })}
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
            <SheetTitle>{isNew ? t("seasonsPage.dialogs.newTitle") : t("seasonsPage.dialogs.editTitle")}</SheetTitle>
            <SheetDescription>
              {isNew ? t("seasonsPage.dialogs.newDescription") : t("seasonsPage.dialogs.editDescription")}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
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
                  <Input
                    type="date"
                    value={form.seasonStart}
                    onChange={(e) => setField("seasonStart", e.target.value)}
                  />
                </FormField>

                <FormField label={t("seasonsPage.fields.seasonEnd")} error={errors.seasonEnd} required>
                  <Input type="date" value={form.seasonEnd} onChange={(e) => setField("seasonEnd", e.target.value)} />
                </FormField>
              </div>
            </SheetBody>

            <SheetFooter>
              {editingSeason && (
                <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {t("seasonsPage.actions.delete")}
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
        title={t("seasonsPage.deleteDialog.title")}
        description={t("seasonsPage.deleteDialog.description", { name: editingSeason?.name ?? "" })}
        confirmLabel={t("seasonsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (editingSeason) deleteMutation.mutate({ id: editingSeason.id })
        }}
      />
    </>
  )
}
