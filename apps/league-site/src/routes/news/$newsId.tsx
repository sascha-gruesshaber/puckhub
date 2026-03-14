import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { HtmlContent } from "~/components/shared/htmlContent"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { useOrg } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { formatDate } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/news/$newsId")({
  component: NewsDetailPage,
  head: () => ({ meta: [{ title: "Artikel" }] }),
})

export function NewsDetailPage() {
  const { newsId } = useParams({ strict: false }) as { newsId: string }
  const org = useOrg()
  const t = useT()

  const { data: article, isLoading } = trpc.publicSite.getNewsDetail.useQuery(
    { organizationId: org.id, newsId },
    { staleTime: 60_000 },
  )

  if (isLoading) return <PageSkeleton />

  if (!article) {
    return (
      <SectionWrapper>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">{t.news.articleNotFound}</h2>
          <Link to="/" className="text-league-primary hover:underline">
            {t.news.backToNews}
          </Link>
        </div>
      </SectionWrapper>
    )
  }

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t.news.backToNews}
        </Link>

        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">{article.title}</h1>

          <div className="flex items-center gap-2 text-sm text-league-text/50 mb-8">
            {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
            {article.author?.name && (
              <>
                <span>&middot;</span>
                <span>{article.author.name}</span>
              </>
            )}
          </div>

          {article.shortText && (
            <p className="text-lg text-league-text/70 mb-6 leading-relaxed">{article.shortText}</p>
          )}

          <HtmlContent html={article.content} />
        </article>
      </SectionWrapper>
    </div>
  )
}
