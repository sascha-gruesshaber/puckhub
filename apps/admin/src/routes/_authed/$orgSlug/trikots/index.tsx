import {
  Badge,
  Button,
  ColorInput,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { Pencil, Plus, Shirt, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FeatureGate } from "~/components/featureGate"
import { FilterBar } from "~/components/filterBar"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { FilterDropdown } from "~/components/filterDropdown"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { TeamCombobox } from "~/components/teamCombobox"
import { TrikotPreview } from "~/components/trikotPreview"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/trikots/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; template?: string; edit?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.template === "string" && s.template ? { template: s.template } : {}),
    ...(typeof s.edit === "string" && s.edit ? { edit: s.edit } : {}),
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
  usePermissionGuard("trikots")
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { search: searchParam, template, edit: editId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const templateFilter = useMemo(() => (template ? template.split(",") : []), [template])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setTemplateFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, template: v.join(",") || undefined }), replace: true }),
    [navigate],
  )

  // Sheet state driven by URL
  const isNew = editId === "new"
  const sheetOpen = !!editId

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [form, setForm] = useState<TrikotForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TrikotForm, string>>>({})

  // Assignment form state
  const [assignTeamId, setAssignTeamId] = useState("")
  const [assignName, setAssignName] = useState("")
  const [assignType, setAssignType] = useState<"home" | "away" | "alternate" | "custom">("custom")
  const [editingAssignment, setEditingAssignment] = useState<{
    id: string
    name: string
    assignmentType: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: trikots, isLoading } = trpc.trikot.list.useQuery()
  const { data: templates } = trpc.trikotTemplate.list.useQuery()
  const { data: teams } = trpc.team.list.useQuery()

  // Find the trikot being edited
  const editingTrikot = useMemo(() => {
    if (!editId || isNew || !trikots) return null
    return trikots.find((t) => t.id === editId) ?? null
  }, [editId, isNew, trikots])

  // Load assignments for the trikot being edited
  const { data: assignments } = trpc.teamTrikot.listByTrikot.useQuery(
    { trikotId: editId! },
    { enabled: !!editId && !isNew },
  )

  // Populate form when sheet opens
  useEffect(() => {
    if (isNew) {
      setForm({ ...emptyForm, templateId: templates?.[0]?.id ?? "" })
      setErrors({})
      setAssignTeamId("")
      setAssignName("")
      setEditingAssignment(null)
    } else if (editingTrikot) {
      setForm({
        name: editingTrikot.name,
        templateId: editingTrikot.templateId,
        primaryColor: editingTrikot.primaryColor,
        secondaryColor: editingTrikot.secondaryColor || "#C8102E",
      })
      setErrors({})
      setAssignTeamId("")
      setAssignName("")
      setEditingAssignment(null)
    }
  }, [isNew, editingTrikot, templates])

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, edit: undefined }), replace: true })
  }

  function openSheet(id: string) {
    navigate({ search: (prev) => ({ ...prev, edit: id }) })
  }

  const createMutation = trpc.trikot.create.useMutation({
    onSuccess: () => {
      utils.trikot.list.invalidate()
      closeSheet()
      toast.success(t("trikotsPage.toast.created"))
    },
    onError: (err) =>
      toast.error(t("trikotsPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const updateMutation = trpc.trikot.update.useMutation({
    onSuccess: () => {
      utils.trikot.list.invalidate()
      closeSheet()
      toast.success(t("trikotsPage.toast.updated"))
    },
    onError: (err) =>
      toast.error(t("trikotsPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const deleteMutation = trpc.trikot.delete.useMutation({
    onSuccess: () => {
      utils.trikot.list.invalidate()
      setDeleteDialogOpen(false)
      closeSheet()
      toast.success(t("trikotsPage.toast.deleted"))
    },
    onError: (err) =>
      toast.error(t("trikotsPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const assignMutation = trpc.teamTrikot.assign.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTrikot.invalidate({ trikotId: editId! })
      utils.trikot.list.invalidate()
      setAssignTeamId("")
      setAssignName("")
      setAssignType("custom")
      toast.success(t("trikotsPage.assignments.toast.created"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const updateAssignmentMutation = trpc.teamTrikot.update.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTrikot.invalidate({ trikotId: editId! })
      setEditingAssignment(null)
      toast.success(t("trikotsPage.assignments.toast.updated"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const removeAssignmentMutation = trpc.teamTrikot.remove.useMutation({
    onSuccess: () => {
      utils.teamTrikot.listByTrikot.invalidate({ trikotId: editId! })
      utils.trikot.list.invalidate()
      toast.success(t("trikotsPage.assignments.toast.removed"))
    },
    onError: (err) => toast.error(t("trikotsPage.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
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

  // Distinct templates used by trikots (for filter dropdown)
  const templateOptions: FilterDropdownOption[] = useMemo(() => {
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
    return [...map.values()].map((tmpl) => ({
      value: tmpl.id,
      label: getTemplateLabel(tmpl.name, tmpl.templateType, tmpl.colorCount),
    }))
    // biome-ignore lint/correctness/useExhaustiveDependencies: getTemplateLabel depends only on t which is already stable
  }, [trikots, getTemplateLabel])

  const filtered = useMemo(() => {
    if (!trikots) return []

    let result = trikots

    // Template filter
    if (templateFilter.length > 0) {
      result = result.filter((t) => templateFilter.includes(t.template.id))
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
    if (!assignTeamId || !editId || isNew) return
    if (assignType === "custom" && !assignName.trim()) return
    assignMutation.mutate({
      teamId: assignTeamId,
      trikotId: editId,
      name: assignType !== "custom" ? undefined : assignName.trim(),
      assignmentType: assignType,
    })
  }

  function handleUpdateAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAssignment) return
    if (editingAssignment.assignmentType === "custom" && !editingAssignment.name.trim()) return
    updateAssignmentMutation.mutate({
      id: editingAssignment.id,
      name: editingAssignment.assignmentType !== "custom" ? undefined : editingAssignment.name.trim(),
      assignmentType: editingAssignment.assignmentType as any,
    })
  }

  const isDirty = isNew
    ? form.name !== ""
    : editingTrikot
      ? form.name !== editingTrikot.name ||
        form.templateId !== editingTrikot.templateId ||
        form.primaryColor !== editingTrikot.primaryColor ||
        form.secondaryColor !== (editingTrikot.secondaryColor || "#C8102E")
      : false

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <FeatureGate feature="featureTrikotDesigner">
      <DataPageLayout
        title={t("trikotsPage.title")}
        description={t("trikotsPage.description")}
        action={
          <Button variant="accent" onClick={() => openSheet("new")} data-testid="trikots-new">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("trikotsPage.actions.new")}
          </Button>
        }
        filters={
          <FilterBar
            label={t("filters")}
            search={{ value: search, onChange: setSearch, placeholder: t("trikotsPage.searchPlaceholder") }}
          >
            {isLoading ? (
              <FilterPillsSkeleton count={1} />
            ) : templateOptions.length > 1 ? (
              <FilterDropdown
                label={t("trikotsPage.filters.all")}
                options={templateOptions}
                value={templateFilter}
                onChange={setTemplateFilter}
              />
            ) : null}
          </FilterBar>
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : filtered.length === 0 && !search && templateFilter.length === 0 ? (
          <EmptyState
            icon={<Shirt className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("trikotsPage.empty.title")}
            description={t("trikotsPage.empty.description")}
            action={
              <Button variant="accent" onClick={() => openSheet("new")}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("trikotsPage.empty.action")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("trikotsPage.filters.fallback")} />
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((trikot, i) => (
              <button
                key={trikot.id}
                type="button"
                onClick={() => openSheet(trikot.id)}
                data-testid="trikot-row"
                className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors cursor-pointer w-full text-left ${
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
              </button>
            ))}
          </div>
        )}
      </DataPageLayout>

      {/* Create/Edit Sheet with Assignments */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        dirty={isDirty}
        onDirtyClose={() => setConfirmCloseOpen(true)}
      >
        <SheetContent size="lg">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{isNew ? t("trikotsPage.dialogs.newTitle") : t("trikotsPage.dialogs.editTitle")}</SheetTitle>
            <SheetDescription>
              {isNew ? t("trikotsPage.dialogs.newDescription") : t("trikotsPage.dialogs.editDescription")}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              {/* Name */}
              <FormField label={t("trikotsPage.fields.name")} error={errors.name} required>
                <Input
                  data-testid="trikot-form-name"
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
                      data-testid={`trikot-form-template-${tmpl.templateType ?? tmpl.id}`}
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

              {/* Assignments section — only in edit mode */}
              {editingTrikot && (
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">
                    {t("trikotsPage.assignments.title", { name: editingTrikot.name })}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t("trikotsPage.assignments.description")}</p>

                  {/* Existing assignments */}
                  {assignments && assignments.length > 0 ? (
                    <div className="space-y-2">
                      {assignments.map((a) => {
                        const aType = (a as any).assignmentType ?? "custom"
                        return (
                          <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                            {editingAssignment?.id === a.id ? (
                              <form onSubmit={handleUpdateAssignment} className="flex items-center gap-2 flex-1">
                                <Select
                                  value={editingAssignment.assignmentType}
                                  onValueChange={(v) =>
                                    setEditingAssignment({
                                      ...editingAssignment,
                                      assignmentType: v,
                                      name: v !== "custom" ? "" : editingAssignment.name,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 w-28 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(["home", "away", "alternate", "custom"] as const).map((at) => (
                                      <SelectItem key={at} value={at}>
                                        {t(`trikotsPage.assignmentTypes.${at}`)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {editingAssignment.assignmentType === "custom" && (
                                  <Input
                                    value={editingAssignment.name}
                                    onChange={(e) =>
                                      setEditingAssignment({ ...editingAssignment, name: e.target.value })
                                    }
                                    className="flex-1 h-8 text-sm"
                                    placeholder={t("trikotsPage.assignments.fields.labelPlaceholder")}
                                  />
                                )}
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="accent"
                                  disabled={
                                    updateAssignmentMutation.isPending ||
                                    (editingAssignment.assignmentType === "custom" && !editingAssignment.name.trim())
                                  }
                                >
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
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {aType !== "custom" ? t(`trikotsPage.assignmentTypes.${aType}`) : a.name}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() =>
                                    setEditingAssignment({ id: a.id, name: a.name, assignmentType: aType })
                                  }
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
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("trikotsPage.assignments.empty")}
                    </p>
                  )}

                  {/* Add assignment form */}
                  <div className="border-t pt-4 space-y-3">
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
                          {t("trikotsPage.assignments.fields.assignmentType")}
                        </Label>
                        <Select
                          value={assignType}
                          onValueChange={(v: any) => {
                            setAssignType(v)
                            if (v !== "custom") setAssignName("")
                          }}
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["home", "away", "alternate", "custom"] as const).map((at) => (
                              <SelectItem key={at} value={at}>
                                {t(`trikotsPage.assignmentTypes.${at}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {assignType === "custom" && (
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
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="accent"
                      disabled={
                        !assignTeamId || (assignType === "custom" && !assignName.trim()) || assignMutation.isPending
                      }
                      onClick={handleAssign as unknown as React.MouseEventHandler}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("trikotsPage.assignments.actions.assign")}
                    </Button>
                  </div>
                </div>
              )}
            </SheetBody>

            <SheetFooter>
              {editingTrikot && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  data-testid="trikot-delete"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {t("trikotsPage.actions.delete")}
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
              <Button type="submit" variant="accent" disabled={isSaving} data-testid="trikot-form-submit">
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
        title={t("trikotsPage.deleteDialog.title")}
        description={t("trikotsPage.deleteDialog.description", { name: editingTrikot?.name ?? "" })}
        confirmLabel={t("trikotsPage.actions.delete")}
        confirmTestId="trikot-delete-confirm"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (editingTrikot) deleteMutation.mutate({ id: editingTrikot.id })
        }}
      />
    </FeatureGate>
  )
}
