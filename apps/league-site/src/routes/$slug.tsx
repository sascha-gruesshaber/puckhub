import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { HtmlContent } from "~/components/shared/htmlContent"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { useOrg } from "~/lib/context"
import { trpc } from "../../lib/trpc"

export const Route = createFileRoute("/$slug")({
  component: CmsPage,
  head: () => ({ meta: [{ title: "Seite" }] }),
})

function CmsPage() {
  const { slug } = Route.useParams()
  const org = useOrg()

  const { data: page, isLoading } = trpc.publicSite.getPageBySlug.useQuery(
    { organizationId: org.id, slug },
    { staleTime: 120_000 },
  )

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!page || "redirect" in page) return
    document.title = page.seoTitle ?? page.title
    const description = page.seoDescription ?? ""
    if (description) {
      const existing = document.querySelector('meta[name="description"]')
      if (existing) {
        existing.setAttribute("content", description)
      } else {
        const meta = document.createElement("meta")
        meta.name = "description"
        meta.content = description
        document.head.appendChild(meta)
      }
      const ogExisting = document.querySelector('meta[property="og:description"]')
      if (ogExisting) {
        ogExisting.setAttribute("content", description)
      } else {
        const ogMeta = document.createElement("meta")
        ogMeta.setAttribute("property", "og:description")
        ogMeta.content = description
        document.head.appendChild(ogMeta)
      }
    }
  }, [page])

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
