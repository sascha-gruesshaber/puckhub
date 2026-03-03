import { createFileRoute } from "@tanstack/react-router"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { NewsCardSkeleton } from "~/components/shared/loadingSkeleton"
import { NewsCard } from "~/components/shared/newsCard"
import { useOrg } from "~/lib/context"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/news/")({
  component: NewsListPage,
  head: () => ({ meta: [{ title: "News" }] }),
})

function NewsListPage() {
  const org = useOrg()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.publicSite.listNews.useInfiniteQuery(
      { organizationId: org.id, limit: 12 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 60_000,
      },
    )

  const allNews = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="animate-fade-in">
      <SectionWrapper title="News">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : allNews.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allNews.map((item) => (
                <NewsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  shortText={item.shortText}
                  publishedAt={item.publishedAt}
                  authorName={item.author?.name}
                />
              ))}
            </div>

            {hasNextPage && (
              <div className="text-center pt-8">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-lg bg-league-primary px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Laden..." : "Mehr laden"}
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="Keine News vorhanden" description="Hier erscheinen bald die neuesten Nachrichten." />
        )}
      </SectionWrapper>
    </div>
  )
}
