import { Badge, Button } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router"
import { Clock, Newspaper, Plus } from "lucide-react"
import { useCallback, useMemo } from "react"
import { trpc } from "@/trpc"
import { DataPageLayout } from "~/components/dataPageLayout"
import { FilterBar } from "~/components/filterBar"
import { EmptyState } from "~/components/emptyState"
import { FilterDropdown } from "~/components/filterDropdown"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/$orgSlug/news/")({
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
  usePermissionGuard("news")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t, i18n } = useTranslation("common")
  const { isAtLimit, usageText } = usePlanLimits()
  const atNewsLimit = isAtLimit("maxNewsArticles")
  const { search: searchParam, year } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const yearFilter = useMemo(() => (year ? year.split(",") : []), [year])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setYearFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, year: v.join(",") || undefined }), replace: true }),
    [navigate],
  )

  const { data: articles, isLoading } = trpc.news.list.useQuery()

  // Extract distinct years from articles
  const yearOptions: FilterDropdownOption[] = useMemo(() => {
    if (!articles) return []
    const yearSet = new Set<number>()
    for (const a of articles) {
      const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      yearSet.add(d.getFullYear())
    }
    return [...yearSet].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) }))
  }, [articles])

  const filtered = useMemo(() => {
    if (!articles) return []

    let result = articles

    // Year filter
    if (yearFilter.length > 0) {
      result = result.filter((a) => {
        const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        return yearFilter.includes(String(d.getFullYear()))
      })
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.title.toLowerCase().includes(q) || a.shortText?.toLowerCase().includes(q))
    }

    return result
  }, [articles, search, yearFilter])

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
    <DataPageLayout
      title={t("newsPage.title")}
      description={t("newsPage.description")}
      action={
        <div className="flex items-center gap-2">
          <Badge variant="outline">{usageText("maxNewsArticles")}</Badge>
          <div className={atNewsLimit ? "pointer-events-none opacity-50" : ""}>
            <Link to="/$orgSlug/news/new" params={{ orgSlug }}>
              <Button
                variant="accent"
                disabled={atNewsLimit}
                data-testid="news-new"
                title={atNewsLimit ? t("plan.limitReached", { defaultValue: "Plan limit reached" }) : undefined}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("newsPage.actions.new")}
              </Button>
            </Link>
          </div>
        </div>
      }
      filters={
        <FilterBar
          label={t("filters")}
          search={{ value: search, onChange: setSearch, placeholder: t("newsPage.searchPlaceholder") }}
        >
          {isLoading ? (
            <FilterPillsSkeleton count={1} />
          ) : yearOptions.length > 1 ? (
            <FilterDropdown
              label={t("newsPage.filters.all")}
              options={yearOptions}
              value={yearFilter}
              onChange={setYearFilter}
            />
          ) : null}
        </FilterBar>
      }
    >
      {/* Content */}
      {isLoading ? (
        <DataListSkeleton rows={5} showIcon={false} />
      ) : filtered.length === 0 && !search && yearFilter.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("newsPage.empty.title")}
          description={t("newsPage.empty.description")}
          action={
            <div className={atNewsLimit ? "pointer-events-none opacity-50" : ""}>
              <Link to="/$orgSlug/news/new" params={{ orgSlug }}>
                <Button variant="accent" disabled={atNewsLimit}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("newsPage.empty.action")}
                </Button>
              </Link>
            </div>
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
                data-testid="news-row"
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate({ to: "/$orgSlug/news/$newsId/edit", params: { orgSlug, newsId: article.id } })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    navigate({ to: "/$orgSlug/news/$newsId/edit", params: { orgSlug, newsId: article.id } })
                  }
                }}
                className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors cursor-pointer ${
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
              </div>
            )
          })}
        </div>
      )}
    </DataPageLayout>
  )
}
