import { Badge, Button, FormField, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router"
import { ChevronRight, FileText, GripVertical, Link2, PanelTop, Plus, Trash2, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { TabNavigation, type TabGroup } from "~/components/tabNavigation"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterBar } from "~/components/filterBar"
import { FilterDropdown } from "~/components/filterDropdown"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/pages/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; status?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.status === "string" && s.status ? { status: s.status } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.page.list.ensureData()
  },
  component: PagesPage,
})

const FILTER_PUBLISHED = "__published__"
const FILTER_DRAFT = "__draft__"

// ---------------------------------------------------------------------------
// Sortable row component
// ---------------------------------------------------------------------------
interface PageRowData {
  id: string
  title: string
  slug: string
  status: string
  isSystemRoute: boolean
  routePath: string | null
  menuLocations: string[]
  sortOrder: number
}

function SortablePageRow({
  page,
  isChild,
  parentSlug,
  rowIndex,
  onToggleStatus,
  onDelete,
  t,
  isFiltered,
}: {
  page: PageRowData
  isChild: boolean
  parentSlug: string | null
  rowIndex: number
  onToggleStatus: (id: string, current: string) => void
  onDelete: (id: string, title: string) => void
  t: (key: string, opts?: any) => string
  isFiltered: boolean
}) {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    disabled: isFiltered,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    "--row-index": rowIndex,
  } as React.CSSProperties

  const isDraft = page.status === "draft"
  const dotColor = isDraft ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)"
  const dotTitle = isDraft ? t("pagesPage.status.draft") : t("pagesPage.status.published")
  const fullSlug = parentSlug ? `/${parentSlug}/${page.slug}` : `/${page.slug}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${
        isChild ? "pl-10 border-l-2 border-l-border/30" : ""
      } ${rowIndex > 0 ? "border-t border-border/40" : ""} ${isDragging ? "z-10" : ""}`}
    >
      {/* Dashed placeholder overlay — visible only while this item is being dragged */}
      {isDragging && (
        <div className="absolute inset-x-2 inset-y-1 rounded-lg border-2 border-dashed border-primary/30 bg-primary/[0.04] z-10" />
      )}
      <div
        className={`data-row group flex items-center gap-3 px-4 py-3.5 transition-colors ${isDragging ? `invisible` : `hover:bg-accent/5`}`}
      >
        {/* Drag handle */}
        {!isFiltered && (
          <button
            type="button"
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Status dot */}
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dotColor }} title={dotTitle} />

        {/* Content — clickable title area */}
        <Link
          to="/$orgSlug/pages/$pageId/edit"
          params={{ orgSlug, pageId: page.id }}
          className="flex-1 min-w-0 hover:underline decoration-muted-foreground/30 underline-offset-2"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{page.title}</h3>
            <Badge variant={isDraft ? "outline" : "default"} className="shrink-0 text-[10px]">
              {isDraft ? t("pagesPage.status.draft") : t("pagesPage.status.published")}
            </Badge>
            {page.isSystemRoute && (
              <Badge variant="outline" className="shrink-0 text-[10px] border-blue-400 text-blue-600">
                <PanelTop className="h-2.5 w-2.5 mr-1" />
                {t("pagesPage.menu.builtIn")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{page.isSystemRoute && page.routePath ? page.routePath : fullSlug}</span>
          </div>
        </Link>

        {/* Actions — only toggle + subpage */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Inline visibility toggle for system routes */}
          {page.isSystemRoute && (
            <button
              type="button"
              onClick={() => onToggleStatus(page.id, page.status)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                page.status === "published" ? "bg-green-500" : "bg-gray-300"
              }`}
              title={page.status === "published" ? t("pagesPage.status.published") : t("pagesPage.status.draft")}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  page.status === "published" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          )}
          {!isChild && !page.isSystemRoute && (
            <Link to="/$orgSlug/pages/new" params={{ orgSlug }} search={{ parent: page.id }}>
              <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                <Plus className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                <span className="hidden md:inline">{t("pagesPage.actions.subpage")}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drag overlay preview — floating card shown while dragging
// ---------------------------------------------------------------------------
function DragPreview({ page }: { page: PageRowData }) {
  const isDraft = page.status === "draft"
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.08] cursor-grabbing">
      <GripVertical className="h-4 w-4 text-primary shrink-0" />
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
        style={{ background: isDraft ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)" }}
      />
      <span className="font-semibold truncate text-sm">{page.title}</span>
      {page.isSystemRoute && (
        <Badge variant="outline" className="shrink-0 text-[10px] border-blue-400 text-blue-600">
          <PanelTop className="h-2.5 w-2.5 mr-1" />
          Built-in
        </Badge>
      )}
      <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0">
        {page.isSystemRoute && page.routePath ? page.routePath : `/${page.slug}`}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
function PagesPage() {
  usePermissionGuard("pages")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { isAtLimit, usageText } = usePlanLimits()
  const atPageLimit = isAtLimit("maxPages")
  const { search: searchParam, status } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const statusFilter = useMemo(() => (status ? [status] : []), [status])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setStatusFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, status: v[0] || undefined }), replace: true }),
    [navigate],
  )
  type PositionTab = "main_nav" | "footer"
  const [positionTab, setPositionTab] = useState<PositionTab>("main_nav")

  const positionTabGroups = useMemo<TabGroup<PositionTab>[]>(
    () => [
      {
        key: "positions",
        tabs: [
          { id: "main_nav", label: t("pagesPage.tabs.mainNav"), testId: "pages-tab-main-nav" },
          { id: "footer", label: t("pagesPage.tabs.footerNav"), testId: "pages-tab-footer" },
        ],
      },
    ],
    [t],
  )

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPage, setDeletingPage] = useState<{ id: string; title: string } | null>(null)
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false)
  const [aliasTitle, setAliasTitle] = useState("")
  const [aliasTargetId, setAliasTargetId] = useState("")
  const [deleteAliasDialogOpen, setDeleteAliasDialogOpen] = useState(false)
  const [deletingAlias, setDeletingAlias] = useState<{ id: string; slug: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const [activeDragPage, setActiveDragPage] = useState<PageRowData | null>(null)

  const utils = trpc.useUtils()
  const { data: pages, isLoading } = trpc.page.list.useQuery()
  const { data: aliases } = trpc.page.listAliases.useQuery()

  const updateMutation = trpc.page.update.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.updateError", { defaultValue: "Update failed" }), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  const reorderMutation = trpc.page.reorder.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.updateError", { defaultValue: "Reorder failed" }), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  const deleteMutation = trpc.page.delete.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
      utils.page.listAliases.invalidate()
      setDeleteDialogOpen(false)
      setDeletingPage(null)
      toast.success(t("pagesPage.toast.pageDeleted"))
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const createAliasMutation = trpc.page.createAlias.useMutation({
    onSuccess: () => {
      utils.page.listAliases.invalidate()
      setAliasDialogOpen(false)
      setAliasTitle("")
      setAliasTargetId("")
      toast.success(t("pagesPage.toast.aliasCreated"))
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const deleteAliasMutation = trpc.page.deleteAlias.useMutation({
    onSuccess: () => {
      utils.page.listAliases.invalidate()
      setDeleteAliasDialogOpen(false)
      setDeletingAlias(null)
      toast.success(t("pagesPage.toast.aliasDeleted"))
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  // Group: top-level pages with children
  const topLevelPages = useMemo(() => {
    if (!pages) return []
    return pages.filter((p) => !p.parentId)
  }, [pages])

  const isFiltered = search.trim().length > 0 || statusFilter.length > 0

  const filtered = useMemo(() => {
    if (!topLevelPages.length) return []

    let result = topLevelPages

    // Position tab filter
    result = result.filter(
      (p) =>
        p.menuLocations.includes(positionTab) || (p.children ?? []).some((c) => c.menuLocations.includes(positionTab)),
    )
    // Also filter children to only those matching the position
    result = result.map((p) => {
      const children = (p.children ?? []).filter((c) => c.menuLocations.includes(positionTab))
      return { ...p, children }
    })

    // Status filter
    if (statusFilter.includes(FILTER_PUBLISHED)) {
      result = result.filter((p) => p.status === "published")
    } else if (statusFilter.includes(FILTER_DRAFT)) {
      result = result.filter((p) => p.status === "draft")
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.children ?? []).some((c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)),
      )
    }

    return result
  }, [topLevelPages, search, statusFilter, positionTab])

  // All pages for alias target dropdown (built from top-level + nested children to avoid duplicates)
  const allPagesFlat = useMemo(() => {
    if (!topLevelPages.length) return []
    const result: { id: string; title: string }[] = []
    for (const p of topLevelPages) {
      if (p.isSystemRoute) continue
      result.push({ id: p.id, title: p.title })
      for (const c of p.children ?? []) {
        result.push({ id: c.id, title: `${p.title} / ${c.title}` })
      }
    }
    return result
  }, [topLevelPages])

  const handleToggleStatus = useCallback(
    (id: string, current: string) => {
      updateMutation.mutate({ id, status: current === "published" ? "draft" : "published" })
    },
    [updateMutation],
  )

  const handleDelete = useCallback((id: string, title: string) => {
    setDeletingPage({ id, title })
    setDeleteDialogOpen(true)
  }, [])

  // Find a page (top-level or child) by ID for the drag overlay
  const findPageById = useCallback(
    (id: string): PageRowData | null => {
      for (const p of filtered) {
        if (p.id === id) return p
        for (const c of p.children ?? []) {
          if (c.id === id) return c
        }
      }
      return null
    },
    [filtered],
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragPage(findPageById(event.active.id as string))
    },
    [findPageById],
  )

  const handleDragCancel = useCallback(() => {
    setActiveDragPage(null)
  }, [])

  // Handle drag end for top-level pages
  const handleTopLevelDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragPage(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = filtered.findIndex((p) => p.id === active.id)
      const newIndex = filtered.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(filtered, oldIndex, newIndex)
      const items = reordered.map((p, i) => ({ id: p.id, sortOrder: i }))
      reorderMutation.mutate({ items })
    },
    [filtered, reorderMutation],
  )

  // Handle drag end for children within a parent
  const handleChildDragEnd = useCallback(
    (parentId: string) => (event: DragEndEvent) => {
      setActiveDragPage(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const parent = filtered.find((p) => p.id === parentId)
      if (!parent) return
      const children = parent.children ?? []

      const oldIndex = children.findIndex((c) => c.id === active.id)
      const newIndex = children.findIndex((c) => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(children, oldIndex, newIndex)
      const items = reordered.map((c, i) => ({ id: c.id, sortOrder: i }))
      reorderMutation.mutate({ items })
    },
    [filtered, reorderMutation],
  )

  let globalRowIndex = 0

  return (
    <>
      <DataPageLayout
        title={t("pagesPage.title")}
        description={t("pagesPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageText("maxPages")}</Badge>
            <div className={atPageLimit ? "pointer-events-none opacity-50" : ""}>
              <Link to="/$orgSlug/pages/new" params={{ orgSlug }} search={{}}>
                <Button
                  variant="accent"
                  disabled={atPageLimit}
                  data-testid="pages-new"
                  title={atPageLimit ? t("plan.limitReached", { defaultValue: "Plan limit reached" }) : undefined}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("pagesPage.actions.new")}
                </Button>
              </Link>
            </div>
          </div>
        }
        filters={
          <FilterBar
            label={t("filters")}
            search={{ value: search, onChange: setSearch, placeholder: t("pagesPage.searchPlaceholder") }}
          >
            {isLoading ? (
              <FilterPillsSkeleton count={1} />
            ) : (
              <FilterDropdown
                label={t("pagesPage.filters.all")}
                options={[
                  { value: FILTER_PUBLISHED, label: t("pagesPage.filters.published") },
                  { value: FILTER_DRAFT, label: t("pagesPage.filters.draft") },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                singleSelect
              />
            )}
          </FilterBar>
        }
      >
        {/* Position tabs */}
        {!isLoading && (pages?.length ?? 0) > 0 && (
          <TabNavigation groups={positionTabGroups} activeTab={positionTab} onTabChange={setPositionTab} />
        )}

        {/* Pages list */}
        {isLoading ? (
          <DataListSkeleton rows={5} showIcon={false} />
        ) : filtered.length === 0 && !search && statusFilter.length === 0 && !pages?.length ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("pagesPage.empty.title")}
            description={t("pagesPage.empty.description")}
            action={
              <div className={atPageLimit ? "pointer-events-none opacity-50" : ""}>
                <Link to="/$orgSlug/pages/new" params={{ orgSlug }}>
                  <Button variant="accent" disabled={atPageLimit}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("pagesPage.empty.action")}
                  </Button>
                </Link>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("pagesPage.filters.fallback")} />
        ) : (
          <div>
            <div className="data-section" style={{ "--section-index": 0 } as React.CSSProperties}>
              <div className="flex items-center gap-3 mb-3 pl-3 border-l-3 border-l-primary/40">
                <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                  {t("pagesPage.sections.pages", { defaultValue: "Seiten" })}
                </h3>
                <div className="flex-1" />
                <span className="text-xs font-semibold rounded-md px-2 py-0.5 bg-secondary text-secondary-foreground">
                  {filtered.reduce((sum, p) => sum + 1 + (p.children?.length ?? 0), 0)}
                </span>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-border/50">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragStart={handleDragStart}
                  onDragEnd={handleTopLevelDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext items={filtered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {filtered.map((page) => {
                      const children = page.children ?? []
                      const topRowIdx = globalRowIndex++

                      return (
                        <div key={page.id}>
                          {/* Top-level page row */}
                          <SortablePageRow
                            page={page}
                            isChild={false}
                            parentSlug={null}
                            rowIndex={topRowIdx}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDelete}
                            t={t}
                            isFiltered={isFiltered}
                          />

                          {/* Children rows with their own DnD context */}
                          {children.length > 0 && (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              modifiers={[restrictToVerticalAxis]}
                              onDragStart={handleDragStart}
                              onDragEnd={handleChildDragEnd(page.id)}
                              onDragCancel={handleDragCancel}
                            >
                              <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                                {children.map((child) => {
                                  const childRowIdx = globalRowIndex++
                                  return (
                                    <SortablePageRow
                                      key={child.id}
                                      page={child}
                                      isChild
                                      parentSlug={page.slug}
                                      rowIndex={childRowIdx}
                                      onToggleStatus={handleToggleStatus}
                                      onDelete={handleDelete}
                                      t={t}
                                      isFiltered={isFiltered}
                                    />
                                  )
                                })}
                              </SortableContext>
                              <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
                                {activeDragPage && <DragPreview page={activeDragPage} />}
                              </DragOverlay>
                            </DndContext>
                          )}
                        </div>
                      )
                    })}
                  </SortableContext>
                  <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
                    {activeDragPage && <DragPreview page={activeDragPage} />}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>

            {/* Aliases Section */}
            {aliases && aliases.length > 0 && (
              <div className="data-section mt-10" style={{ "--section-index": 1 } as React.CSSProperties}>
                <div className="flex items-center gap-3 mb-3 pl-3 border-l-3 border-l-primary/40">
                  <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                    {t("pagesPage.aliases.sectionTitle")}
                  </h3>
                  <div className="flex-1" />
                  <span className="text-xs font-semibold rounded-md px-2 py-0.5 bg-secondary text-secondary-foreground">
                    {aliases.length}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setAliasDialogOpen(true)}>
                    <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    {t("pagesPage.aliases.new")}
                  </Button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
                  {aliases.map((alias, i) => (
                    <div
                      key={alias.id}
                      className={`data-row flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/5 transition-colors ${
                        i < aliases.length - 1 ? "border-b border-border/40" : ""
                      }`}
                      style={{ "--row-index": i } as React.CSSProperties}
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-muted-foreground">/{alias.slug}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{alias.targetPage.title}</span>
                      <span className="text-xs text-muted-foreground font-mono">/{alias.targetPage.slug}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingAlias({ id: alias.id, slug: alias.slug })
                          setDeleteAliasDialogOpen(true)
                        }}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alias create button (when no aliases exist) */}
        {aliases && aliases.length === 0 && pages && (pages?.length ?? 0) > 0 && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setAliasDialogOpen(true)}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("pagesPage.aliases.create")}
            </Button>
          </div>
        )}
      </DataPageLayout>

      {/* Delete Page Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("pagesPage.deletePageDialog.title")}
        description={t("pagesPage.deletePageDialog.description", { title: deletingPage?.title ?? "" })}
        confirmLabel={t("pagesPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingPage) deleteMutation.mutate({ id: deletingPage.id })
        }}
      />

      {/* Delete Alias Confirmation */}
      <ConfirmDialog
        open={deleteAliasDialogOpen}
        onOpenChange={setDeleteAliasDialogOpen}
        title={t("pagesPage.deleteAliasDialog.title")}
        description={t("pagesPage.deleteAliasDialog.description", { slug: deletingAlias?.slug ?? "" })}
        confirmLabel={t("pagesPage.actions.delete")}
        variant="destructive"
        isPending={deleteAliasMutation.isPending}
        onConfirm={() => {
          if (deletingAlias) deleteAliasMutation.mutate({ id: deletingAlias.id })
        }}
      />

      {/* Create Alias Dialog */}
      {aliasDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">{t("pagesPage.aliases.dialog.title")}</h3>
            <FormField label={t("pagesPage.aliases.dialog.aliasTitle")}>
              <Input
                value={aliasTitle}
                onChange={(e) => setAliasTitle(e.target.value)}
                placeholder={t("pagesPage.aliases.dialog.aliasTitlePlaceholder")}
              />
            </FormField>
            <div>
              <Label className="text-sm font-medium mb-2 block">{t("pagesPage.aliases.dialog.targetPage")}</Label>
              <Select value={aliasTargetId || undefined} onValueChange={(v) => setAliasTargetId(v)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder={t("pagesPage.aliases.dialog.targetPagePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {allPagesFlat.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setAliasDialogOpen(false)
                  setAliasTitle("")
                  setAliasTargetId("")
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="accent"
                disabled={!aliasTitle.trim() || !aliasTargetId || createAliasMutation.isPending}
                onClick={() => {
                  createAliasMutation.mutate({
                    title: aliasTitle.trim(),
                    targetPageId: aliasTargetId,
                  })
                }}
              >
                {createAliasMutation.isPending ? t("saving") : t("create")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
