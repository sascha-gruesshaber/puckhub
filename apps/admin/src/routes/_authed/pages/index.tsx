import { Badge, Button, FormField, Input, Label, toast } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ChevronRight, FileText, Link2, Lock, Pencil, Plus, Trash2, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterPill } from "~/components/filterPill"
import { NoResults } from "~/components/noResults"
import { CountSkeleton } from "~/components/skeletons/countSkeleton"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { useTranslation } from "~/i18n/use-translation"
import { FILTER_ALL } from "~/lib/search-params"

export const Route = createFileRoute("/_authed/pages/")({
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

function PagesPage() {
  const { t } = useTranslation("common")
  const { search: searchParam, status } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const statusFilter = status ?? FILTER_ALL
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setStatusFilter = useCallback(
    (v: string) =>
      navigate({ search: (prev) => ({ ...prev, status: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPage, setDeletingPage] = useState<{ id: string; title: string } | null>(null)
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false)
  const [aliasTitle, setAliasTitle] = useState("")
  const [aliasTargetId, setAliasTargetId] = useState("")
  const [deleteAliasDialogOpen, setDeleteAliasDialogOpen] = useState(false)
  const [deletingAlias, setDeletingAlias] = useState<{ id: string; slug: string } | null>(null)

  const utils = trpc.useUtils()
  const { data: pages, isLoading } = trpc.page.list.useQuery()
  const { data: aliases } = trpc.page.listAliases.useQuery()

  const deleteMutation = trpc.page.delete.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
      utils.page.listAliases.invalidate()
      setDeleteDialogOpen(false)
      setDeletingPage(null)
      toast.success(t("pagesPage.toast.pageDeleted"))
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.deleteError"), { description: err.message })
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
      toast.error(t("pagesPage.toast.createError"), { description: err.message })
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
      toast.error(t("pagesPage.toast.deleteError"), { description: err.message })
    },
  })

  // Group: top-level pages with children
  const topLevelPages = useMemo(() => {
    if (!pages) return []
    return pages.filter((p) => !p.parentId)
  }, [pages])

  const filtered = useMemo(() => {
    if (!topLevelPages.length) return []

    let result = topLevelPages

    // Status filter
    if (statusFilter === FILTER_PUBLISHED) {
      result = result.filter((p) => p.status === "published")
    } else if (statusFilter === FILTER_DRAFT) {
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
  }, [topLevelPages, search, statusFilter])

  const stats = useMemo(() => {
    if (!pages) return { total: 0, published: 0, drafts: 0, static: 0 }
    return {
      total: pages.length,
      published: pages.filter((p) => p.status === "published").length,
      drafts: pages.filter((p) => p.status === "draft").length,
      static: pages.filter((p) => p.isStatic).length,
    }
  }, [pages])

  // All pages for alias target dropdown (built from top-level + nested children to avoid duplicates)
  const allPagesFlat = useMemo(() => {
    if (!topLevelPages.length) return []
    const result: { id: string; title: string }[] = []
    for (const p of topLevelPages) {
      result.push({ id: p.id, title: p.title })
      for (const c of p.children ?? []) {
        result.push({ id: c.id, title: `${p.title} / ${c.title}` })
      }
    }
    return result
  }, [topLevelPages])

  let globalRowIndex = 0

  return (
    <>
      <DataPageLayout
        title={t("pagesPage.title")}
        description={t("pagesPage.description")}
        action={
          <Link to="/pages/new" search={{}}>
            <Button variant="accent">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("pagesPage.actions.new")}
            </Button>
          </Link>
        }
        filters={
          isLoading ? (
            <FilterPillsSkeleton count={3} />
          ) : (
            <>
              <FilterPill
                label={t("pagesPage.filters.all")}
                active={statusFilter === FILTER_ALL}
                onClick={() => setStatusFilter(FILTER_ALL)}
              />
              <FilterPill
                label={t("pagesPage.filters.published")}
                active={statusFilter === FILTER_PUBLISHED}
                onClick={() => setStatusFilter(FILTER_PUBLISHED)}
              />
              <FilterPill
                label={t("pagesPage.filters.draft")}
                active={statusFilter === FILTER_DRAFT}
                onClick={() => setStatusFilter(FILTER_DRAFT)}
              />
            </>
          )
        }
        search={{ value: search, onChange: setSearch, placeholder: t("pagesPage.searchPlaceholder") }}
        count={
          isLoading ? (
            <CountSkeleton />
          ) : (pages?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {statusFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {stats.total}
                </span>{" "}
                {t("pagesPage.count.total")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.published}</span>{" "}
                {t("pagesPage.count.published")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.drafts}</span> {t("pagesPage.count.drafts")}
              </span>
            </div>
          ) : undefined
        }
      >
        {/* Pages list */}
        {isLoading ? (
          <DataListSkeleton rows={5} showIcon={false} />
        ) : filtered.length === 0 && !search && statusFilter === FILTER_ALL ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("pagesPage.empty.title")}
            description={t("pagesPage.empty.description")}
            action={
              <Link to="/pages/new">
                <Button variant="accent">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("pagesPage.empty.action")}
                </Button>
              </Link>
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
              <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
                {filtered.map((page) => {
                  const children = page.children ?? []
                  const allRows = [page, ...children]

                  return allRows.map((p, pi) => {
                    const isChild = pi > 0
                    const isDraft = p.status === "draft"
                    const dotColor = isDraft ? "hsl(var(--muted-foreground))" : "hsl(142 71% 45%)"
                    const dotTitle = isDraft ? t("pagesPage.status.draft") : t("pagesPage.status.published")
                    const parentSlug = isChild ? page.slug : null
                    const fullSlug = parentSlug ? `/${parentSlug}/${p.slug}` : `/${p.slug}`
                    const rowIdx = globalRowIndex++

                    return (
                      <div
                        key={p.id}
                        className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                          isChild ? "pl-10 border-l-2 border-l-border/30" : ""
                        } ${rowIdx > 0 ? "border-t border-border/40" : ""}`}
                        style={{ "--row-index": rowIdx } as React.CSSProperties}
                      >
                        {/* Status dot */}
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: dotColor }}
                          title={dotTitle}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{p.title}</h3>
                            <Badge variant={isDraft ? "outline" : "default"} className="shrink-0 text-[10px]">
                              {isDraft ? t("pagesPage.status.draft") : t("pagesPage.status.published")}
                            </Badge>
                            {p.isStatic && (
                              <Badge variant="secondary" className="shrink-0 text-[10px]">
                                <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                                {t("pagesPage.status.static")}
                              </Badge>
                            )}
                            {p.menuLocations.includes("main_nav") && (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {t("pagesPage.menu.nav")}
                              </Badge>
                            )}
                            {p.menuLocations.includes("footer") && (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {t("pagesPage.menu.footer")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{fullSlug}</span>
                            <span className="text-border">|</span>
                            <span>{t("pagesPage.meta.sortOrder", { value: p.sortOrder })}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isChild && !p.isStatic && (
                            <Link to="/pages/new" search={{ parent: p.id }}>
                              <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                                <Plus className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                                <span className="hidden md:inline">{t("pagesPage.actions.subpage")}</span>
                              </Button>
                            </Link>
                          )}
                          <Link to="/pages/$pageId/edit" params={{ pageId: p.id }}>
                            <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                              <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                              <span className="hidden md:inline">{t("pagesPage.actions.edit")}</span>
                            </Button>
                          </Link>
                          {!(isChild ? false : p.isStatic) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingPage({ id: p.id, title: p.title })
                                setDeleteDialogOpen(true)
                              }}
                              className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                              <span className="hidden md:inline">{t("pagesPage.actions.delete")}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                })}
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
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={aliasTargetId}
                onChange={(e) => setAliasTargetId(e.target.value)}
              >
                <option value="">{t("pagesPage.aliases.dialog.targetPagePlaceholder")}</option>
                {allPagesFlat.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
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
