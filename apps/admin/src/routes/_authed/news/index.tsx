import { Badge, Button, toast } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Clock, Newspaper, Pencil, Plus, Trash2 } from "lucide-react"
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
import { FILTER_ALL } from "~/lib/search-params"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/news/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; year?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.year === "string" && s.year ? { year: s.year } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.news.list.ensureData()
  },
  component: NewsPage,
})

function NewsPage() {
  const { t, i18n } = useTranslation("common")
  const { search: searchParam, year } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const yearFilter = year ?? FILTER_ALL
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setYearFilter = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, year: v === FILTER_ALL ? undefined : v }), replace: true }),
    [navigate],
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingArticle, setDeletingArticle] = useState<{ id: string; title: string } | null>(null)

  const utils = trpc.useUtils()
  const { data: articles, isLoading } = trpc.news.list.useQuery()

  const deleteMutation = trpc.news.delete.useMutation({
    onSuccess: () => {
      utils.news.list.invalidate()
      setDeleteDialogOpen(false)
      setDeletingArticle(null)
      toast.success(t("newsPage.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("newsPage.toast.deleteError"), { description: err.message })
    },
  })

  // Extract distinct years from articles
  const years = useMemo(() => {
    if (!articles) return []
    const yearSet = new Set<number>()
    for (const a of articles) {
      const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      yearSet.add(d.getFullYear())
    }
    return [...yearSet].sort((a, b) => b - a)
  }, [articles])

  const filtered = useMemo(() => {
    if (!articles) return []

    let result = articles

    // Year filter
    if (yearFilter !== FILTER_ALL) {
      const y = Number(yearFilter)
      result = result.filter((a) => {
        const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        return d.getFullYear() === y
      })
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.title.toLowerCase().includes(q) || a.shortText?.toLowerCase().includes(q))
    }

    return result
  }, [articles, search, yearFilter])

  const stats = useMemo(() => {
    if (!articles) return { total: 0, published: 0, drafts: 0, scheduled: 0 }
    const now = new Date()
    return {
      total: articles.length,
      published: articles.filter((a) => a.status === "published").length,
      drafts: articles.filter(
        (a) => a.status === "draft" && !(a.scheduledPublishAt && new Date(a.scheduledPublishAt) > now),
      ).length,
      scheduled: articles.filter(
        (a) => a.status === "draft" && a.scheduledPublishAt && new Date(a.scheduledPublishAt) > now,
      ).length,
    }
  }, [articles])

  function formatDate(date: string | Date | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <DataPageLayout
        title={t("newsPage.title")}
        description={t("newsPage.description")}
        action={
          <Link to="/news/new">
            <Button variant="accent">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("newsPage.actions.new")}
            </Button>
          </Link>
        }
        filters={
          isLoading ? (
            <FilterPillsSkeleton count={3} />
          ) : years.length > 1 ? (
            <>
              <FilterPill
                label={t("newsPage.filters.all")}
                active={yearFilter === FILTER_ALL}
                onClick={() => setYearFilter(FILTER_ALL)}
              />
              {years.map((y) => (
                <FilterPill
                  key={y}
                  label={String(y)}
                  active={yearFilter === String(y)}
                  onClick={() => setYearFilter(String(y))}
                />
              ))}
            </>
          ) : undefined
        }
        search={{ value: search, onChange: setSearch, placeholder: t("newsPage.searchPlaceholder") }}
        count={
          isLoading ? (
            <CountSkeleton />
          ) : (articles?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {yearFilter !== FILTER_ALL ? `${filtered.length} / ` : ""}
                  {stats.total}
                </span>{" "}
                {t("newsPage.count.total")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.published}</span> {t("newsPage.count.published")}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{stats.drafts}</span> {t("newsPage.count.drafts")}
              </span>
              {stats.scheduled > 0 && (
                <>
                  <span className="text-border">|</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{stats.scheduled}</span>{" "}
                    {t("newsPage.count.scheduled")}
                  </span>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} showIcon={false} />
        ) : filtered.length === 0 && !search && yearFilter === FILTER_ALL ? (
          <EmptyState
            icon={<Newspaper className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("newsPage.empty.title")}
            description={t("newsPage.empty.description")}
            action={
              <Link to="/news/new">
                <Button variant="accent">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("newsPage.empty.action")}
                </Button>
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("newsPage.filters.fallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((article, i) => {
              const isDraft = article.status === "draft"
              const isScheduled =
                isDraft && article.scheduledPublishAt && new Date(article.scheduledPublishAt) > new Date()

              const dotColor = isScheduled
                ? "hsl(var(--accent))"
                : isDraft
                  ? "hsl(var(--muted-foreground))"
                  : "hsl(142 71% 45%)"

              const dotTitle = isScheduled
                ? t("newsPage.status.scheduled")
                : isDraft
                  ? t("newsPage.status.draft")
                  : t("newsPage.status.published")

              return (
                <div
                  key={article.id}
                  className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                    i < filtered.length - 1 ? "border-b border-border/40" : ""
                  }`}
                  style={{ "--row-index": i } as React.CSSProperties}
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
                      <h3 className="font-semibold truncate">{article.title}</h3>
                      {isScheduled ? (
                        <Badge variant="accent" className="shrink-0 text-[10px]">
                          <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                          {t("newsPage.status.scheduled")}
                        </Badge>
                      ) : (
                        <Badge variant={isDraft ? "outline" : "default"} className="shrink-0 text-[10px]">
                          {isDraft ? t("newsPage.status.draft") : t("newsPage.status.published")}
                        </Badge>
                      )}
                    </div>
                    {article.shortText && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{article.shortText}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {article.author && <span>{article.author.name}</span>}
                      <span className="text-border">|</span>
                      <span>{t("newsPage.meta.createdAt", { date: formatDate(article.createdAt) })}</span>
                      {article.publishedAt && (
                        <>
                          <span className="text-border">|</span>
                          <span>{t("newsPage.meta.publishedAt", { date: formatDate(article.publishedAt) })}</span>
                        </>
                      )}
                      {isScheduled && (
                        <>
                          <span className="text-border">|</span>
                          <span style={{ color: "hsl(var(--accent-foreground))" }}>
                            {t("newsPage.meta.scheduledFor", {
                              date: formatDate(article.scheduledPublishAt),
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to="/news/$newsId/edit" params={{ newsId: article.id }}>
                      <Button variant="ghost" size="sm" className="text-xs h-8 px-2 md:px-3">
                        <Pencil className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                        <span className="hidden md:inline">{t("newsPage.actions.edit")}</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingArticle({ id: article.id, title: article.title })
                        setDeleteDialogOpen(true)
                      }}
                      className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 md:mr-1.5" aria-hidden="true" />
                      <span className="hidden md:inline">{t("newsPage.actions.delete")}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataPageLayout>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("newsPage.deleteDialog.title")}
        description={t("newsPage.deleteDialog.description", { title: deletingArticle?.title ?? "" })}
        confirmLabel={t("newsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingArticle) deleteMutation.mutate({ id: deletingArticle.id })
        }}
      />
    </>
  )
}
