import type { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import type { RouterContext } from "./routes/__root"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 100,
    defaultPendingMs: 0,
    context: {
      queryClient: undefined! as QueryClient,
      trpcQueryUtils: undefined,
    },
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
