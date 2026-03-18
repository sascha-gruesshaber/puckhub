import { useOrg } from "~/lib/context"
import { allPathVariants } from "~/lib/localizedRoutes"
import { trpc } from "../../lib/trpc"

/**
 * Checks if a sub-route page is published by looking at the cached
 * getMenuPages query data. Sub-routes only appear as children of their
 * parent system route when status is "published".
 *
 * Accepts a canonical (English) route path and checks all locale variants.
 *
 * Returns: true (visible), false (hidden), undefined (loading)
 *
 * If the parent system route has no children at all (sub-route pages not
 * yet created), defaults to true to avoid redirect loops.
 */
export function useSubRouteVisible(routePath: string): boolean | undefined {
  const org = useOrg()
  const { data: menuPages } = trpc.publicSite.getMenuPages.useQuery(
    { organizationId: org.id, location: "main_nav" },
    { staleTime: 300_000 },
  )

  if (!menuPages) return undefined

  const variants = allPathVariants(routePath)

  // Find the parent system route that would contain this sub-route
  // e.g. for "/stats/scorers" the parent is the page with routePath "/stats"
  const parentPath = `/${routePath.split("/").filter(Boolean)[0]}`
  const parentVariants = allPathVariants(parentPath)
  const parentPage = menuPages.find((p: any) => p.isSystemRoute && parentVariants.includes(p.routePath))

  // If the parent has no children at all, sub-route pages likely haven't been
  // created yet — default to visible to avoid infinite redirect loops
  if (parentPage && parentPage.children.length === 0) return true

  for (const page of menuPages) {
    for (const child of page.children) {
      if (variants.includes((child as any).routePath)) return true
    }
  }

  return false
}
