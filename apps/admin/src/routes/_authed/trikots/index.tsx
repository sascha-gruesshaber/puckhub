import {
  Badge,
  Button,
  ColorInput,
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
import { Link2, Pencil, Plus, Shirt, Trash2, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { CountSkeleton } from "~/components/skeletons/countSkeleton"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { NoResults } from "~/components/noResults"
import { TeamCombobox } from "~/components/teamCombobox"
import { TrikotPreview } from "~/components/trikotPreview"
import { FILTER_ALL } from "~/lib/search-params"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/trikots/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; template?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.template === "string" && s.template ? { template: s.template } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.trikot.list.ensureData()
  },
  component: TrikotsPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TrikotForm {
  name: string
  templateId: string
  primaryColor: string
  secondaryColor: string
}

const emptyForm: TrikotForm = {
  name: "",
  templateId: "",
  primaryColor: "#1B365D",
  secondaryColor: "#C8102E",
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function TrikotsPage() {
  const { t } = useTranslation("common")
  const { search: searchParam, template } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const templateFilter = template ?? FILTER_ALL
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setTemplateFilter = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, template: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editingTrikot, setEditingTrikot] = useState<{ id: string } | null>(null)
  const [deletingTrikot, setDeletingTrikot] = useState<{ id: string; name: string } | null>(null)
  const [assigningTrikotId, setAssigningTrikotId] = useState<string | null>(null)
  const [form, setForm] = useState<TrikotForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TrikotForm, string>>>({})

  // Assignment form
  const [assignTeamId, setAssignTeamId] = useState("")
  const [assignName, setAssignName] = useState("")
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; name: string } | null>(null)

  const utils = trpc.useUtils()
  const { data: trikots, isLoading } = trpc.trikot.list.useQuery()
  const { data: templates } = trpc.trikotTemplate.list.useQuery()
  const { data: teams } = trpc.team.list.useQuery()
  const { data: assignments } = trpc.teamTrikot.listByTrikot.useQuery(
    { trikotId: assigningTrikotId! },
    { enabled: !!assigningTrikotId },
  )

  const createMutation = trpc.trikot.create.useMutation({
    onSuccess: () => {
      utils.trikot.list.invalidate()
      closeDialog()
      toast.success(t("trikotsPage.toast.created"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.createError"), { description: err.message }),
  })

  const updateMutation = trpc.trikot.update.useMutation({
    onSuccess: () => {
      utils.trikot.list.invalidate()
      closeDialog()
      toast.success(t("trikotsPage.toast.updated"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.saveError"), { description: err.message }),
  })

  const deleteMutation = trpc.trikot.delete.useMutation({
    onSuccess: () => {
      utils.trikot.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingTrikot(null)
      toast.success(t("trikotsPage.toast.deleted"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.deleteError"), { description: err.message }),
  })

  const assignMutation = trpc.teamTrikot.assign.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTrikot.invalidate({ trikotId: assigningTrikotId! })
      utils.trikot.list.invalidate()
      setAssignTeamId("")
      setAssignName("")
      toast.success(t("trikotsPage.assignments.toast.created"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.error"), { description: err.message }),
  })

  const updateAssignmentMutation = trpc.teamTrikot.update.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTrikot.invalidate({ trikotId: assigningTrikotId! })
      setEditingAssignment(null)
      toast.success(t("trikotsPage.assignments.toast.updated"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.error"), { description: err.message }),
  })

  const removeAssignmentMutation = trpc.teamTrikot.remove.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTrikot.invalidate({ trikotId: assigningTrikotId! })
      utils.trikot.list.invalidate()
      toast.success(t("trikotsPage.assignments.toast.removed"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.error"), { description: err.message }),
  })

  function getTemplateLabel(
    templateName: string,
    templateType?: "one_color" | "two_color" | null,
    colorCount?: number | null,
  ) {
    if (templateType === "one_color") return t("trikotsPage.templateNames.oneColor")
    if (templateType === "two_color") return t("trikotsPage.templateNames.twoColor")
    const normalized = templateName.trim().toLowerCase()
    if (
      normalized === "einfarbig" ||
      normalized === "one-color" ||
      normalized === "one color" ||
      normalized === "one_color"
    ) {
      return t("trikotsPage.templateNames.oneColor")
    }
    if (
      normalized === "zweifarbig" ||
      normalized === "two-color" ||
      normalized === "two color" ||
      normalized === "two_color"
    ) {
      return t("trikotsPage.templateNames.twoColor")
    }
    if (colorCount === 1) return t("trikotsPage.templateNames.oneColor")
    if (colorCount === 2) return t("trikotsPage.templateNames.twoColor")
    return templateName
  }

  // Distinct templates used by trikots (for filter pills)
  const usedTemplates = useMemo(() => {
    if (!trikots) return []
    const map = new Map<
      string,
      { id: string; name: string; colorCount: number; templateType: "one_color" | "two_color" | null }
    >()
    for (const t of trikots) {
      if (!map.has(t.template.id)) {
        map.set(t.template.id, {
          id: t.template.id,
          name: t.template.name,
          colorCount: t.template.colorCount,
          templateType: t.template.templateType,
        })
      }
    }
    return [...map.values()]
  }, [trikots])

  const filtered = useMemo(() => {
    if (!trikots) return []

    let result = trikots

    // Template filter
    if (templateFilter !== FILTER_ALL) {
      result = result.filter((t) => t.template.id === templateFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.template.name.toLowerCase().includes(q))
    }

    return result
  }, [trikots, search, templateFilter])

  const selectedTemplate = useMemo(() => templates?.find((t) => t.id === form.templateId), [templates, form.templateId])

  function setField<K extends keyof TrikotForm>(key: K, value: TrikotForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function openCreate() {
    setEditingTrikot(null)
    setForm({ ...emptyForm, templateId: templates?.[0]?.id ?? "" })
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(trikot: NonNullable<typeof trikots>[number]) {
    setEditingTrikot({ id: trikot.id })
    setForm({
      name: trikot.name,
      templateId: trikot.templateId,
      primaryColor: trikot.primaryColor,
      secondaryColor: trikot.secondaryColor || "#C8102E",
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openDelete(trikot: { id: string; name: string }) {
    setDeletingTrikot(trikot)
    setDeleteDialogOpen(true)
  }

  function openAssignments(trikotId: string) {
    setAssigningTrikotId(trikotId)
    setAssignTeamId("")
    setAssignName("")
    setEditingAssignment(null)
    setAssignDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingTrikot(null)
    setForm(emptyForm)
    setErrors({})
  }

  function validate(): boolean {
    const next: Partial<Record<keyof TrikotForm, string>> = {}
    if (!form.name.trim()) next.name = t("trikotsPage.validation.nameRequired")
    if (!form.templateId) next.templateId = t("trikotsPage.validation.templateRequired")
    if (!form.primaryColor.trim()) next.primaryColor = t("trikotsPage.validation.primaryColorRequired")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const needsSecondary = selectedTemplate && selectedTemplate.colorCount > 1

    if (editingTrikot) {
      updateMutation.mutate({
        id: editingTrikot.id,
        name: form.name.trim(),
        templateId: form.templateId,
        primaryColor: form.primaryColor,
        secondaryColor: needsSecondary ? form.secondaryColor : null,
      })
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        templateId: form.templateId,
        primaryColor: form.primaryColor,
        secondaryColor: needsSecondary ? form.secondaryColor : undefined,
      })
    }
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTeamId || !assignName.trim() || !assigningTrikotId) return
    assignMutation.mutate({
      teamId: assignTeamId,
      trikotId: assigningTrikotId,
      name: assignName.trim(),
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

  const isSaving = createMutation.isPending || updateMutation.isPending
  const assigningTrikot = trikots?.find((t) => t.id === assigningTrikotId)

  return (
    <>
      <DataPageLayout
        title={t("trikotsPage.title")}
        description={t("trikotsPage.description")}
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("trikotsPage.actions.new")}
          </Button>
        }
        filters={
          isLoading ? (
            <FilterPillsSkeleton count={3} />
          ) : usedTemplates.length > 1 ? (
            <>
              <FilterPill
                label={t("trikotsPage.filters.all")}
                active={templateFilter === FILTER_ALL}
                onClick={() => setTemplateFilter(FILTER_ALL)}
              />
              {usedTemplates.map((tmpl) => (
                <FilterPill
                  key={tmpl.id}
                  label={getTemplateLabel(tmpl.name, tmpl.templateType, tmpl.colorCount)}
                  active={templateFilter === tmpl.id}
                  onClick={() => setTemplateFilter(tmpl.id)}
                />
              ))}
            </>
          ) : undefined
        }
        search={{ value: search, onChange: setSearch, placeholder: t("trikotsPage.searchPlaceholder") }}
        count={
          isLoading ? (
            <CountSkeleton />
          ) : (trikots?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {templateFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {trikots?.length ?? 0}
                </span>{" "}
                {t("trikotsPage.count.trikots")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{templates?.length ?? 0}</span>{" "}
                {t("trikotsPage.count.templates")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : filtered.length === 0 && !search && templateFilter === FILTER_ALL ? (
          <EmptyState
            icon={<Shirt className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("trikotsPage.empty.title")}
            description={t("trikotsPage.empty.description")}
            action={
              <Button variant="accent" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("trikotsPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("trikotsPage.filters.fallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((trikot, i) => (
              <div
                key={trikot.id}
                className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                  i < filtered.length - 1 ? "border-b border-border/40" : ""
                }`}
                style={{ "--row-index": i } as React.CSSProperties}
              >
                {/* Trikot preview */}
                <div className="shrink-0">
                  <TrikotPreview
                    svg={trikot.template.svg}
                    primaryColor={trikot.primaryColor}
                    secondaryColor={trikot.secondaryColor}
                    size="sm"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{trikot.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Color swatches */}
                    <div className="flex items-center gap-1">
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ background: trikot.primaryColor }}
                        title={t("trikotsPage.colors.primaryTitle", { color: trikot.primaryColor })}
                        aria-hidden="true"
                      />
                      {trikot.template.colorCount > 1 && trikot.secondaryColor && (
                        <div
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ background: trikot.secondaryColor }}
                          title={t("trikotsPage.colors.secondaryTitle", { color: trikot.secondaryColor })}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAssignments(trikot.id)}
                    className="text-xs h-8 px-2 md:px-3"
                  >
                    <Link2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("trikotsPage.actions.assignments")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(trikot)}
                    className="text-xs h-8 px-2 md:px-3"
                  >
                    <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("trikotsPage.actions.edit")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDelete({ id: trikot.id, name: trikot.name })}
                    className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("trikotsPage.actions.delete")}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={closeDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingTrikot ? t("trikotsPage.dialogs.editTitle") : t("trikotsPage.dialogs.newTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingTrikot ? t("trikotsPage.dialogs.editDescription") : t("trikotsPage.dialogs.newDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
            {/* Name */}
            <FormField label={t("trikotsPage.fields.name")} error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={t("trikotsPage.fields.namePlaceholder")}
              />
            </FormField>

            {/* Template selector */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t("trikotsPage.fields.template")} <span className="text-destructive">*</span>
              </Label>
              {errors.templateId && <p className="text-sm text-destructive mb-2">{errors.templateId}</p>}
              <div className="grid grid-cols-2 gap-3">
                {templates?.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setField("templateId", tmpl.id)}
                    className="relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
                    style={{
                      borderColor: form.templateId === tmpl.id ? "hsl(var(--accent))" : "hsl(var(--border))",
                      background: form.templateId === tmpl.id ? "hsl(var(--accent) / 0.05)" : "transparent",
                    }}
                  >
                    <TrikotPreview
                      svg={tmpl.svg}
                      primaryColor={form.primaryColor}
                      secondaryColor={tmpl.colorCount > 1 ? form.secondaryColor : undefined}
                      size="md"
                    />
                    <span className="text-sm font-medium">
                      {getTemplateLabel(tmpl.name, tmpl.templateType, tmpl.colorCount)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {tmpl.colorCount === 1 ? t("trikotsPage.colors.oneColor") : t("trikotsPage.colors.twoColors")}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("trikotsPage.fields.primaryColor")} error={errors.primaryColor} required>
                <ColorInput value={form.primaryColor} onChange={(v) => setField("primaryColor", v)} />
              </FormField>
              {selectedTemplate && selectedTemplate.colorCount > 1 && (
                <FormField label={t("trikotsPage.fields.secondaryColor")}>
                  <ColorInput value={form.secondaryColor} onChange={(v) => setField("secondaryColor", v)} />
                </FormField>
              )}
            </div>

            {/* Live preview */}
            {selectedTemplate && (
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("trikotsPage.fields.preview")}</Label>
                <div
                  className="flex justify-center rounded-lg border p-6"
                  style={{ background: "hsl(var(--muted) / 0.3)" }}
                >
                  <TrikotPreview
                    svg={selectedTemplate.svg}
                    primaryColor={form.primaryColor}
                    secondaryColor={selectedTemplate.colorCount > 1 ? form.secondaryColor : undefined}
                    size="lg"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving}>
                {isSaving ? t("saving") : editingTrikot ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("trikotsPage.deleteDialog.title")}
        description={t("trikotsPage.deleteDialog.description", { name: deletingTrikot?.name ?? "" })}
        confirmLabel={t("trikotsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingTrikot) deleteMutation.mutate({ id: deletingTrikot.id })
        }}
      />

      {/* Assignments Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setAssignDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t("trikotsPage.assignments.title", { name: assigningTrikot?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("trikotsPage.assignments.description")}</DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-4">
            {/* Existing assignments */}
            {assignments && assignments.length > 0 ? (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {editingAssignment?.id === a.id ? (
                      <form onSubmit={handleUpdateAssignment} className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingAssignment.name}
                          onChange={(e) => setEditingAssignment({ ...editingAssignment, name: e.target.value })}
                          className="flex-1 h-8 text-sm"
                        />
                        <Button type="submit" size="sm" variant="accent" disabled={updateAssignmentMutation.isPending}>
                          {t("trikotsPage.assignments.actions.save")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingAssignment(null)}
                          title={t("trikotsPage.assignments.actions.cancelEdit")}
                          aria-label={t("trikotsPage.assignments.actions.cancelEdit")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.team.name}</p>
                          <p className="text-xs text-muted-foreground">{a.name}</p>
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
              <p className="text-sm text-muted-foreground text-center py-4">{t("trikotsPage.assignments.empty")}</p>
            )}

            {/* Add assignment form */}
            <form onSubmit={handleAssign} className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">{t("trikotsPage.assignments.newTitle")}</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {t("trikotsPage.assignments.fields.team")}
                  </Label>
                  <TeamCombobox
                    teams={(teams ?? []).map((t) => ({
                      id: t.id,
                      name: t.name,
                      shortName: t.shortName,
                      city: t.city,
                      logoUrl: t.logoUrl,
                      primaryColor: t.primaryColor,
                    }))}
                    value={assignTeamId}
                    onChange={setAssignTeamId}
                    placeholder={t("trikotsPage.assignments.fields.teamPlaceholder")}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {t("trikotsPage.assignments.fields.label")}
                  </Label>
                  <Input
                    value={assignName}
                    onChange={(e) => setAssignName(e.target.value)}
                    placeholder={t("trikotsPage.assignments.fields.labelPlaceholder")}
                    className="h-10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                variant="accent"
                disabled={!assignTeamId || !assignName.trim() || assignMutation.isPending}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("trikotsPage.assignments.actions.assign")}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
