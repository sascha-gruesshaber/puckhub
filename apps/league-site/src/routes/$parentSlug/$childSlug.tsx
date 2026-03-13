import { createFileRoute, Link } from "@tanstack/react-router"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { HtmlContent } from "~/components/shared/htmlContent"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { useOrg } from "~/lib/context"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/$parentSlug/$childSlug")({
  component: NestedCmsPage,
  head: () => ({ meta: [{ title: "Seite" }] }),
})

function NestedCmsPage() {
  const { parentSlug, childSlug } = Route.useParams()
  const org = useOrg()

  const { data: page, isLoading } = trpc.publicSite.getPageBySlug.useQuery(
    { organizationId: org.id, slug: `${parentSlug}/${childSlug}` },
    { staleTime: 120_000 },
  )

  if (isLoading) return <PageSkeleton />

  if (!page) {
    return (
      <SectionWrapper>
        <div className="text-center py-16">
          <h1 className="text-4xl font-extrabold mb-3">404</h1>
          <p className="text-league-text/60 mb-4">Diese Seite wurde nicht gefunden.</p>
          <Link to="/" className="text-league-primary hover:underline">
            Zur Startseite
          </Link>
        </div>
      </SectionWrapper>
    )
  }

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-8">{page.title}</h1>
          <HtmlContent html={page.content} />
        </article>
      </SectionWrapper>
    </div>
  )
}
